// src/utils/geo-utils.ts

// Geo types
export interface GeoCoderItemTypeV3 {
  GeoObjectCollection: {
    metaDataProperty: {
      GeocoderResponseMetaData: {
        request: string;
        results: string;
        found: string;
      };
    };
    featureMember: Array<{
      GeoObject: {
        metaDataProperty: {
          GeocoderMetaData: {
            precision: string;
            text: string;
            kind: string;
            Address: {
              country_code: string;
              formatted: string;
              Components: Array<{
                kind: string;
                name: string;
              }>;
            };
            AddressDetails: {
              Country: {
                AddressLine: string;
                CountryNameCode: string;
                CountryName: string;
                AdministrativeArea: {
                  AdministrativeAreaName: string;
                  Locality: {
                    LocalityName: string;
                    Thoroughfare: {
                      ThoroughfareName: string;
                      Premise: {
                        PremiseNumber: string;
                      };
                    };
                  };
                };
              };
            };
          };
        };
        name: string;
        description: string;
        boundedBy: {
          Envelope: {
            lowerCorner: string;
            upperCorner: string;
          };
        };
        uri: string;
        Point: {
          pos: string;
        };
      };
    }>;
  };
}

export interface GeoCoderItemTypeV2 {
  country_code: string;
  string: string;
  location: {
    lat: number;
    lon: number;
  };
  components: {
    country: string;
    province: string;
    city: string;
    street: string;
    house: string;
  };
}

export interface GeoSuggestV2Item {
  displayName?: string;
  value?: string;
  uri?: string;
}

// Конфигурация прямо в файле (временное решение)
const CONFIG = {
  YANDEX_MAP_API_KEY: import.meta.env.VITE_YANDEX_API_KEY || "",
  YANDEX_MAP_API_KEY_SUGGEST:
    import.meta.env.VITE_YANDEX_SUGGEST_API_KEY ||
    "c139a8bb-0769-4ea1-9926-1deb3385947e",
};

// Заглушка для getConfig
export const getConfig = () => ({
  consts: {
    YANDEX_MAP_API_KEY: CONFIG.YANDEX_MAP_API_KEY,
    YANDEX_MAP_API_KEY_SUGGEST: CONFIG.YANDEX_MAP_API_KEY_SUGGEST,
  },
});

export const yandexGeoSuggest = (input: string, bbox: string) => {
  const apiKey = CONFIG.YANDEX_MAP_API_KEY_SUGGEST;
  return fetch(
    `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&types=biz%2Cgeo&text=${input}&lang=ru_RU&results=10&origin=jsapi2Geocoder&print_address=1&bbox=${bbox}&strict_bounds=0&attrs=uri`
  );
};

export const yandexGeoCoder = (input?: string, uri?: string) => {
  const apiKey = CONFIG.YANDEX_MAP_API_KEY;
  let url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json`;

  if (input) {
    url += `&geocode=${encodeURIComponent(input)}`;
  } else if (uri) {
    url += `&uri=${encodeURIComponent(uri)}`;
  }

  return fetch(url);
};

export const getPointData = (text: string) => {
  return {
    hintContent: text,
  };
};

export const getRequestBounds = (
  address: { lat: number; lng: number },
  coordinateDistance: number | [number, number] | null = null
) => {
  if (!address.lat) {
    return null;
  }

  let distance: [number, number];

  if (!coordinateDistance) {
    distance = [0.25, 0.5];
  } else if (typeof coordinateDistance === "number") {
    distance = [coordinateDistance, coordinateDistance];
  } else {
    distance = coordinateDistance;
  }

  return [
    address.lng - distance[1] / 2, // min lon
    address.lat - distance[0] / 2, // min lat
    address.lng + distance[1] / 2, // max lon
    address.lat + distance[0] / 2, // max lat
  ];
};
