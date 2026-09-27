import { z } from 'zod';
import { nonEmpty, pointSchema } from 'src/schema/common.schema';

const MIN_HOMOGRAPHY_POINTS = 4;

/** Maps image coordinates onto world coordinates for image substrates. */
export const calibrationSchema = z
  .object({
    type: z.literal('homography'),
    id: nonEmpty,
    imagePoints: z.array(pointSchema).min(MIN_HOMOGRAPHY_POINTS),
    worldPoints: z.array(pointSchema).min(MIN_HOMOGRAPHY_POINTS),
    units: z.enum(['m', 'cm', 'mm', 'px']).optional(),
    reprojectionError: z.number().nonnegative().optional(),
  })
  .refine((c) => c.imagePoints.length === c.worldPoints.length, {
    path: ['worldPoints'],
    message: 'imagePoints and worldPoints must have the same length',
  });

/** One pane's substrate: which adapter renders what source. */
export const substrateDescriptorSchema = z.object({
  adapter: nonEmpty,
  source: nonEmpty.optional(),
  calibration: calibrationSchema.optional(),
  latencyHintMs: z.number().nonnegative().optional(),
  timeParams: z.tuple([nonEmpty, nonEmpty]).optional(),
  independent: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
