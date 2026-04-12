import type { FastifyInstance } from "fastify";
import { IdentityService } from "../identity/identity.service.js";
import { PrismaIdentityRepository } from "../identity/identity.repository.js";
import { ClerkWebhookController } from "./clerk.controller.js";
import { clerkWebhookRouteSchema } from "./clerk.schemas.js";
import { ClerkWebhookService } from "./clerk.service.js";

export const registerClerkWebhookRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const identityRepository = new PrismaIdentityRepository(app.prisma);
  const identityService = new IdentityService(identityRepository);
  const clerkWebhookService = new ClerkWebhookService(identityService);
  const clerkWebhookController = new ClerkWebhookController(clerkWebhookService);

  app.post(
    "/clerk",
    {
      schema: clerkWebhookRouteSchema,
      config: {
        rawBody: true
      }
    },
    clerkWebhookController.handle
  );
};
