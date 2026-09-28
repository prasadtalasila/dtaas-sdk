/**
 * Choosing a model from a menu instead of from a list down the page.
 *
 * A library with a dozen IFC files pushed the viewer below the fold, so a
 * person scrolling a list of names had no way to tell there was a model drawn
 * underneath it. A menu keeps every file one click away and leaves the drawing
 * where the eye lands.
 */

import {
  Chip,
  CircularProgress,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { formatSize, type BimModel } from 'src/react/assets';

const LABEL_ID = 'bim-model-label';

const HEADING = {
  variant: 'subtitle2',
  component: 'h2',
  id: LABEL_ID,
  sx: { mb: 1 },
} as const;

/** Says whether a model already has geometry beside it, in one word. */
export function StateChip({ model }: Readonly<{ model: BimModel }>) {
  return (
    <Chip
      size="small"
      label={model.geometryPath ? 'Converted' : 'From IFC'}
      color={model.geometryPath ? 'success' : 'default'}
      variant={model.geometryPath ? 'filled' : 'outlined'}
    />
  );
}

/** One entry of the menu: the size and the state sit here, where there is room. */
function menuItem(model: BimModel) {
  return (
    <MenuItem key={model.ifcPath} value={model.ifcPath}>
      <ListItemText
        primary={model.title}
        secondary={formatSize(model.sizeBytes)}
        sx={{ mr: 2 }}
      />
      <StateChip model={model} />
    </MenuItem>
  );
}

export interface ModelPickerProps {
  models: BimModel[];
  chosen: BimModel | null;
  onChoose: (model: BimModel) => void;
}

/**
 * The menu, as wide as the messages below it so a long name shows in full.
 *
 * It is named by a heading before the control, not a floating label inside
 * it. `labelId` and not `aria-labelledby`: passed straight to Select, the
 * attribute lands on the outer box, and the element with the combobox role,
 * the one a screen reader announces, was left with no name.
 */
export function ModelPicker(props: Readonly<ModelPickerProps>) {
  const { models, chosen, onChoose } = props;
  const byPath = (path: unknown) =>
    models.find((model) => model.ifcPath === path);
  const pick = (event: SelectChangeEvent) => {
    const picked = byPath(event.target.value);
    if (picked) onChoose(picked);
  };
  return (
    <FormControl fullWidth size="small">
      <Typography {...HEADING}>IFC Model</Typography>
      <Select
        labelId={LABEL_ID}
        value={chosen?.ifcPath ?? ''}
        onChange={pick}
        renderValue={(value) => byPath(value)?.title ?? ''}
      >
        {models.map(menuItem)}
      </Select>
    </FormControl>
  );
}

function ModelCount({ count }: Readonly<{ count: number }>) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', mt: 1 }}
    >
      {count} IFC {count === 1 ? 'model' : 'models'} in the shared library.
    </Typography>
  );
}

/** The menu once the folder is listed, or what stands in for it until then. */
export function ModelChooser({
  models,
  chosen,
  onChoose,
}: Readonly<Omit<ModelPickerProps, 'models'> & { models: BimModel[] | null }>) {
  if (models === null) return <CircularProgress size={24} />;
  if (models.length === 0) {
    return (
      <Typography variant="body2">
        No IFC file is in the shared library yet.
      </Typography>
    );
  }
  return (
    <>
      <ModelPicker models={models} chosen={chosen} onChoose={onChoose} />
      <ModelCount count={models.length} />
    </>
  );
}
