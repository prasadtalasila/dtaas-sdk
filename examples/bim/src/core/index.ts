export const BIM_EXTENSION_ID = 'bim';

export {
  objectOf,
  topicOf,
  displayOf,
  idOf,
  GLOBAL_ID_PATTERN,
  type Binding,
  type Display,
  type Selector,
} from 'src/core/binding';

export {
  resolveBindings,
  topicsOf,
  bindingsByTopic,
  type Resolved,
  type Unresolved,
  type ResolveResult,
  type SceneObject,
} from 'src/core/resolver';

export { rampColour, RAMP_STOPS } from 'src/core/ramp';

export {
  IFC_HEAD_BYTES,
  decodeStepString,
  entityArguments,
  ifcBuildingName,
  usableName,
} from 'src/core/ifcName';

export {
  alertsOf,
  alertCounts,
  MEASURED_KIND,
  type Alert,
  type AlertLevel,
} from 'src/core/alerts';

export {
  bandsFrom,
  bandOf,
  MERGE_WITHIN_M,
  FLOOR_MARGIN_M,
  type Band,
  type ObjectBase,
} from 'src/core/storeys';

export {
  ageOf,
  ageText,
  isLive,
  zoneOf,
  availableScopes,
  ALL_SCOPES,
  DEFAULT_STALE_AFTER_S,
  type FeedState,
  type HeatScope,
  type Reading,
} from 'src/core/readings';

export { zonesOf, type Zones } from 'src/core/zones';

export { normaliseLibraryPath } from 'src/core/libraryPath';
