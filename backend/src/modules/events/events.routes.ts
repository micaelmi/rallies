import type { FastifyInstance } from "fastify";
import { PrismaWalletRepository } from "../wallet/wallet.repository.js";
import { WalletService } from "../wallet/wallet.service.js";
import { EventsController } from "./events.controller.js";
import { PrismaEventsRepository } from "./events.repository.js";
import {
  boostEventRouteSchema,
  createEventDraftRouteSchema,
  getEventByIdRouteSchema,
  publishEventRouteSchema,
  searchEventsRouteSchema
} from "./events.schemas.js";
import { EventsService } from "./events.service.js";

export const registerEventsRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const eventsRepository = new PrismaEventsRepository(app.prisma);
  const walletRepository = new PrismaWalletRepository(app.prisma);
  const walletService = new WalletService(walletRepository);
  const eventsService = new EventsService(eventsRepository, walletService);
  const eventsController = new EventsController(eventsService);

  app.get(
    "/",
    {
      schema: searchEventsRouteSchema
    },
    eventsController.searchEvents
  );

  app.get(
    "/:id",
    {
      schema: getEventByIdRouteSchema
    },
    eventsController.getEventById
  );

  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);

    protectedApp.post(
      "/",
      {
        schema: createEventDraftRouteSchema
      },
      eventsController.createDraft
    );

    protectedApp.post(
      "/:id/publish",
      {
        schema: publishEventRouteSchema
      },
      eventsController.publishEvent
    );

    protectedApp.post(
      "/:id/boost",
      {
        schema: boostEventRouteSchema
      },
      eventsController.boostEvent
    );
  });
};
