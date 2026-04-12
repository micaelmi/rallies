import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3344),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().min(1),
  SWAGGER_BASE_URL: z.url().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1).optional()
});

export type AppEnv = z.infer<typeof envSchema>;
