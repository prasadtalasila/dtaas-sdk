import { z } from 'zod';
import { nonEmpty } from 'src/schema/common.schema';

/** Ties a signal to a location on a substrate (layer 3). */
export const anchorSchema = z.object({
  signalPath: nonEmpty,
  kind: nonEmpty,
  ref: nonEmpty,
  label: z.string().optional(),
  homographyId: nonEmpty.optional(),
});

export default anchorSchema;
