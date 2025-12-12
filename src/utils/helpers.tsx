import { Typography } from "@mui/material";

type GeoSuggestV2Item = { displayName?: string; value?: string };

export const renderGeoSuggestV2Option = (option: GeoSuggestV2Item) => {
  return (
    <div>
      <Typography>{option.displayName}</Typography>
      <Typography color="textSecondary">{option.value}</Typography>
    </div>
  );
};
