import type { FastifyInstance } from "fastify";
import { WalletController } from "./wallet.controller.js";
import { PrismaWalletRepository } from "./wallet.repository.js";
import {
  getWalletBalanceRouteSchema,
  getWalletHistoryRouteSchema
} from "./wallet.schemas.js";
import { WalletService } from "./wallet.service.js";

export const registerWalletRoutes = async (
  app: FastifyInstance
): Promise<void> => {
  const walletRepository = new PrismaWalletRepository(app.prisma);
  const walletService = new WalletService(walletRepository);
  const walletController = new WalletController(walletService);

  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.requireAuth);

    protectedApp.get(
      "/balance",
      {
        schema: getWalletBalanceRouteSchema
      },
      walletController.getBalance
    );

    protectedApp.get(
      "/history",
      {
        schema: getWalletHistoryRouteSchema
      },
      walletController.getHistory
    );
  });
};
