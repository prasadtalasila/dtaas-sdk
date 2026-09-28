/**
 * The two legends: what the colours of the model mean, and what the heatmap
 * means.
 *
 * The class legend reads the colours the model arrived with instead of a
 * table written here, because an architect assigned them and a legend that
 * invented its own would describe a different building.
 *
 * The heatmap legend states its range, and the range comes from the manifest
 * instead of from the readings. A scale that rescaled itself would make a
 * steady building look like a changing one.
 */

import {
  Box,
  Chip,
  ListItemButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { RAMP_STOPS, type Zones } from 'src/core';
import type { SceneView } from 'src/viewer';

function Swatch({ colour }: Readonly<{ colour: string }>) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: 0.5,
        bgcolor: colour,
        border: '1px solid rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}
    />
  );
}

interface ClassRowProps {
  ifcClass: string;
  colour: string;
  count: number;
  selected: boolean;
  onPick: (ifcClass: string) => void;
}

/**
 * One row of the class legend.
 *
 * A host theme may give every list button a 44 pixel minimum, which is right
 * for a navigation drawer a finger has to hit and wrong for a legend of
 * dozens of classes, where it pushed most of the list out of sight. Thirty
 * two pixels keeps each row above the 24 pixel target size WCAG 2.2 sets at
 * level AA.
 */
function ClassRow(props: Readonly<ClassRowProps>) {
  const { ifcClass, colour, count, selected, onPick } = props;
  return (
    <ListItemButton
      dense
      selected={selected}
      onClick={() => onPick(ifcClass)}
      sx={{ gap: 0.75, py: 0.2, minHeight: 32, borderRadius: 1 }}
    >
      <Swatch colour={colour} />
      <Typography variant="body2">{ifcClass.replace(/^Ifc/, '')}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ ml: 'auto', pl: 1.5, fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </Typography>
    </ListItemButton>
  );
}

interface ClassRowsProps {
  colours: Map<string, string>;
  counts: Map<string, number>;
  highlighted: string | null;
  onPick: (ifcClass: string) => void;
}

function ClassRows({
  colours,
  counts,
  highlighted,
  onPick,
}: Readonly<ClassRowsProps>) {
  return (
    <Stack sx={{ mt: 0.5, gap: 0.25 }}>
      {[...colours].map(([ifcClass, colour]) => (
        <ClassRow
          key={ifcClass}
          ifcClass={ifcClass}
          colour={colour}
          count={counts.get(ifcClass) ?? 0}
          selected={highlighted === ifcClass}
          onPick={onPick}
        />
      ))}
    </Stack>
  );
}

export interface ClassLegendProps {
  view: SceneView;
  /** Called after a pick, so the page repaints. */
  onChange: () => void;
}

/**
 * Light every object of a class, or clear the pick if it is already lit.
 *
 * A plain function, not a hook or a component: `view` is a mutable handle by
 * design, the same one every shortcut in `viewer/shortcuts.ts` writes to.
 */
function pickClass(view: SceneView, ifcClass: string): void {
  view.state.highlightedClass =
    view.state.highlightedClass === ifcClass ? null : ifcClass;
  view.refreshMaterials();
}

/**
 * What the colours in this model mean, and where each class is.
 *
 * Picking a row lights every object of that class. A legend that only names
 * colours answers "what is this colour", and the question a person has in
 * front of a grey building is "where are the columns". The same row again
 * clears it.
 */
export function ClassLegend({ view, onChange }: Readonly<ClassLegendProps>) {
  const colours = view.classColours();
  if (colours.size === 0) return null;

  const pick = (ifcClass: string) => {
    pickClass(view, ifcClass);
    onChange();
  };

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary">
        In This Model
      </Typography>
      <ClassRows
        colours={colours}
        counts={view.classCounts()}
        highlighted={view.state.highlightedClass}
        onPick={pick}
      />
    </Paper>
  );
}

export interface HeatLegendProps {
  /** What the heatmap is averaging over, or null when nothing is current. */
  zones: Zones | null;
  /** The unit the readings are in, as the manifest declares it. */
  unit: string | undefined;
  /** How many objects the colouring actually reached. */
  coloured: number;
}

function hex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

function NoHeat() {
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Heatmap
      </Typography>
      <Typography variant="body2">No current reading to colour by.</Typography>
    </Paper>
  );
}

function HeatRange({
  zones,
  unit,
}: Readonly<{ zones: Zones; unit: string | undefined }>) {
  return (
    <>
      <Box
        sx={{
          mt: 0.5,
          height: 10,
          borderRadius: 0.5,
          background: `linear-gradient(to right, ${hex(RAMP_STOPS.cold)}, ${hex(RAMP_STOPS.middle)}, ${hex(RAMP_STOPS.warm)})`,
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
        <Typography variant="body2">
          {zones.low} {unit}
        </Typography>
        <Typography variant="body2">
          {zones.high} {unit}
        </Typography>
      </Box>
    </>
  );
}

export function HeatLegend({
  zones,
  unit,
  coloured,
}: Readonly<HeatLegendProps>) {
  if (!zones) return <NoHeat />;

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="caption" color="text.secondary">
        Heatmap
      </Typography>
      <HeatRange zones={zones} unit={unit} />
      <Chip
        size="small"
        sx={{ mt: 0.5 }}
        label={`${zones.counted} sensors, ${coloured} objects`}
      />
    </Paper>
  );
}
