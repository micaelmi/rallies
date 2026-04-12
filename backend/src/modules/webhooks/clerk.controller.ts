import type { FastifyReply, FastifyRequest } from "fastify";
import type { ClerkWebhookService } from "./clerk.service.js";

export class ClerkWebhookController {
  public constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  public handle = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.clerkWebhookService.handle({
      headers: request.headers,
      rawBody: request.rawBody,
      signingSecret: request.server.config.CLERK_WEBHOOK_SIGNING_SECRET
    });

    request.log.info(
      {
        eventType: result.eventType,
        action: result.action
      },
      "clerk_webhook_processed"
    );

    return reply.status(200).send(result);
  };
}
