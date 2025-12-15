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
} from "@mui/material";

import { getConfig } from "../utils/geo-utils";
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
  border-radius: 8px;
  border: 1px solid #ddd;
`;

const markerStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(50% - 36.5px)",
  left: "calc(50% - 31px)",
};

const EditBaseAddressV3: React.FC<EditBaseAddressModalProps> = ({
  navigateToCreateVehicle,
}) => {
  const {
    consts: { YANDEX_MAP_API_KEY },
  } = getConfig();

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

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Инициализация карт
  useEffect(() => {
    const loadYMaps3 = async () => {
      try {
        setMapLoading(true);

        if (window.ymaps3) {
          const comps = await initYMaps3Components();
          setComponents(comps);
          setMapLoading(false);
          return;
        }

        const script = document.createElement("script");
        script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_MAP_API_KEY}&lang=ru_RU`;
        script.async = true;

        script.onload = async () => {
          try {
            await ymaps3.ready;
            const comps = await initYMaps3Components();
            setComponents(comps);
          } catch (error) {
            console.error("Failed to init YMaps3:", error);
          } finally {
            setMapLoading(false);
          }
        };

        script.onerror = () => {
          console.error("Failed to load YMaps3 script");
          setMapLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error("Error loading YMaps3:", error);
        setMapLoading(false);
      }
    };

    loadYMaps3();
  }, [YANDEX_MAP_API_KEY]);

  // Callbacks
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

  const handleSelectAddress = useCallback(async (suggestItem: any) => {
    console.log("handleSelectAddress:", suggestItem);
    if (suggestItem?.coordinates) {
      const coords: [number, number] = suggestItem.coordinates;
      setBaseData({
        coordinates: coords,
        fullAddress: suggestItem.displayName || suggestItem.value,
      });
      setMapState((prev) => ({
        location: {
          ...prev.location,
          center: coords,
          zoom: 16,
        },
      }));
      setInputValue(suggestItem.displayName || suggestItem.value);
    }
  }, []);

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
    (event: any) => {
      console.log("Map click event received:", event);

      const coordinates = event?.detail?.coordinates as
        | [number, number]
        | undefined;

      if (coordinates && coordinates.length === 2) {
        console.log("✅ Map clicked at coordinates:", coordinates);

        // Обновляем данные
        setBaseData((prev) => ({
          ...prev,
          coordinates: coordinates,
        }));

        // Центрируем карту
        setMapState((prev) => ({
          location: {
            ...prev.location,
            center: coordinates,
          },
        }));

        // Обновляем поле ввода
        const tempAddress = `Координаты: ${coordinates[0].toFixed(
          6
        )}, ${coordinates[1].toFixed(6)}`;
        setInputValue(tempAddress);

        // Получаем полный адрес
        getFullAddress({ lat: coordinates[1], lng: coordinates[0] })
          .then((address) => {
            setBaseData((prev) => ({
              ...prev,
              fullAddress: address,
            }));
            setInputValue(address);
          })
          .catch((err) => {
            console.error("Error getting address:", err);
          });
      }
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

  const handleSubmit = useCallback(() => {
    submit(baseData);
  }, [baseData, submit]);

  const closeModal = useCallback(() => console.log("close modal"), []);

  const marker = useMemo(() => {
    if (!components || !components.YMapMarker) return null;

    return (
      <components.YMapMarker
        coordinates={baseData.coordinates}
        draggable={true}
        zIndex={1000}
        onDragEnd={(event: any) => {
          console.log("Drag ended:", event);
          const coordinates = event?.coordinates as [number, number];

          if (coordinates && coordinates.length === 2) {
            console.log("✅ New marker position:", coordinates);

            setBaseData((prev) => ({
              ...prev,
              coordinates: coordinates,
            }));

            setMapState((prev) => ({
              location: {
                ...prev.location,
                center: coordinates,
              },
            }));

            // Обновляем адрес
            getFullAddress({ lat: coordinates[1], lng: coordinates[0] })
              .then((address) => {
                setBaseData((prev) => ({
                  ...prev,
                  fullAddress: address,
                }));
                setInputValue(address);
              })
              .catch((err) => {
                console.error("Error getting address after drag:", err);
                setInputValue(
                  `Координаты: ${coordinates[0].toFixed(
                    6
                  )}, ${coordinates[1].toFixed(6)}`
                );
              });
          }
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            transform: "translate(-50%, -100%)",
            cursor: "grab",
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

  if (mapLoading || !components) {
    return (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={{ height: 480 }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка Яндекс Карт v3.0...</Typography>
      </Grid>
    );
  }

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = components;

  return (
    <Grid size={12} container spacing={2}>
      <Typography variant="h5">Адрес базы (YMaps3)</Typography>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Кликните на карту или перетащите маркер для выбора местоположения
      </Typography>

      <form style={{ width: "100%" }}>
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
                noOptionsText="Введите адрес для поиска"
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
                    label="Адрес базы"
                    placeholder="Введите адрес или выберите на карте"
                    variant="outlined"
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

          <Grid size={12}>
            <Typography variant="body2" color="textSecondary">
              Текущие координаты: {baseData.coordinates[0].toFixed(6)},{" "}
              {baseData.coordinates[1].toFixed(6)}
            </Typography>
          </Grid>

          <MapWrapper container size={12} ref={mapContainerRef}>
            <YMap
              ref={mapRef}
              location={mapState.location}
              mode="vector"
              onClick={handleMapClick}
            >
              <YMapDefaultSchemeLayer />
              <YMapDefaultFeaturesLayer />
              {marker}
            </YMap>

            <Button
              variant="contained"
              size="small"
              sx={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "white",
                color: "#333",
                "&:hover": { background: "#f5f5f5" },
                boxShadow: 2,
                zIndex: 1000,
              }}
              onClick={() => {
                const testCoords: [number, number] = [37.617, 55.755];
                setBaseData({
                  coordinates: testCoords,
                  fullAddress: "Москва, Красная площадь",
                });
                setMapState({
                  location: {
                    center: testCoords,
                    zoom: 16,
                  },
                });
                setInputValue("Москва, Красная площадь");
                console.log("Тест: центрировали на Красной площади");
              }}
            >
              Тест центрирования
            </Button>

            {processing && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2000,
                }}
              >
                <CircularProgress />
              </div>
            )}
          </MapWrapper>

          <Grid container spacing={2} sx={{ width: "100%", mt: 1 }}>
            <Grid size={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={closeModal}
                disabled={processing}
              >
                Отменить
              </Button>
            </Grid>
            <Grid size={6}>
              <Button
                variant="contained"
                fullWidth
                disabled={processing || !baseData.fullAddress}
                onClick={handleSubmit}
                color="primary"
                sx={{
                  borderRadius: "4px",
                  py: 1,
                }}
              >
                {processing ? "Сохранение..." : "Сохранить адрес"}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </form>
    </Grid>
  );
};

EditBaseAddressV3.displayName = "BaseAddressV3";

export default EditBaseAddressV3;
