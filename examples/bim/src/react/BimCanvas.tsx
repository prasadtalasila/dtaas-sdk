/**
 * The 3D canvas, kept in its own chunk.
 *
 * three.js is around 600 KB before the loaders, so this is loaded through
 * `React.lazy` and reaches the browser only when someone opens a model. The
 * component owns the renderer and gives it back on unmount. What is drawn on
 * the model comes from the manifest; this file holds no opinion about what a
 * binding looks like.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import type { Binding } from 'src/core';
import type { PropertyTree } from 'src/viewer';
import type { ViewerHandle } from 'src/react/canvasHandle';
import { mountCanvas, type StatusReport } from 'src/react/canvasMount';

export type { ViewerHandle } from 'src/react/canvasHandle';

export interface BimCanvasProps {
  /**
   * Where the geometry is served from. A `.glb` is loaded; anything else is
   * treated as an IFC file and converted in the browser first, which takes a
   * moment and reports progress.
   */
  url: string;
  /** True when `url` names an IFC file instead of converted geometry. */
  convert?: boolean;
  /** The bindings to draw on it. Empty when the model declares no sensors. */
  bindings?: Binding[];
  /**
   * Whether the manifest says its placements were proposed instead of
   * surveyed. A proposed position is a guess a tool made, and reporting it as
   * a fact is how a guess ends up in a report as a measurement.
   */
  proposed?: boolean;
  /** What the model says each object is, so a floor filter and a heatmap have something to group by. */
  tree?: PropertyTree;
  /** Reported so the page can say what it could not do. */
  onReport?: (message: string) => void;
  /**
   * Handed the loaded model and the camera commands, once it is ready. A page
   * drives the viewer through this: it holds the `SceneView`, changes its
   * state, and calls `refresh`.
   */
  onReady?: (handle: ViewerHandle) => void;
  /** Told which object the cursor is over, and which is selected. */
  onHover?: (globalId: string | null) => void;
  onSelect?: (globalId: string | null) => void;
  /**
   * Handed the converted geometry as a GLB, once, when `convert` was true and
   * the conversion succeeded. It is the model alone, before any marker or
   * outline is added, so it has the shape a GLB made outside the browser has.
   * Nothing is exported when this is absent.
   */
  onConverted?: (glb: Uint8Array) => void;
}

/** What the canvas shows over the drawing while it loads, or when it fails. */
function useCanvasStatus() {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const report = useMemo<StatusReport>(() => {
    const settle = () => {
      setLoading(false);
      setProgress(null);
    };
    const fail = (what: string) => {
      setProblem(what);
      settle();
    };
    return { setProgress, settle, fail };
  }, []);
  return { loading, problem, progress, report };
}

/** The props the scene is drawn from, as one value that changes with them. */
function useDrawn({ url, convert, bindings, proposed, tree }: BimCanvasProps) {
  return useMemo(
    () => ({ url, convert, bindings, proposed, tree }),
    [url, convert, bindings, proposed, tree],
  );
}

/** The callbacks the scene reports through, as one value that changes with them. */
function useReports(props: BimCanvasProps) {
  const { onReport, onReady, onHover, onSelect, onConverted } = props;
  return useMemo(
    () => ({ onReport, onReady, onHover, onSelect, onConverted }),
    [onReport, onReady, onHover, onSelect, onConverted],
  );
}

/** The scene, rebuilt only when what it draws or reports to changes. */
function useCanvas(props: Readonly<BimCanvasProps>) {
  const holder = useRef<HTMLDivElement>(null);
  const { report, ...shown } = useCanvasStatus();
  const drawn = useDrawn(props);
  const reports = useReports(props);
  useEffect(() => {
    const parent = holder.current;
    if (!parent) return undefined;
    return mountCanvas(parent, { ...drawn, ...reports }, report);
  }, [drawn, reports, report]);
  return { holder, ...shown };
}

const OVERLAY_SX = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
} as const;

interface OverlayProps {
  loading: boolean;
  problem: string | null;
  progress: string | null;
}

/** Progress while the model loads, or what went wrong. */
function CanvasOverlay({ loading, problem, progress }: Readonly<OverlayProps>) {
  if (problem) {
    return (
      <Alert
        severity="error"
        sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}
      >
        {problem}
      </Alert>
    );
  }
  if (!loading) return null;
  return (
    <Box sx={OVERLAY_SX}>
      <CircularProgress />
      {progress && <Typography variant="body2">{progress}</Typography>}
    </Box>
  );
}

function BimCanvas(props: Readonly<BimCanvasProps>) {
  const { holder, ...shown } = useCanvas(props);
  // The canvas must never decide the size of the page.
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '70vh',
        minHeight: 360,
        overflow: 'hidden',
      }}
    >
      <Box
        ref={holder}
        sx={{ width: '100%', height: '100%', overflow: 'hidden' }}
        data-testid="bim-canvas"
      />
      <CanvasOverlay {...shown} />
    </Box>
  );
}

export default BimCanvas;
