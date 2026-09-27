// Shared building blocks
export {
  channelSchema,
  domainSchema,
  pointSchema,
} from 'src/schema/common.schema';

// Layer 1: transports
export { transportSchema } from 'src/schema/transport.schema';

// Layer 3: anchors
export { anchorSchema } from 'src/schema/anchor.schema';

// Layer 4: encodings and presets
export { encodingSchema } from 'src/schema/encoding.schema';
export { encodingPresetSchema } from 'src/schema/preset.schema';

// Layer 5: substrates
export {
  calibrationSchema,
  substrateDescriptorSchema,
} from 'src/schema/substrate.schema';

// visualisation.json
export {
  parseVisualisationAsset,
  visualisationAssetSchema,
} from 'src/schema/visualisation.schema';
