import { z } from 'zod';
export const TwakConfigSchema = z.object({
    apiUrl: z.string().default('http://127.0.0.1:3000'),
    password: z.string().optional(),
});
//# sourceMappingURL=twak-config.js.map