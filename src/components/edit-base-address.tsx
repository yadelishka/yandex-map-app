import React from "react";
/* import { useTranslation } from "react-i18next"; */
/* import { useNavigate } from "react-router"; */
/* import { useSnackbar } from "notistack"; */
import {
  Grid,
  Button,
  LinearProgress,
  CircularProgress,
  styled,
  Autocomplete,
  TextField,
  Typography,
} from "@mui/material";
import { YMaps, Map, ZoomControl, Placemark } from "@pbe/react-yandex-maps";
/* import { useUserContext } from "@/context/user-context"; */
/* import { useSearchUpsertBaseMutation } from "@/app/(profile)/vehicle/edit-base-address/search-upsert-base-mutation.gql-gen"; */
import {
  type GeoCoderItemTypeV3,
  type GeoSuggestV2Item,
  getPointData,
  getRequestBounds,
  yandexGeoCoder,
  yandexGeoSuggest,
  getConfig,
} from "../utils/geo-utils";
/* import { getConfig } from "@/config/config"; */
import { renderGeoSuggestV2Option } from "../utils/helpers";
import inActivePlaceMark from "../assets/inActivePlaceMark.svg";
/* import { useEditBaseAddressModal } from "@/app/(profile)/vehicle/edit-base-address/edit-base-address-modal-context"; */
/* import { ROUTES } from "@/app/routes"; */

export interface EditBaseAddressModalProps {
  navigateToCreateVehicle?: boolean;
}

type BaseData = {
  coordinates: [number, number];
  fullAddress: string;
};

// не используется (тайп гард для данных defaultValue)
function hasCoordinates(
  address: unknown
): address is { coordinates: [number, number]; fullAddress: string } {
  if (address === null || typeof address !== "object") {
    return false;
  }

  if (!("coordinates" in address) || !("fullAddress" in address)) {
    return false;
  }

  const coords = address.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }

  if (typeof coords[0] !== "number" || typeof coords[1] !== "number") {
    return false;
  }

  if (typeof address.fullAddress !== "string") {
    return false;
  }

  return true;
}

function isMapInstance(reference: unknown): reference is {
  setZoom: (zoom: number) => void;
  setCenter: (coords: number[]) => void;
} {
  if (reference === null || typeof reference !== "object") {
    return false;
  }

  if (!("setZoom" in reference) || !("setCenter" in reference)) {
    return false;
  }

  const setZoomValue = Reflect.get(reference, "setZoom");
  const setCenterValue = Reflect.get(reference, "setCenter");

  return (
    typeof setZoomValue === "function" && typeof setCenterValue === "function"
  );
}

const MapWrapper = styled(Grid)`
  width: 620px;
  height: 480px;
  position: relative;
  overflow: hidden;
`;

const markerStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(50% - 36.5px)",
  left: "calc(50% - 31px)",
};

function isGeoCoderResponse(
  obj: unknown
): obj is { response: GeoCoderItemTypeV3 } {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (!("response" in obj)) {
    return false;
  }

  const response = obj.response;
  if (!response || typeof response !== "object") {
    return false;
  }

  return "GeoObjectCollection" in response;
}

const geoCoderV2 = async (
  centerCoords?: { lat: number; lng: number },
  textValue?: string,
  uri?: string
): Promise<GeoCoderItemTypeV3> => {
  const text =
    textValue ||
    (centerCoords ? [centerCoords.lng, centerCoords.lat].join(",") : undefined);
  const geoCoder = await yandexGeoCoder(text, uri);
  const result: unknown = await geoCoder.json();

  if (!isGeoCoderResponse(result)) {
    throw new Error("Invalid geocoder response");
  }

  return result.response;
};

const EditBaseAddress: React.FC<EditBaseAddressModalProps> = ({
  navigateToCreateVehicle,
}) => {
  /* const { t } = useTranslation();
  const { currentOrganization, updateOrganization } = useUserContext();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate(); */
  const mapReference = React.useRef<{
    setZoom: (zoom: number) => void;
    setCenter: (coords: number[]) => void;
  } | null>(null);

  const {
    consts: { YANDEX_MAP_API_KEY, YANDEX_MAP_API_KEY_SUGGEST },
  } = getConfig();

  /* const { closeModal } = useEditBaseAddressModal(); 

  const [upsertBase] = useSearchUpsertBaseMutation(); */

  // заглушки для переменных
  const t = (key: string) => key; // Заглушка для перевода
  const closeModal = () => console.log("close modal");
  const enqueueSnackbar = (message: string, options: any) =>
    console.log(message, options);
  const navigate = (path: string) => console.log("navigate to:", path);

  // Дефолтные данные
  /* const defaultValues: BaseData = {
    coordinates: hasCoordinates(currentOrganization.bases[0]?.address)
      ? currentOrganization.bases[0].address.coordinates
      : [37.6156, 55.7522],
    fullAddress: currentOrganization.bases[0]?.address?.fullAddress || "Адрес не указан",
  }; */

  // Заглушка для дефолтных данных
  const defaultValues: BaseData = {
    coordinates: [37.6156, 55.7522],
    fullAddress: "Москва, Красная площадь",
  };

  const [processing, setProcessing] = React.useState<boolean>(false);
  const [map, setMap] = React.useState<unknown>();
  const [baseData, setBaseData] = React.useState<BaseData>(defaultValues);
  const [options, setOptions] = React.useState<GeoSuggestV2Item[]>([]);
  const [inputValue, setInputValue] = React.useState(
    baseData.fullAddress || ""
  );
  const [loading, setLoading] = React.useState(false);

  const geoSuggestV2 = React.useCallback(
    async (input: string): Promise<GeoSuggestV2Item[]> => {
      const res = await yandexGeoSuggest(
        input,
        getRequestBounds({
          lat: baseData.coordinates[0],
          lng: baseData.coordinates[1],
        })?.join(",") || ""
      );
      const data: unknown = await res.json();

      if (!data || typeof data !== "object" || !("results" in data)) {
        return [];
      }

      const results = data.results;
      if (!Array.isArray(results)) {
        return [];
      }

      return results.map((item: unknown): GeoSuggestV2Item => {
        if (!item || typeof item !== "object") {
          return { value: "", displayName: "", uri: "" };
        }

        const address = "address" in item ? item.address : null;
        const title = "title" in item ? item.title : null;
        const subtitle = "subtitle" in item ? item.subtitle : null;
        const uri = "uri" in item ? item.uri : "";

        const formattedAddress =
          address &&
          typeof address === "object" &&
          "formatted_address" in address
            ? address.formatted_address
            : "";

        const titleText =
          title && typeof title === "object" && "text" in title
            ? title.text
            : "";

        const subtitleText =
          subtitle && typeof subtitle === "object" && "text" in subtitle
            ? subtitle.text
            : "";

        return {
          value: typeof formattedAddress === "string" ? formattedAddress : "",
          displayName: `${typeof titleText === "string" ? titleText : ""} ${
            typeof subtitleText === "string" ? subtitleText : ""
          }`.trim(),
          uri: typeof uri === "string" ? uri : "",
        };
      });
    },
    [baseData.coordinates]
  );

  React.useEffect(() => {
    if (inputValue === "") {
      setOptions([]);
      return;
    }

    setLoading(true);
    geoSuggestV2(inputValue)
      .then((results) => {
        setOptions(results);
      })
      .catch(() => {
        setOptions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [inputValue, geoSuggestV2]);

  React.useEffect(() => {
    setInputValue(baseData.fullAddress || "");
  }, [baseData.fullAddress]);

  const submit = (data: BaseData) => {
    setProcessing(true);
    console.log("Данные для отправки:", data);

    // Эмуляция успешного сохранения
    setTimeout(() => {
      console.log("Адрес базы изменён!", data);
      setProcessing(false);
      closeModal();
    }, 1000);

    // Комментируем логику отправкиу на бэкенд
    /* void upsertBase({
      variables: {
        coordinates: data.coordinates,
        fullAddress: data.fullAddress,
        isBuilding: false,
      },
      onCompleted: () => {
        enqueueSnackbar("Адрес базы изменён!", { variant: "success" });
        const newBases =
          currentOrganization.bases.length === 0
            ? [
                {
                  uuid: "",
                  address: {
                    coordinates: data.coordinates,
                    fullAddress: data.fullAddress,
                  },
                },
              ]
            : currentOrganization.bases.map((base, index) => {
                if (index === 0) {
                  return {
                    ...base,
                    address: {
                      fullAddress: data.fullAddress,
                      coordinates: data.coordinates,
                    },
                  };
                }
                return base;
              });
        updateOrganization({
          bases: newBases,
        });
        closeModal();
        if (navigateToCreateVehicle) {
          void navigate(`${ROUTES.VEHICLE}?page=new`);
        }
      },
      onError: (error) => {
        enqueueSnackbar(error.message, { variant: "error" });
        setProcessing(false);
      },
    });*/
  };

  const handleSetBaseAddress = React.useCallback(
    (
      geoCoder: GeoCoderItemTypeV3,
      centerCoords?: { lat: number; lng: number }
    ) => {
      const geoObject = geoCoder.GeoObjectCollection.featureMember[0].GeoObject;
      const position = geoObject.Point.pos;
      const [lon, lat] = position.split(" ").map((coord) => +coord);
      const coordinates = centerCoords
        ? [centerCoords.lng, centerCoords.lat]
        : [lon, lat];
      setBaseData({
        coordinates:
          coordinates.length === 2 &&
          typeof coordinates[0] === "number" &&
          typeof coordinates[1] === "number"
            ? [coordinates[0], coordinates[1]]
            : [0, 0],
        fullAddress: geoObject.metaDataProperty.GeocoderMetaData.text,
      });

      switch (geoObject.metaDataProperty.GeocoderMetaData.kind) {
        case "house": {
          if (mapReference.current) {
            mapReference.current.setZoom(16);
          }
          break;
        }
        case "street": {
          if (mapReference.current) {
            mapReference.current.setZoom(12);
          }
          break;
        }
        case "province": {
          if (mapReference.current) {
            mapReference.current.setZoom(8);
          }
          break;
        }
        case "locality": {
          if (mapReference.current) {
            mapReference.current.setZoom(8);
          }
          break;
        }
        case "metro": {
          if (mapReference.current) {
            mapReference.current.setZoom(8);
          }
          break;
        }
        default: {
          if (mapReference.current) {
            mapReference.current.setZoom(8);
          }
        }
      }
      if (mapReference.current) {
        mapReference.current.setCenter(coordinates);
      }
    },
    []
  );

  const handleSelectAddress = async (suggestItem: GeoSuggestV2Item) => {
    const address = suggestItem.displayName || suggestItem.value;
    const oldGeoCoder = await geoCoderV2(
      undefined,
      suggestItem.uri ? undefined : address,
      suggestItem.uri
    );
    handleSetBaseAddress(oldGeoCoder);
  };

  const getFullAddress = async (centerCoords: { lat: number; lng: number }) => {
    const oldGeoCoder = await geoCoderV2(centerCoords);
    const geoObject =
      oldGeoCoder.GeoObjectCollection.featureMember[0].GeoObject;
    setBaseData({
      coordinates: [centerCoords.lng, centerCoords.lat],
      fullAddress: geoObject.metaDataProperty.GeocoderMetaData.text,
    });
  };

  const handleMapClick = (e: { get: (key: string) => [number, number] }) => {
    const coords: [number, number] = e.get("coords");
    void getFullAddress({ lat: coords[0], lng: coords[1] });
  };

  const handleSubmit = () => {
    submit(baseData);
  };

  const marker = React.useMemo(
    () => (
      <Placemark
        geometry={[baseData.coordinates[1], baseData.coordinates[0]]}
        properties={getPointData(baseData.fullAddress)}
        options={{
          iconLayout: "default#image",
          iconImageHref: inActivePlaceMark,
          iconColor: "#FFE642",
          hasHint: true,
          hasBalloon: false,
        }}
      />
    ),
    [baseData.coordinates, baseData.fullAddress]
  );

  return (
    <Grid size={12} container spacing={2}>
      <Typography variant="h5">Адрес базы</Typography>
      <form>
        <Grid container spacing={2}>
          <Grid container size={12}>
            <Grid size={12}>
              <Autocomplete<GeoSuggestV2Item>
                id="baseAddress"
                disabled={!map}
                value={{ displayName: inputValue }}
                fullWidth
                inputValue={inputValue}
                options={options}
                loading={loading}
                noOptionsText="Введите адрес"
                onInputChange={(_, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                filterOptions={(options) => options}
                onChange={(_, newValue) => {
                  if (newValue) {
                    void handleSelectAddress(newValue);
                  } else {
                    setInputValue("");
                    setBaseData({
                      ...baseData,
                      fullAddress: "",
                    });
                  }
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.uri || option.value}>
                    {renderGeoSuggestV2Option(option)}
                  </li>
                )}
                getOptionLabel={(option) =>
                  option.displayName || option.value || ""
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? (
                              <CircularProgress color="primary" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
          {!map && (
            <Grid size={12}>
              <LinearProgress />
            </Grid>
          )}
          <MapWrapper container size={12}>
            <YMaps
              version="2.1.79"
              query={{
                apikey: YANDEX_MAP_API_KEY,
                suggest_apikey: YANDEX_MAP_API_KEY_SUGGEST,
                lang: "ru_RU",
              }}
            >
              <Map
                modules={["geolocation", "geocode", "suggest"]}
                onClick={handleMapClick}
                state={{
                  center: [...baseData.coordinates].reverse(),
                  zoom: 16,
                  behaviors: ["drag", "scrollZoom", "multiTouch"],
                }}
                width="100%"
                height="100%"
                instanceRef={(reference) => {
                  if (isMapInstance(reference)) {
                    mapReference.current = reference;
                  }
                }}
                onLoad={(ymaps) => {
                  setMap(ymaps);
                }}
              >
                <ZoomControl />
                {marker}
              </Map>
            </YMaps>
            {!map && <CircularProgress style={markerStyle} size={48} />}
          </MapWrapper>
          <Grid
            container
            wrap="nowrap"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Button fullWidth variant="outlined" onClick={closeModal}>
              {/* {t(`common.cancel`)} */} {/* // мультиязычка */}
              Отменить
            </Button>
            <Button
              variant="contained"
              fullWidth
              disabled={!map || processing}
              onClick={handleSubmit}
              color="secondary"
              sx={{ borderRadius: "4px" }}
            >
              {/* {t("common.save")} */} {/* // мультиязычка */}
              Сохранить
            </Button>
          </Grid>
        </Grid>
      </form>
    </Grid>
  );
};

EditBaseAddress.displayName = "BaseAddress";

export default EditBaseAddress;
