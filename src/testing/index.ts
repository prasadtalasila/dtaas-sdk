// Host services
export { default as fakeHostServices } from 'src/testing/fakeHostServices';
export type {
  FakeHostOptions,
  FakeHostServices,
  Recorded,
} from 'src/testing/fakeHostServices';
export { default as createFakeSignals } from 'src/testing/fakeSignals';
export type { FakeSignals, FakeSignalsOptions } from 'src/testing/fakeSignals';
export type { FakePlayhead } from 'src/testing/fakePlayhead';
export type { FakeConnection } from 'src/testing/fakeConnection';
export { default as createFakeViz } from 'src/testing/fakeViz';
export type { FakeVizOptions, RecordedSave } from 'src/testing/fakeViz';
export { default as createMemoryContents } from 'src/testing/memoryContents';
export type { MemoryContents } from 'src/testing/memoryContents';
export { default as createMemoryGit } from 'src/testing/memoryGit';
export type {
  GitRecord,
  RecordedCommit,
  RecordedMergeRequest,
} from 'src/testing/memoryGit';

// Rendering and replay
export { default as renderWithHost } from 'src/testing/renderWithHost';
export type { RenderWithHostOptions } from 'src/testing/renderWithHost';
export { default as replayFixture } from 'src/testing/replayFixture';
export type { ReplayFrame, ReplayOptions } from 'src/testing/replayFixture';

// Conformance
export { default as checkConformance } from 'src/testing/checkConformance';
export type {
  ConformanceOptions,
  ConformanceReport,
} from 'src/testing/checkConformance';
export {
  default as installSocketGuard,
  SocketBlockedError,
} from 'src/testing/socketGuard';
export type { SocketGuard } from 'src/testing/socketGuard';
