/**
 * Building the canvas's scene, loading a model into it, and taking it all
 * down again.
 */

import type { Group } from 'three';
import type { Binding } from 'src/core';
import type { BimCanvasProps } from 'src/react/BimCanvas';
import { addMarkers, sensorReport } from 'src/react/canvasMarkers';
import {
  listenForPicks,
  presentModel,
  type Stage,
} from 'src/react/canvasHandle';
import { startRenderer } from 'src/react/canvasRenderer';
import { createScene, disposeScene, frame } from 'src/react/canvasScene';
import { loadGeometry, type GeometryLoad } from 'src/react/loadGeometry';

/** Where loading stands, as the scene reports it. */
export interface StatusReport {
  setProgress: (text: string | null) => void;
  /** The model is shown. */
  settle: () => void;
  fail: (what: string) => void;
}

const NO_BINDINGS: Binding[] = [];

/** Put a built model in the scene, whatever produced it, and report on it. */
function showModel(
  stage: Stage,
  model: Group,
  props: Readonly<BimCanvasProps>,
  cleanUp: Array<() => void>,
): string | undefined {
  const bindings = props.bindings ?? NO_BINDINGS;
  stage.scene.add(model);
  const radius = frame(stage.camera, stage.controls, model);
  const placement = addMarkers(model, bindings, radius);
  const handle = presentModel(stage, model, props.tree, cleanUp);
  props.onReady?.(handle);
  const stopPicking = listenForPicks(stage, handle.view, props);
  cleanUp.push(() => {
    stopPicking();
    handle.view.dispose();
  });
  return sensorReport(bindings.length, placement, props.proposed ?? false);
}

interface Mounted {
  running: () => boolean;
  cleanUp: Array<() => void>;
}

/** What to load, and where each outcome goes while the canvas is mounted. */
function geometryLoad(
  stage: Stage,
  props: Readonly<BimCanvasProps>,
  status: StatusReport,
  { running, cleanUp }: Mounted,
): GeometryLoad {
  return {
    url: props.url,
    convert: props.convert ?? false,
    running,
    onProgress: status.setProgress,
    onLoaded: (model, note) => {
      if (!running()) return;
      const sensors = showModel(stage, model, props, cleanUp);
      status.settle();
      const both = [note, sensors].filter(Boolean).join(' ');
      if (both) props.onReport?.(both);
    },
    onFailed: (what) => {
      if (running()) status.fail(what);
    },
    onConverted: props.onConverted,
  };
}

/**
 * Build the scene in `parent`, load the model into it, and return the
 * teardown, which gives back everything that was set up, whatever the model
 * turned out to be, so a page that switches models leaks nothing a visit.
 */
export function mountCanvas(
  parent: HTMLElement,
  props: Readonly<BimCanvasProps>,
  status: StatusReport,
): () => void {
  const { scene, camera } = createScene();
  const renderer = startRenderer(parent, scene, camera);
  const stage: Stage = { parent, scene, camera, controls: renderer.controls };
  const cleanUp: Array<() => void> = [];
  let running = true;
  loadGeometry(
    geometryLoad(stage, props, status, { running: () => running, cleanUp }),
  );
  return () => {
    running = false;
    cleanUp.forEach((undo) => undo());
    disposeScene(scene);
    renderer.dispose();
  };
}
