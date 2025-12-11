import {
  YMap,
  YMapDefaultSchemeLayer,
  YMapDefaultFeaturesLayer,
  YMapMarker,
  reactify,
} from "./libs/ymaps";
import type { YMapLocationRequest } from "ymaps3";

const LOCATION: YMapLocationRequest = {
  center: [25.229762, 55.289311],
  zoom: 9,
};

export default function App() {
  return (
    <div style={{ width: "600px", height: "400px" }}>
      <YMap location={reactify.useDefault(LOCATION)}>
        <YMapDefaultSchemeLayer />
        <YMapDefaultFeaturesLayer />

        <YMapMarker
          coordinates={reactify.useDefault([25.229762, 55.289311])}
          draggable={true}
        >
          <section>
            <h1>You can drag this header</h1>
          </section>
        </YMapMarker>
      </YMap>
    </div>
  );
}
