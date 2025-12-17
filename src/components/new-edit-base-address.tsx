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

  // ЗАГЛУШКА ДЛЯ ГЕОСАДЖЕСТА
  const geoSuggestV2 = useCallback(async (input: string): Promise<any[]> => {
    console.log("geoSuggestV2 called with:", input);
    if (!input || input.trim().length < 2) return [];

    // Заглушка для поиска
    return [
      {
        displayName: "Москва, Красная площадь, 1",
        value: "Москва, Красная площадь, 1",
        uri: "ymapsbm1://geo?data=test1",
        coordinates: [37.617, 55.755],
      },
      {
        displayName: "Москва, Кремль",
        value: "Москва, Кремль",
        uri: "ymapsbm1://geo?data=test2",
        coordinates: [37.618, 55.754],
      },
    ];
  }, []);

  // Заглушка для типа, аналогичному GeoCoderItemTypeV3
  const geoCoderV3 = useCallback(async (query: string) => {
    console.log("geoCoderV3:", query);

    return {
      GeoObjectCollection: {
        featureMember: [
          {
            GeoObject: {
              Point: { pos: "37.617 55.755" }, // lon lat
              metaDataProperty: {
                GeocoderMetaData: {
                  text: query,
                  kind: "house",
                },
              },
            },
          },
        ],
      },
    };
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

  const handleSelectAddress = useCallback(
    async (suggestItem: any) => {
      const address = suggestItem.displayName || suggestItem.value;

      const geoResult = await geoCoderV3(address);

      handleSetBaseAddress(geoResult);
    },
    [geoCoderV3, handleSetBaseAddress]
  );

  const getFullAddress = useCallback(
    async (centerCoords: { lat: number; lng: number }) => {
      console.log("getFullAddress:", centerCoords);
      // Заглушка для геокодирования
      return `Адрес по координатам: ${centerCoords.lat.toFixed(
        6
      )}, ${centerCoords.lng.toFixed(6)}`;
    },
    []
  );

  const handleMapClick = useCallback(
    async (event: any) => {
      const coordinates = event?.detail?.coordinates;

      if (!coordinates) return;

      const [lng, lat] = coordinates;

      setBaseData((prev) => ({
        ...prev,
        coordinates,
      }));

      setMapState((prev) => ({
        location: {
          ...prev.location,
          center: coordinates,
        },
      }));

      const fullAddress = await getFullAddress({ lat, lng });

      setBaseData((prev) => ({
        ...prev,
        fullAddress,
      }));

      setInputValue(fullAddress);
    },
    [getFullAddress]
  );

  const submit = useCallback((data: BaseData) => {
    setProcessing(true);
    console.log("Данные для отправки:", data);
    setTimeout(() => {
      console.log("Адрес базы изменён!", data);
      setProcessing(false);
      alert(`Адрес сохранен: ${data.fullAddress}`);
    }, 1000);
  }, []);

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

  useEffect(() => {
    if (!components || !mapContainerRef.current) return;

    const handleContainerClick = (e: MouseEvent) => {
      console.log("Container clicked", e);

      const target = e.target as HTMLElement;
      if (target.closest('[class*="ymaps3x0--marker"]')) {
        console.log("Clicked on marker, ignoring");
        return;
      }

      const fakeEvent = {
        detail: {
          coordinates: [
            37.61 + Math.random() * 0.01,
            55.75 + Math.random() * 0.01,
          ] as [number, number],
          type: "click",
          target: { type: "map" },
        },
      };

      handleMapClick(fakeEvent);
    };

    const container = mapContainerRef.current;
    container.addEventListener("click", handleContainerClick);

    return () => {
      container.removeEventListener("click", handleContainerClick);
    };
  }, [components, handleMapClick]);

  useEffect(() => {
    if (inputValue === "" || inputValue.length < 2) {
      setOptions([]);
      return;
    }

    setSuggestLoading(true);
    geoSuggestV2(inputValue)
      .then((results) => setOptions(results))
      .catch(() => setOptions([]))
      .finally(() => setSuggestLoading(false));
  }, [inputValue, geoSuggestV2]);

  // Без этого упадет приложение, тк карты не сразу подгружаются
  if (!components) {
    return (
      <Grid size={12}>
        <LinearProgress />
      </Grid>
    );
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = components;

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
              <YMap
                location={mapState.location}
                onClick={handleMapClick}
                style={{ cursor: "grab" }}
              >
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
