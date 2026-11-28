import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import type { BillingService } from "./billing.service.js";
import type {
  CreateCheckoutSessionInput,
  SyncCheckoutSessionParams
} from "./billing.types.js";

type CreateCheckoutSessionRequest = FastifyRequest<{
  Body: CreateCheckoutSessionInput;
}>;

type SyncCheckoutSessionRequest = FastifyRequest<{
  Params: SyncCheckoutSessionParams;
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

export class BillingController {
  public constructor(private readonly billingService: BillingService) {}

  public listPackages = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      packages: this.billingService.listPackages()
    });
  };

  public createCheckoutSession = async (
    request: CreateCheckoutSessionRequest,
    reply: FastifyReply
  ) => {
    const result = await this.billingService.createCheckoutSession(
      getAuthenticatedUserId(request),
      request.body.priceId
    );

    return reply.status(201).send(result);
  };

  public syncCheckoutSession = async (
    request: SyncCheckoutSessionRequest,
    reply: FastifyReply
  ) => {
    const userId = getAuthenticatedUserId(request);
    const result = await this.billingService.syncCheckoutSession(
      userId,
      request.params.sessionId
    );

    request.log.info(
      {
        userId,
        sessionId: request.params.sessionId,
        status: result.status,
        balance: result.balance
      },
      "billing_checkout_session_synced"
    );

    return reply.status(200).send(result);
  };

  public handleStripeWebhook = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const signatureHeader = request.headers["stripe-signature"];
    const signature =
      typeof signatureHeader === "string"
        ? signatureHeader
        : Array.isArray(signatureHeader)
          ? signatureHeader[0]
          : undefined;

    const result = await this.billingService.verifyAndProcessWebhook(
      request.rawBody,
      signature
    );

    request.log.info(
      {
        eventType: result.eventType,
        action: result.action
      },
      "billing_stripe_webhook_processed"
    );

    return reply.status(200).send(result);
  };
}
