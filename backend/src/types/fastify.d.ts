import type { PrismaClient } from "@prisma/client";
import type { preHandlerHookHandler } from "fastify";
import type { AppEnv } from "../config/env.js";
import type { SupportedLocale } from "../shared/i18n/locale-context.js";

export type AuthUser = {
  userId: string;
  clerkUserId: string;
};

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnv;
    prisma: PrismaClient;
    requireAuth: preHandlerHookHandler;
  }

  interface FastifyRequest {
    locale: SupportedLocale;
    rawBody?: string | Buffer;
    authUser?: AuthUser;
  }
}
