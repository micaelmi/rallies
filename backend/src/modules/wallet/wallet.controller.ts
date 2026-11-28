import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import type { WalletService } from "./wallet.service.js";
import type { WalletHistoryQuery } from "./wallet.types.js";

type WalletHistoryRequest = FastifyRequest<{
  Querystring: WalletHistoryQuery;
}>;

const getAuthenticatedUserId = (request: FastifyRequest): string => {
  const userId = request.authUser?.userId;

  if (!userId) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      messageKey: "errors.auth.authentication_required",
      statusCode: 401
    });
  }

  return userId;
};

export class WalletController {
  public constructor(private readonly walletService: WalletService) {}

  public getBalance = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.walletService.getBalance(
      getAuthenticatedUserId(request)
    );

    return reply.status(200).send(result);
  };

  public getHistory = async (
    request: WalletHistoryRequest,
    reply: FastifyReply
  ) => {
    const result = await this.walletService.getHistory(
      getAuthenticatedUserId(request),
      request.query
    );

    return reply.status(200).send(result);
  };
}
