import { GlobalStyles } from "@mui/material";
import EditBaseAddress from "./components/edit-base-address";
import EditBaseAddressV3 from "./components/new-edit-base-address";

export default function App() {
  return (
    <>
      <GlobalStyles
        styles={{
          ".ymaps3x0--map": {
            cursor: "grab !important",
          },
          ".ymaps3x0--map:active": {
            cursor: "grabbing !important",
          },
        }}
      />
      <EditBaseAddressV3 />
      <br />
      <EditBaseAddress />
    </>
  );
}
