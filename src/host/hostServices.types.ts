import type { ZodType } from 'zod';
import type {
  AuthService,
  LibraryService,
  Logger,
  SettingsService,
  UiService,
} from 'src/host/platform.types';
import type { ContentsService, GitService } from 'src/host/storage.types';
import type { SignalsService, VizService } from 'src/host/visualisation.types';

/**
 * Everything an extension may use from the host. The host creates one
 * instance per extension so that `config()` reads that extension's keys.
 */
export interface HostServices {
  readonly auth: AuthService;
  readonly library: LibraryService;
  readonly contents: ContentsService;
  readonly git: GitService;
  readonly signals: SignalsService;
  readonly viz: VizService;
  readonly ui: UiService;
  readonly logger: Logger;
  readonly settings: SettingsService;
  /** Parse this extension's `REACT_APP_EXT_<ID>_*` keys; throws if invalid. */
  config<T>(schema: ZodType<T>): T;
}
