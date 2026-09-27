import type {
  Channel,
  Sampled,
  SignalSample,
  SignalSink,
} from 'src/visualisation/signal.types';
import type {
  DigitalTwinSummary,
  TbEntity,
} from 'src/visualisation/digitalTwin.types';
import type { VisualisationAsset } from 'src/visualisation/asset.types';
import type { SubstrateAdapter } from 'src/visualisation/substrate.types';
import type {
  AnchorKindSpec,
  EncodingPreset,
} from 'src/visualisation/contribution.types';

/** One clock for every substrate, embedded panel and video element. */
export interface Playhead {
  get(): number;
  set(t: number): void;
  /** `true` keeps the playhead at "now"; setting a time leaves live mode. */
  follow(live: boolean): void;
  /** React hook returning the current playhead time. */
  use(): number;
}

export interface SignalRegistry {
  search(query: string): Promise<TbEntity[]>;
  get(id: string): Promise<TbEntity>;
}

/** Layers 1–2 of the common core. Kits consume, never re-implement. */
export interface SignalsService {
  subscribe(paths: string[], channel: Channel, sink: SignalSink): () => void;
  /** Read at `t` (default: the playhead): latest sample at or before `t`. */
  valueAt(path: string, channel: Channel, t?: number): Sampled | undefined;
  range(
    paths: string[],
    channel: Channel,
    from: number,
    to: number,
  ): Promise<SignalSample[]>;
  readonly playhead: Playhead;
  readonly registry: SignalRegistry;
}

export interface SaveOptions {
  readonly viaMergeRequest?: boolean;
}

export interface SubstrateRegistry {
  get(id: string): Promise<SubstrateAdapter>;
  list(): string[];
}

/** Layers 3–5 of the common core, merged from all kits. */
export interface VizService {
  load(dt: DigitalTwinSummary): Promise<VisualisationAsset | null>;
  save(
    dt: DigitalTwinSummary,
    asset: VisualisationAsset,
    options?: SaveOptions,
  ): Promise<void>;
  readonly substrates: SubstrateRegistry;
  readonly anchorKinds: readonly AnchorKindSpec[];
  readonly presets: readonly EncodingPreset[];
}
