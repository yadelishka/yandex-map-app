// IN V 3
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Grid,
  Button,
  CircularProgress,
  styled,
  Autocomplete,
  TextField,
  Typography,
  LinearProgress,
} from "@mui/material";

import { renderGeoSuggestV2Option } from "../utils/helpers";
import { initYMaps3Components } from "../libs/ymaps";
import inActivePlaceMark from "../assets/inActivePlaceMark.svg";
import {
  getRequestBounds,
  yandexGeoCoder,
  yandexGeoSuggest,
  type GeoCoderItemTypeV3,
  type GeoSuggestV2Item,
} from "../utils/geo-utils";

export interface EditBaseAddressModalProps {
  navigateToCreateVehicle?: boolean;
}

type BaseData = {
  coordinates: [number, number];
  fullAddress: string;
};

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

  // НУЖНО БУДЕТ ВЕРНУТЬ ТАЙП ГАРД
  /* if (!isGeoCoderResponse(result)) {
    throw new Error("Invalid geocoder response");
  } */

  return result.response;
};

const EditBaseAddressV3: React.FC<EditBaseAddressModalProps> = ({
  navigateToCreateVehicle,
}) => {
  const [components, setComponents] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [baseData, setBaseData] = useState<BaseData>({
    coordinates: [37.6156, 55.7522],
    fullAddress: "Москва, Красная площадь",
  });
  const [options, setOptions] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(baseData.fullAddress || "");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [mapState, setMapState] = useState({
    location: {
      center: baseData.coordinates,
      zoom: 16,
    },
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Инициализация карт
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setMapLoading(true);
        const comps = await initYMaps3Components();

        if (mounted) {
          setComponents(comps);
        }
      } catch (e) {
        console.error("Failed to init YMaps3 components", e);
      } finally {
        if (mounted) {
          setMapLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // ГЕОСАДЖЕСТ (отдельный сервис, без изменений)
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

    setSuggestLoading(true);
    geoSuggestV2(inputValue)
      .then((results) => {
        setOptions(results);
      })
      .catch(() => {
        setOptions([]);
      })
      .finally(() => {
        setSuggestLoading(false);
      });
  }, [inputValue, geoSuggestV2]);

  React.useEffect(() => {
    setInputValue(baseData.fullAddress || "");
  }, [baseData.fullAddress]);

  const submit = useCallback((data: BaseData) => {
    // мок для теста (вместо отправки на бэк)
    setProcessing(true);
    console.log("Данные для отправки:", data);
    setTimeout(() => {
      console.log("Адрес базы изменён!", data);
      setProcessing(false);
      console.log(`Адрес сохранен: ${data.fullAddress}`);
    }, 1000);
  }, []);

  const handleSetBaseAddress = useCallback(
    (geoCoder: any, centerCoords?: { lat: number; lng: number }) => {
      const geoObject = geoCoder.GeoObjectCollection.featureMember[0].GeoObject;

      const position = geoObject.Point.pos;
      const [lon, lat] = position.split(" ").map(Number);

      const coordinates: [number, number] = centerCoords
        ? [centerCoords.lng, centerCoords.lat]
        : [lon, lat];

      const fullAddress = geoObject.metaDataProperty.GeocoderMetaData.text;

      // НУЖНО БУДЕТ ВЕРНУТЬ ТАЙП ГАРД
      setBaseData({
        coordinates,
        fullAddress,
      });

      const kind = geoObject.metaDataProperty.GeocoderMetaData.kind;

      let zoom = 8;
      switch (kind) {
        case "house":
          zoom = 16;
          break;
        case "street":
          zoom = 12;
          break;
        case "province":
        case "locality":
        case "metro":
        default:
          zoom = 8;
      }

      setMapState((prev) => ({
        location: {
          ...prev.location,
          center: coordinates,
          zoom,
        },
      }));

      setInputValue(fullAddress);
    },
    []
  );

  // ГЕОКОДЕР
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

  const handleMapClick = (_object: any, event: any) => {
    if (!event || !event.coordinates) return;
    const [lon, lat] = event.coordinates;
    void getFullAddress({ lat, lng: lon });
  };

  const handleSubmit = () => {
    submit(baseData);
  };

  // Временная заглушка для закрытия модального окна
  const closeModal = useCallback(() => console.log("close modal"), []);

  const marker = useMemo(() => {
    if (!components || !components.YMapMarker) return null;

    return (
      <components.YMapMarker coordinates={baseData.coordinates} zIndex={1000}>
        <div
          style={{
            width: "40px",
            height: "40px",
            transform: "translate(-50%, -100%)",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <img
            src={inActivePlaceMark}
            alt="Маркер"
            style={{
              width: "100%",
              height: "100%",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
            draggable="false"
          />
        </div>
      </components.YMapMarker>
    );
  }, [components, baseData.coordinates, inActivePlaceMark, getFullAddress]);

  // Без этого упадет приложение, тк карты не сразу подгружаются
  if (!components) {
    return (
      <Grid size={12}>
        <LinearProgress />
      </Grid>
    );
  }

  const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapListener,
  } = components;

  return (
    <Grid size={12} container spacing={2}>
      <Typography variant="h5">Адрес базы (YMaps3)</Typography>
      <form>
        <Grid container spacing={2}>
          <Grid container size={12}>
            <Grid size={12}>
              <Autocomplete<any>
                id="baseAddress"
                disabled={mapLoading}
                value={{ displayName: inputValue }}
                fullWidth
                inputValue={inputValue}
                options={options}
                loading={suggestLoading}
                noOptionsText="Введите адрес"
                loadingText="Поиск..."
                onInputChange={(_, newInputValue) =>
                  setInputValue(newInputValue)
                }
                filterOptions={(options) => options}
                onChange={(_, newValue) => {
                  if (newValue) {
                    void handleSelectAddress(newValue);
                  } else {
                    setInputValue("");
                    setBaseData((prev) => ({ ...prev, fullAddress: "" }));
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
                    fullWidth
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {suggestLoading && (
                              <CircularProgress color="primary" size={20} />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
          {mapLoading && (
            <Grid size={12}>
              <LinearProgress />
            </Grid>
          )}
          <MapWrapper container size={12} ref={mapContainerRef}>
            {!mapLoading && (
              <YMap location={mapState.location} style={{ cursor: "grab" }}>
                <YMapListener onClick={handleMapClick} />
                <YMapDefaultSchemeLayer />
                <YMapDefaultFeaturesLayer />
                {marker}
              </YMap>
            )}

            {mapLoading && <CircularProgress style={markerStyle} size={48} />}
          </MapWrapper>

          <Grid
            container
            wrap="nowrap"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Button
              fullWidth
              variant="outlined"
              onClick={closeModal}
              disabled={processing}
            >
              Отменить
            </Button>
            <Button
              variant="contained"
              fullWidth
              disabled={processing || !baseData.fullAddress}
              onClick={handleSubmit}
              color="secondary"
              sx={{ borderRadius: "4px" }}
            >
              {processing ? "Сохранение..." : "Сохранить"}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Grid>
  );
};

EditBaseAddressV3.displayName = "BaseAddressV3";

export default EditBaseAddressV3;
