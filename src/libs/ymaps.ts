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

//ГЛОБАЛЬНЫЙ флаг загрузки
export let isYMaps3Loaded = false;

export async function getYMaps3Components() {
  if (ymaps3ReactComponents) {
    return ymaps3ReactComponents;
  }

  if (!window.ymaps3) {
    throw new Error("YMaps3 not loaded. Load script first.");
  }

  await ymaps3.ready;
  isYMaps3Loaded = true;

  const [ymaps3React] = await Promise.all([
    ymaps3.import("@yandex/ymaps3-reactify"),
    ymaps3.ready,
  ]);

  const reactify = ymaps3React.reactify.bindTo(React, ReactDOM);
  const components = reactify.module(ymaps3);

  ymaps3ReactComponents = {
    ...components,
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
      reactify: components.reactify,
    };
  } catch (error) {
    console.error("Failed to initialize YMaps3 components:", error);
    throw error;
  }
}
