import { z } from 'zod';

/** `REACT_APP_EXT_BIM_*` keys: `MODELS_DIRECTORY` overrides the host's models folder. */
const configSchema = z.object({
  modelsDirectory: z.string().min(1).optional(),
});

export type BimConfig = z.infer<typeof configSchema>;
export default configSchema;
