import { z } from 'zod';

export const TwakConfigSchema = z.object({
  apiUrl: z.string().default('http://127.0.0.1:3000'),
  password: z.string().optional(),
});

export type TwakConfig = z.infer<typeof TwakConfigSchema>;
