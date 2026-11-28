import type { FastifyInstance } from "fastify";
import { PrismaWalletRepository } from "../wallet/wallet.repository.js";
import { WalletService } from "../wallet/wallet.service.js";
import { ClubsController } from "./clubs.controller.js";
import { PrismaClubsRepository } from "./clubs.repository.js";
import {
  createClubRouteSchema,
  getClubByIdRouteSchema,
  joinClubRouteSchema,
  searchClubsRouteSchema,
  updateClubMemberRouteSchema
} from "./clubs.schemas.js";
import { ClubsService } from "./clubs.service.js";

export const registerClubsRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const clubsRepository = new PrismaClubsRepository(app.prisma);
  const walletRepository = new PrismaWalletRepository(app.prisma);
  const walletService = new WalletService(walletRepository);
  const clubsService = new ClubsService(clubsRepository, walletService);
  const clubsController = new ClubsController(clubsService);

  app.get(
    "/",
    {
      schema: searchClubsRouteSchema
    },
    clubsController.searchClubs
  );

  app.get(
    "/:id",
    {
      schema: getClubByIdRouteSchema
    },
    clubsController.getClubById
  );

  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);

    protectedApp.post(
      "/",
      {
        schema: createClubRouteSchema
      },
      clubsController.createClub
    );

    protectedApp.post(
      "/:id/join",
      {
        schema: joinClubRouteSchema
      },
      clubsController.requestMembership
    );

    protectedApp.put(
      "/:id/members/:userId",
      {
        schema: updateClubMemberRouteSchema
      },
      clubsController.updateMember
    );
  });
};
