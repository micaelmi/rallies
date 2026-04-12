import type { PrismaClient } from "@prisma/client";
import type { AppEnv } from "../config/env.js";
import type { SupportedLocale } from "../shared/i18n/locale-context.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnv;
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    locale: SupportedLocale;
    rawBody?: string;
  }
}
