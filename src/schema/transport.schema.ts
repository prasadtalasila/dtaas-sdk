import { z } from 'zod';
import { channelSchema, nonEmpty } from 'src/schema/common.schema';

const channel = channelSchema.optional();
const names = z.array(nonEmpty).min(1);

const mqtt = z.object({
  adapter: z.literal('mqtt'),
  url: nonEmpty,
  topics: names,
  channel,
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

const stomp = z.object({
  adapter: z.literal('stomp'),
  url: nonEmpty,
  destinations: names,
  channel,
});

const thingsboard = z.object({
  adapter: z.literal('thingsboard'),
  url: nonEmpty,
  entityIds: names,
  keys: names.optional(),
  channel,
});

const influx = z.object({
  adapter: z.literal('influx'),
  url: nonEmpty.optional(),
  org: nonEmpty,
  bucket: nonEmpty,
  measurement: nonEmpty.optional(),
  role: z.literal('history').optional(),
});

const http = z.object({
  adapter: z.literal('http'),
  url: nonEmpty,
  method: z.enum(['GET', 'POST']).optional(),
  intervalMs: z.number().positive().optional(),
  channel,
});

const file = z.object({
  adapter: z.literal('file'),
  url: nonEmpty,
  format: z.enum(['csv', 'parquet', 'json']).optional(),
  channel,
});

/** Where a visualisation's signals come from (layer 1), per the installed stack. */
export const transportSchema = z.discriminatedUnion('adapter', [
  mqtt,
  stomp,
  thingsboard,
  influx,
  http,
  file,
]);

export default transportSchema;
