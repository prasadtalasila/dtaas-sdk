/**
 * The line between the canvas and the page: the handle a page drives the
 * viewer through, and the pointer picking that reports back to it.
 *
 * The page owns the interface and the canvas owns the scene. Nothing else
 * crosses between them.
 */

import {
  Raycaster,
  Vector2,
  type Group,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SceneView,
  addOutlines,
  createFieldSheet,
  createGlow,
  type PropertyTree,
} from 'src/viewer';
import { frame, type LookFrom } from 'src/react/canvasScene';

/** What a page can do to the scene from outside. */
export interface ViewerHandle {
  view: SceneView;
  /** Put the whole model back in shot. */
  frame: () => void;
  /** Look from one of three axes, or from the default corner. */
  look: (from: LookFrom) => void;
  /**
   * Redraw the sheet the Per Sensor scope lays over the floor. Separate from
   * `view.refresh`, which repaints the model's own objects: the sheet is
   * beside the model and not one of them.
   */
  drawField: () => void;
}

/** Where a model is drawn: the element, the scene and how it is looked at. */
export interface Stage {
  parent: HTMLElement;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
}

/**
 * Wrap a model already in the scene in a view and a handle.
 *
 * The field's sheet and the selection halo live beside the model, not in it:
 * they are marks on the building and not part of it, and inside the model
 * they would take its transform twice. The outlines go on after the view has
 * found the objects, so they sit on exactly what is drawn. Everything to give
 * back is pushed onto `cleanUp`.
 */
export function presentModel(
  stage: Stage,
  model: Group,
  tree: PropertyTree | undefined,
  cleanUp: Array<() => void>,
): ViewerHandle {
  const { scene, camera, controls } = stage;
  const view = new SceneView(model, tree);
  const sheet = createFieldSheet(scene);
  cleanUp.push(() => sheet.dispose());
  const glow = createGlow(scene);
  view.attachGlow(glow);
  cleanUp.push(() => glow.dispose());
  addOutlines(view.meshes.values());
  view.refresh();
  return {
    view,
    frame: () => frame(camera, controls, model),
    look: (from) => frame(camera, controls, model, from),
    drawField: () => sheet.draw(view),
  };
}

/**
 * Which object is under the pointer, or null. Only what is visible counts: a
 * floor filter that hides a wall must also stop that wall being clicked
 * through the floor above it.
 */
function picker(stage: Stage, view: SceneView) {
  const pointer = new Vector2();
  const ray = new Raycaster();
  return (event: MouseEvent): string | null => {
    const box = stage.parent.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    pointer.y = -((event.clientY - box.top) / box.height) * 2 + 1;
    ray.setFromCamera(pointer, stage.camera);
    const visible = [...view.meshes.values()].filter((mesh) => mesh.visible);
    const hits = ray.intersectObjects(visible, false);
    return (hits[0]?.object.userData.globalId as string | undefined) ?? null;
  };
}

export interface PickReports {
  onHover?: (globalId: string | null) => void;
  onSelect?: (globalId: string | null) => void;
}

/** What moving and clicking over the stage do to the view. */
function pointerHandlers(
  at: (event: MouseEvent) => string | null,
  view: SceneView,
  { onHover, onSelect }: PickReports,
) {
  let hovered: string | null = null;
  const move = (event: MouseEvent) => {
    const globalId = at(event);
    if (globalId === hovered) return;
    hovered = globalId;
    view.state.hovered = globalId;
    view.refreshMaterials();
    onHover?.(globalId);
  };
  const click = (event: MouseEvent) => {
    const globalId = at(event);
    view.state.selected = globalId;
    view.refreshMaterials();
    onSelect?.(globalId);
  };
  return { move, click };
}

/** Hover and click picking on the stage, until the returned function runs. */
export function listenForPicks(
  stage: Stage,
  view: SceneView,
  reports: PickReports,
): () => void {
  const { move, click } = pointerHandlers(picker(stage, view), view, reports);
  stage.parent.addEventListener('pointermove', move);
  stage.parent.addEventListener('click', click);
  return () => {
    stage.parent.removeEventListener('pointermove', move);
    stage.parent.removeEventListener('click', click);
  };
}
