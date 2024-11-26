import { z } from 'zod';

export const configSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3333'),
  API_URL: z.string().url(),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  FIREBASE_ADMIN_CREDENTIALS: z.string(),
});

export type AppConfig = z.infer<typeof configSchema>;
