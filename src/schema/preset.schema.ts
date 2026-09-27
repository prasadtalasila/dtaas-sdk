import { z } from 'zod';
import { nonEmpty } from 'src/schema/common.schema';
import { encodingSchema } from 'src/schema/encoding.schema';

/** Lowercase segments separated by dots, e.g. `bim.thermal-comfort`. */
const PRESET_ID = /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/;

/** A named, domain-typed bundle of encodings a user can pick. */
export const encodingPresetSchema = z.object({
  id: z.string().regex(PRESET_ID),
  label: nonEmpty,
  description: z.string().optional(),
  substrate: nonEmpty,
  encodings: z
    .array(z.object({ target: nonEmpty, encoding: encodingSchema }))
    .min(1),
});

export default encodingPresetSchema;
