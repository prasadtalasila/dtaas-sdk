import type { SaveOptions, VizService } from 'src/host/visualisation.types';
import { visualisationAssetSchema } from 'src/schema/visualisation.schema';
import type { VisualisationAsset } from 'src/visualisation/asset.types';
import type {
  AnchorKindSpec,
  EncodingPreset,
} from 'src/visualisation/contribution.types';
import type { DigitalTwinSummary } from 'src/visualisation/digitalTwin.types';
import type { SubstrateAdapter } from 'src/visualisation/substrate.types';

export interface FakeVizOptions {
  readonly substrates?: Readonly<Record<string, SubstrateAdapter>>;
  readonly anchorKinds?: readonly AnchorKindSpec[];
  readonly presets?: readonly EncodingPreset[];
}

export interface RecordedSave {
  readonly dt: DigitalTwinSummary;
  readonly asset: VisualisationAsset;
  readonly options?: SaveOptions;
}

const issuesOf = (asset: unknown) => {
  const result = visualisationAssetSchema.safeParse(asset);
  return result.success
    ? undefined
    : result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
};

/** Stores `visualisation.json` assets per twin, validating like the host. */
const createFakeViz = (
  options: FakeVizOptions = {},
  saved: RecordedSave[] = [],
): VizService => {
  const assets = new Map<string, VisualisationAsset>();
  const substrates = options.substrates ?? {};
  return {
    anchorKinds: options.anchorKinds ?? [],
    presets: options.presets ?? [],
    load: async (dt) => assets.get(dt.path) ?? null,
    save: async (dt, asset, saveOptions) => {
      const issues = issuesOf(asset);
      if (issues) throw new Error(`Invalid visualisation asset: ${issues}`);
      assets.set(dt.path, asset);
      saved.push({ dt, asset, options: saveOptions });
    },
    substrates: {
      list: () => Object.keys(substrates),
      get: async (id) => {
        const adapter = substrates[id];
        if (!adapter) throw new Error(`Unknown substrate: ${id}`);
        return adapter;
      },
    },
  };
};

export default createFakeViz;
