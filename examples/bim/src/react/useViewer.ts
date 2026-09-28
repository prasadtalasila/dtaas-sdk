/**
 * What the page holds about the viewer once a model is drawn: its handle,
 * the object picked in it, and the shortcuts that drive it.
 *
 * The scene itself is not React state: it is a three.js graph that would be
 * ruinous to copy on every frame. `revision` is bumped after anything changes
 * it instead, so the toolbar and the floor picker redraw.
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Binding, FeedState, Reading } from 'src/core';
import { handleKey, type SceneView, type ShortcutContext } from 'src/viewer';
import type { ViewerHandle } from 'src/react/BimCanvas';

export interface Viewer {
  handle: ViewerHandle | null;
  revision: number;
  bump: () => void;
  /** The object picked in the drawing or on a sensor card. */
  picked: string | null;
  pick: (globalId: string | null) => void;
  helpOpen: boolean;
  closeHelp: () => void;
  /** Everything a shortcut needs, so the keyboard and the toolbar share one path. */
  shortcutContext: (view: SceneView) => ShortcutContext;
  onReady: (handle: ViewerHandle) => void;
  onHover: (globalId: string | null) => void;
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

/** Hand the readings to the scene and repaint it, as one batch. */
function paintReadings(
  handle: ViewerHandle,
  bindings: Binding[],
  readings: Map<string, Reading>,
  feed: FeedState,
) {
  handle.view.applyReadings(bindings, readings, feed);
  handle.drawField();
  handle.view.refreshMaterials();
}

/**
 * The readings reach the scene here instead of inside it, so a burst of
 * messages is one repaint instead of one per message.
 */
function useReadings(
  handle: ViewerHandle | null,
  inputs: {
    bindings: Binding[];
    readings: Map<string, Reading>;
    feed: FeedState;
  },
  bump: () => void,
) {
  const { bindings, readings, feed } = inputs;
  useEffect(() => {
    if (!handle) return;
    paintReadings(handle, bindings, readings, feed);
    bump();
  }, [handle, bindings, readings, feed, bump]);
}

function useShortcutContext(
  handle: ViewerHandle | null,
  bindings: Binding[],
  hovered: RefObject<string | null>,
  actions: { bump: () => void; toggleHelp: () => void },
) {
  const { bump, toggleHelp } = actions;
  return useCallback(
    (view: SceneView): ShortcutContext => ({
      view,
      bindings,
      refresh: () => {
        view.refresh();
        handle?.drawField();
        bump();
      },
      frame: () => handle?.frame(),
      look: (from) => handle?.look(from),
      hovered: () => hovered.current,
      toggleHelp,
      toggleFullscreen,
    }),
    [handle, bindings, hovered, bump, toggleHelp],
  );
}

/**
 * The keyboard reaches the viewer only while a model is open, so a page with
 * nothing loaded does not swallow keys that belong to the application.
 */
function useKeyboard(
  handle: ViewerHandle | null,
  shortcutContext: (view: SceneView) => ShortcutContext,
) {
  useEffect(() => {
    if (!handle) return undefined;
    const context = shortcutContext(handle.view);
    const onKey = (event: KeyboardEvent) => {
      if (handleKey(event, context)) event.preventDefault();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [handle, shortcutContext]);
}

/** What the canvas reports back: ready, and what the cursor is over. */
function useCanvasReports(bump: () => void) {
  const [handle, setHandle] = useState<ViewerHandle | null>(null);
  const [picked, pick] = useState<string | null>(null);
  const hovered = useRef<string | null>(null);
  const onReady = useCallback(
    (ready: ViewerHandle) => {
      setHandle(ready);
      pick(null);
      bump();
    },
    [bump],
  );
  const onHover = useCallback((globalId: string | null) => {
    hovered.current = globalId;
  }, []);
  return { handle, picked, pick, hovered, onReady, onHover };
}

export function useViewer(inputs: {
  bindings: Binding[];
  readings: Map<string, Reading>;
  feed: FeedState;
}): Viewer {
  const [revision, bump] = useReducer((n: number) => n + 1, 0);
  const [helpOpen, setHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => setHelpOpen((open) => !open), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const { hovered, ...reports } = useCanvasReports(bump);
  const { handle } = reports;
  useReadings(handle, inputs, bump);
  const shortcutContext = useShortcutContext(handle, inputs.bindings, hovered, {
    bump,
    toggleHelp,
  });
  useKeyboard(handle, shortcutContext);
  return { ...reports, revision, bump, helpOpen, closeHelp, shortcutContext };
}

export default useViewer;
