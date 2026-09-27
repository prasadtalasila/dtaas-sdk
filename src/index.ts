// Constants
export {
  CHANNELS,
  EXTENSION_ENV_PREFIX,
  EXTENSIONS_DISABLED_KEY,
  RESERVED_EXTENSION_IDS,
  SDK_MAJOR,
  STANDARD_ANCHOR_KINDS,
  STANDARD_SUBSTRATES,
} from 'src/extension/constants';

// Extension helpers
export { default as defineExtension } from 'src/extension/defineExtension';
export {
  envPrefix,
  isExtensionDisabled,
  readExtensionConfig,
} from 'src/extension/extensionConfig';
export type { EnvRecord } from 'src/extension/extensionConfig';
export { isLazyComponent, isLazyLoader } from 'src/extension/lazy';
export { default as validateExtension } from 'src/extension/validateExtension';
export type {
  ValidateOptions,
  ValidationResult,
} from 'src/extension/validateExtension';

// Extension contract
export type {
  AssetPreview,
  AssetPreviewProps,
  DigitalTwinTab,
  DigitalTwinTabProps,
  DtaasExtension,
  ExtensionAction,
  ExtensionConfigSpec,
  ExtensionReducer,
  ExtensionRoute,
  LazyPage,
  NavigationItem,
} from 'src/extension/extension.types';

// Host services
export { HostProvider, useHost } from 'src/host/HostProvider';
export type { HostProviderProps } from 'src/host/HostProvider';
export type { HostServices } from 'src/host/hostServices.types';
export type {
  AuthService,
  LibraryConventions,
  LibraryService,
  Logger,
  PageProps,
  SettingsService,
  SnackbarSeverity,
  UiService,
  User,
} from 'src/host/platform.types';
export type {
  CommitResult,
  ContentsEntry,
  ContentsService,
  FileChange,
  GitService,
  MergeRequestResult,
  PutOptions,
} from 'src/host/storage.types';
export type {
  Playhead,
  SaveOptions,
  SignalRegistry,
  SignalsService,
  SubstrateRegistry,
  VizService,
} from 'src/host/visualisation.types';

// Visualisation layers
export type {
  Channel,
  Sampled,
  SignalQuality,
  SignalSample,
  SignalSink,
  SignalValue,
  TransportAdapter,
} from 'src/visualisation/signal.types';
export type {
  Anchor,
  AnchorKind,
  StandardAnchorKind,
} from 'src/visualisation/anchor.types';
export type {
  Encoding,
  EncodingType,
  ResolvedEncoding,
} from 'src/visualisation/encoding.types';
export type {
  ElementRef,
  FrameOptions,
  SubstrateAdapter,
  SubstrateAdapterFactory,
  SubstrateDescriptor,
} from 'src/visualisation/substrate.types';
export type {
  AnchorKindSpec,
  Converter,
  ConverterInput,
  ConverterOutput,
  ConverterSpec,
  DomainContribution,
  EncodingPreset,
  FieldGrid,
  FieldKernel,
  FieldKernelSpec,
  FieldSample,
  InspectorPanelProps,
  LazyModule,
  LazySubstrateAdapterSpec,
  ScopeContext,
  ScopeRule,
} from 'src/visualisation/contribution.types';
export type {
  DigitalTwinSummary,
  TbEntity,
} from 'src/visualisation/digitalTwin.types';
export type { VisualisationAsset } from 'src/visualisation/asset.types';
