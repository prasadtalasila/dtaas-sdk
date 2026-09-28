/**
 * The React entry point.
 *
 * Kept apart from the package root so a consumer that only wants the manifest
 * logic, a Node script or a test in jsdom, never pulls React, MUI or three.js
 * in behind it. Those three are peer dependencies of this entry point and of
 * nothing else.
 */

export {
  BuildingModels,
  type BuildingModelsProps,
} from 'src/react/BuildingModels';
export {
  ClassLegend,
  HeatLegend,
  type HeatLegendProps,
} from 'src/react/Legend';
export { SensorCards, type SensorCardsProps } from 'src/react/SensorCards';
export { FloorPicker, type FloorPickerProps } from 'src/react/FloorPicker';
export { Toolbar, type ToolbarProps } from 'src/react/Toolbar';
export { ObjectPanel, type ObjectPanelProps } from 'src/react/ObjectPanel';
export { HelpPanel, type HelpPanelProps } from 'src/react/HelpPanel';
export {
  DirectoryPicker,
  type DirectoryPickerProps,
} from 'src/react/DirectoryPicker';

// `BimCanvas` is deliberately not re-exported here. `BuildingModels` reaches
// it through a dynamic import so three.js lands in its own chunk, and a static
// re-export from this file undoes that: the host's main bundle grew by 640 KB
// and the separate chunk vanished. A consumer that genuinely wants the canvas
// alone imports it from its own path.
export type { BimCanvasProps } from 'src/react/BimCanvas';
export {
  contentsUrl,
  fileUrl,
  formatSize,
  pairModels,
  readIfcName,
  readableName,
  uniqueNames,
  type BimModel,
  type LibraryEntry,
} from 'src/react/assets';
export { objectsOf, type BimObject } from 'src/react/scene';
export { default as exportGlb } from 'src/react/exportGlb';
