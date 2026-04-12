import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import rawBody from "fastify-raw-body";
import type { AppEnv } from "../config/env.js";
import { errorHandlerPlugin } from "./error-handler.js";
import { localeContextPlugin } from "./locale-context.js";
import { prismaPlugin } from "./prisma.js";
import { swaggerPlugin } from "./swagger.js";

export const registerPlugins = async (app: FastifyInstance, env: AppEnv): Promise<void> => {
  app.decorate("config", env);

  await app.register(cors, {
    origin: true
  });

  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true
  });

  await app.register(sensible);
  await app.register(swaggerPlugin);
  await app.register(prismaPlugin);
  await app.register(localeContextPlugin);
  await app.register(errorHandlerPlugin);
};
