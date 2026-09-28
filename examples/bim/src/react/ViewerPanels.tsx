/**
 * The controls above the drawing and the panels below it, shown once the
 * viewer is ready.
 */

import { Box, Stack } from '@mui/material';
import {
  displayOf,
  zonesOf,
  type Binding,
  type FeedState,
  type Reading,
} from 'src/core';
import type { SceneView } from 'src/viewer';
import { FloorPicker } from 'src/react/FloorPicker';
import { ClassLegend, HeatLegend } from 'src/react/Legend';
import { ObjectPanel } from 'src/react/ObjectPanel';
import { SensorCards } from 'src/react/SensorCards';
import { Toolbar } from 'src/react/Toolbar';
import type { Viewer } from 'src/react/useViewer';

export interface Live {
  bindings: Binding[];
  readings: Map<string, Reading>;
  feed: FeedState;
}

/** Show one floor, or every floor for null. `view` is a mutable handle by design. */
function showStorey(view: SceneView, storey: string | null, bump: () => void) {
  view.state.storey = storey;
  view.refresh();
  bump();
}

const CONTROLS_SX = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: 1,
} as const;

const PANELS_SX = {
  display: 'flex',
  gap: 2,
  mt: 1,
  flexWrap: 'wrap',
  alignItems: 'flex-start',
} as const;

/**
 * The toolbar, with the floor picker on its row after the last button, so
 * the controls above the drawing take one line. It wraps when the page is
 * too narrow for both.
 */
export function ViewerControls({
  view,
  viewer,
}: Readonly<{ view: SceneView; viewer: Viewer }>) {
  return (
    <Box sx={CONTROLS_SX}>
      <Toolbar
        view={view}
        context={viewer.shortcutContext(view)}
        revision={viewer.revision}
      />
      <FloorPicker
        storeys={view.storeys}
        current={view.state.storey}
        onChange={(storey) => showStorey(view, storey, viewer.bump)}
      />
    </Box>
  );
}

/**
 * What is known about the picked object, including the property sets the
 * model carries: without them every object looked like it held four facts
 * when the tree holds dozens.
 */
function ObjectDetails({
  view,
  picked,
  bindings,
}: Readonly<{ view: SceneView; picked: string | null; bindings: Binding[] }>) {
  const facts = picked ? view.factsOf(picked) : undefined;
  return (
    <ObjectPanel
      globalId={picked}
      facts={facts}
      binding={bindings.find((b) => b.selector?.globalId === picked)}
      properties={facts?.properties}
      size={picked ? view.sizeOf(picked) : undefined}
    />
  );
}

function Heat({ view, live }: Readonly<{ view: SceneView; live: Live }>) {
  const { bindings, readings, feed } = live;
  if (view.state.heat === 'off') return null;
  const zoneAt = (globalId: string) => view.zoneFor(globalId);
  return (
    <HeatLegend
      zones={zonesOf(bindings, readings, view.state.heat, zoneAt, feed)}
      unit={bindings[0] ? displayOf(bindings[0]).unit : undefined}
      coloured={view.liveCount(bindings, readings, feed)}
    />
  );
}

interface PanelProps {
  view: SceneView;
  viewer: Viewer;
  live: Live;
}

function SensorColumn({ view, viewer, live }: Readonly<PanelProps>) {
  return (
    <Stack sx={{ flex: '1 1 260px', minWidth: 0, gap: 1 }}>
      <SensorCards
        bindings={live.bindings}
        readings={live.readings}
        feed={live.feed}
        selected={viewer.picked}
        onSelect={viewer.pick}
      />
      <Heat view={view} live={live} />
      <ClassLegend view={view} onChange={viewer.bump} />
    </Stack>
  );
}

export function ViewerPanels({ view, viewer, live }: Readonly<PanelProps>) {
  return (
    <Box sx={PANELS_SX}>
      <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
        <ObjectDetails
          view={view}
          picked={viewer.picked}
          bindings={live.bindings}
        />
      </Box>
      <SensorColumn view={view} viewer={viewer} live={live} />
    </Box>
  );
}
