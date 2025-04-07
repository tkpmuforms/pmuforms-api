import { z } from 'zod';

export const configSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3333'),
  API_URL: z.string().url(),

  //DB
  MONGO_URI: z.string(),

  // JWT auth
  JWT_SECRET: z.string(),

  // bitly
  BITLY_BASE_URL: z.string().url(),
  BITLY_TOKEN: z.string(),

  // web client
  CLIENT_BASE_URL: z.string().url(),

  // email
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform((val) => parseInt(val)),
  SMTP_USERNAME: z.string(),
  SMTP_PASSWORD: z.string(),

  CONTACT_US_EMAIL: z.string(),

  FIREBASE_SERVICE_ACCOUNT_JSON: z.string(),
});

export type AppConfig = z.infer<typeof configSchema>;
