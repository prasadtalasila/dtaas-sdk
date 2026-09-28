/**
 * The chosen model: named above its drawing, with the viewer's controls and
 * panels around it once it is ready.
 */

import { Suspense, lazy } from 'react';
import { CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { fileUrl, type BimModel } from 'src/react/assets';
import { StateChip } from 'src/react/ModelPicker';
import type { Page } from 'src/react/useBuildingModels';
import { ViewerControls, ViewerPanels } from 'src/react/ViewerPanels';

// Loaded only when a model is opened, so three.js stays out of the host's main
// chunk. The host already gates bundle size, and a non-lazy three.js import
// shows up there immediately.
const BimCanvas = lazy(() => import('src/react/BimCanvas'));

/**
 * The model being drawn, named from the listing like the chip beside it: a
 * model can be chosen before its name has been read from its file.
 */
function ModelHeading({ model }: Readonly<{ model: BimModel }>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', px: 1, pt: 1, pb: 0.5 }}
    >
      <Typography variant="h6" component="h2">
        {model.title}
      </Typography>
      <StateChip model={model} />
    </Stack>
  );
}

export interface ModelViewProps {
  libraryUrl: string;
  chosen: BimModel;
  page: Page;
}

/**
 * The canvas, bound to the model as it was chosen. Keyed by its paths, so
 * choosing another model gives it a fresh canvas, and a save that adds a GLB
 * beside the model on screen does not redraw it.
 */
function Canvas({ libraryUrl, chosen, page }: Readonly<ModelViewProps>) {
  const path = chosen.geometryPath ?? chosen.ifcPath;
  const { files, viewer } = page;
  return (
    <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
      <BimCanvas
        key={path}
        url={fileUrl(libraryUrl, path)}
        convert={!chosen.geometryPath}
        bindings={files.bindings}
        proposed={files.proposed}
        tree={files.tree ?? undefined}
        onReport={page.onReport}
        onReady={viewer.onReady}
        onHover={viewer.onHover}
        onSelect={viewer.pick}
        onConverted={page.saving.onConverted}
      />
    </Suspense>
  );
}

export function ModelView(props: Readonly<ModelViewProps>) {
  const { chosen, page } = props;
  const { viewer } = page;
  const view = viewer.handle?.view;
  return (
    <Paper sx={{ p: 1 }}>
      <ModelHeading model={page.selection.current ?? chosen} />
      {view && <ViewerControls view={view} viewer={viewer} />}
      <Canvas {...props} />
      {view && <ViewerPanels view={view} viewer={viewer} live={page.live} />}
    </Paper>
  );
}
