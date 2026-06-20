import { z } from 'zod';
export declare const TwakConfigSchema: z.ZodObject<{
    apiUrl: z.ZodDefault<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type TwakConfig = z.infer<typeof TwakConfigSchema>;
//# sourceMappingURL=twak-config.d.ts.map