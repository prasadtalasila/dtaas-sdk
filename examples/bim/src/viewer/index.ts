/**
 * The three.js layer: what a model looks like and what is visible.
 *
 * Kept apart from `./react` so a consumer that draws its own interface, or
 * none at all, never pulls React and MUI in behind it. three.js is a peer
 * dependency of this entry point and of `./react`, and of nothing else.
 */

export { SceneView } from 'src/viewer/sceneView';
export type {
  ObjectFacts,
  PropertyTree,
  ViewState,
} from 'src/viewer/sceneView.types';
export {
  Palette,
  SHELL,
  SELECTED_COLOUR,
  HOVERED_COLOUR,
} from 'src/viewer/appearance';
export {
  SHORTCUTS,
  handleKey,
  type Shortcut,
  type ShortcutContext,
} from 'src/viewer/shortcuts';
export {
  createGizmo,
  cornerViewport,
  GIZMO_SIZE_PX,
  GIZMO_MARGIN_PX,
  type Gizmo,
} from 'src/viewer/gizmo';
export { addOutlines } from 'src/viewer/outline';
export { createGlow, GLOW_MARGIN_M, type Glow } from 'src/viewer/glow';
export {
  buildField,
  sourceAt,
  CELL_M,
  CUT_M,
  BLOCKS,
  OPENS,
  SEARCH_CELLS,
  type Field,
} from 'src/viewer/field';
export { createFieldSheet, type FieldSheet } from 'src/viewer/fieldSheet';
