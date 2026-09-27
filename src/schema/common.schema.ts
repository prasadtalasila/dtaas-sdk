import { z } from 'zod';
import { CHANNELS } from 'src/extension/constants';

export const channelSchema = z.enum(CHANNELS);

export const nonEmpty = z.string().min(1);

/** A `[min, max]` numeric interval. */
export const domainSchema = z.tuple([z.number(), z.number()]);

/** A 2D point in image or world coordinates. */
export const pointSchema = z.tuple([z.number(), z.number()]);
