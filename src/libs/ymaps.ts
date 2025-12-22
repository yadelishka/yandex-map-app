// Стартовый конфиг библиотеки для TestMap
/* import React from "react";
import ReactDom from "react-dom";

const [ymaps3React] = await Promise.all([
  ymaps3.import("@yandex/ymaps3-reactify"),
  ymaps3.ready,
]);

export const reactify = ymaps3React.reactify.bindTo(React, ReactDom);
export const {
  YMap,
  YMapDefaultSchemeLayer,
  YMapDefaultFeaturesLayer,
  YMapMarker,
} = reactify.module(ymaps3);
 */

import React from "react";
import ReactDOM from "react-dom";

let ymaps3ReactComponents: any = null;

// Флаг загрузки скрипта
let scriptPromise: Promise<void> | null = null;

// Загрузка скрипта
export function loadYMaps3Script() {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.ymaps3) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps3) resolve();
      else reject(new Error("Yandex Maps v3 loaded but ymaps3 is undefined"));
    };

    script.onerror = () =>
      reject(new Error("Failed to load Yandex Maps v3 script"));

    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function getYMaps3Components() {
  await loadYMaps3Script();

  if (ymaps3ReactComponents) return ymaps3ReactComponents;

  await ymaps3.ready;

  ymaps3.import.registerCdn("https://cdn.jsdelivr.net/npm/{package}", [
    "@yandex/ymaps3-default-ui-theme@0.0",
  ]);

  const [ymaps3React, ymaps3DefaultUiTheme] = await Promise.all([
    ymaps3.import("@yandex/ymaps3-reactify"),
    ymaps3.import("@yandex/ymaps3-default-ui-theme"),
  ]);

  const reactify = ymaps3React.reactify.bindTo(React, ReactDOM);

  const baseComponents = reactify.module(ymaps3);
  const themeComponents = reactify.module(ymaps3DefaultUiTheme);

  ymaps3ReactComponents = {
    ...baseComponents,
    ...themeComponents,
    reactify,
    ymaps3,
  };

  return ymaps3ReactComponents;
}

export async function initYMaps3Components() {
  try {
    const components = await getYMaps3Components();

    return {
      YMap: components.YMap,
      YMapDefaultSchemeLayer: components.YMapDefaultSchemeLayer,
      YMapDefaultFeaturesLayer: components.YMapDefaultFeaturesLayer,
      YMapMarker: components.YMapMarker,
      YMapListener: components.YMapListener,

      YMapControls: components.YMapControls,
      YMapZoomControl: components.YMapZoomControl,

      reactify: components.reactify,
    };
  } catch (error) {
    console.error("Failed to initialize YMaps3 components:", error);
    throw error;
  }
}
