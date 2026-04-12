import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { envSchema } from "../config/env.js";
import { registerPlugins } from "../plugins/index.js";
import { registerRoutes } from "../plugins/routes.js";

export const buildApp = async () => {
  const env = envSchema.parse(process.env);

  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            level: env.LOG_LEVEL,
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:standard"
              }
            }
          }
        : {
            level: env.LOG_LEVEL
          }
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await registerPlugins(app, env);
  await registerRoutes(app);

  return app;
};
