import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { localeHeaderSchema } from "./locale-header-schema.js";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("rallies-backend"),
  version: z.literal("0.1.0")
});

export const registerHealthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        headers: localeHeaderSchema,
        response: {
          200: healthResponseSchema
        }
      }
    },
    async () => {
      return {
        status: "ok",
        service: "rallies-backend",
        version: "0.1.0"
      };
    }
  );
};
