import type { ZodType } from 'zod';
import {
  type EnvRecord,
  readExtensionConfig,
} from 'src/extension/extensionConfig';
import type { HostServices } from 'src/host/hostServices.types';
import type {
  LibraryService,
  Logger,
  SnackbarSeverity,
  User,
} from 'src/host/platform.types';
import type { TbEntity } from 'src/visualisation/digitalTwin.types';
import FakePage from 'src/testing/FakePage';
import createFakeSignals, { type FakeSignals } from 'src/testing/fakeSignals';
import createFakeViz, {
  type FakeVizOptions,
  type RecordedSave,
} from 'src/testing/fakeViz';
import createMemoryContents, {
  type MemoryContents,
} from 'src/testing/memoryContents';
import createMemoryGit, { type GitRecord } from 'src/testing/memoryGit';

export interface FakeHostOptions {
  /** Whose `REACT_APP_EXT_<ID>_*` keys `config()` reads. Default `test`. */
  readonly extensionId?: string;
  readonly env?: EnvRecord;
  /** The signed-in user; `null` for signed out. Default `{ username: 'user' }`. */
  readonly user?: User | null;
  readonly baseUrl?: string;
  readonly now?: () => number;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly files?: Record<string, Uint8Array | string>;
  readonly entities?: readonly TbEntity[];
  readonly viz?: FakeVizOptions;
  /** Replace whole services, e.g. with jest mocks. */
  readonly overrides?: Partial<HostServices>;
}

type LogLevel = keyof Logger;

export interface Recorded extends GitRecord {
  readonly snackbars: { message: string; severity: SnackbarSeverity }[];
  readonly logs: { level: LogLevel; args: unknown[] }[];
  readonly savedAssets: RecordedSave[];
}

export interface FakeHostServices extends HostServices {
  readonly signals: FakeSignals;
  readonly contents: MemoryContents;
  readonly recorded: Recorded;
}

const createLibrary = (baseUrl: string): LibraryService => ({
  baseUrl: async () => baseUrl,
  useBaseUrl: () => baseUrl,
  conventions: {
    modelsDirectory: 'common/models',
    digitalTwinsDirectory: 'digital_twins',
    visualisationsDirectory: 'common/visualisations',
  },
  resolve: async (url) =>
    url.startsWith('lib://') ? `${baseUrl}/${url.slice(6)}` : url,
});

const createLogger = (recorded: Recorded): Logger => {
  const log =
    (level: LogLevel) =>
    (...args: unknown[]) =>
      recorded.logs.push({ level, args });
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
};

const createConfig =
  (id: string, env: EnvRecord) =>
  <T>(schema: ZodType<T>): T => {
    const result = readExtensionConfig(id, schema, env);
    if (result.success) return result.data;
    throw new Error(
      `Invalid configuration for extension "${id}": ${result.error.message}`,
    );
  };

const createAuth = (user: User | null) => ({
  useUser: () => user,
  user: async () => {
    if (!user) throw new Error('Not signed in');
    return user;
  },
});

const createRecorded = (): Recorded => ({
  snackbars: [],
  logs: [],
  commits: [],
  mergeRequests: [],
  savedAssets: [],
});

const createUi = (recorded: Recorded) => ({
  Page: FakePage,
  snackbar: (message: string, severity: SnackbarSeverity) => {
    recorded.snackbars.push({ message, severity });
  },
});

const createSettings = (settings: Readonly<Record<string, unknown>> = {}) => ({
  get: <T>(key: string) => settings[key] as T | undefined,
});

/** A complete, in-memory `HostServices` for testing a kit without DTaaS. */
const fakeHostServices = (options: FakeHostOptions = {}): FakeHostServices => {
  const recorded = createRecorded();
  const user = options.user === undefined ? { username: 'user' } : options.user;
  const { now, entities } = options;
  return {
    auth: createAuth(user),
    library: createLibrary(options.baseUrl ?? 'https://dtaas.example/lib'),
    contents: createMemoryContents(options.files),
    git: createMemoryGit(recorded),
    signals: createFakeSignals({ now, entities }),
    viz: createFakeViz(options.viz, recorded.savedAssets),
    ui: createUi(recorded),
    logger: createLogger(recorded),
    settings: createSettings(options.settings),
    config: createConfig(options.extensionId ?? 'test', options.env ?? {}),
    recorded,
    ...options.overrides,
  } as FakeHostServices;
};

export default fakeHostServices;
