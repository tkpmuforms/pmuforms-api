import { z } from 'zod';

export const configSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3333'),
  API_URL: z.string().url(),

  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),

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

  REVENUECAT_APP_ID: z.string(),
  REVENUECAT_API_KEY: z.string(),
  REVENUECAT_WEBHOOK_SECRET: z.string(),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
});

export type AppConfig = z.infer<typeof configSchema>;
