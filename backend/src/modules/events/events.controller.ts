import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../shared/errors/app-error.js";
import type { EventsService } from "./events.service.js";
import type {
  BoostEventInput,
  CreateEventDraftInput,
  PublishEventInput,
  SearchEventsFilters
} from "./events.types.js";

type SearchEventsRequest = FastifyRequest<{
  Querystring: SearchEventsFilters;
}>;

type EventIdRequest = FastifyRequest<{
  Params: { id: string };
}>;

type CreateEventDraftRequest = FastifyRequest<{
  Body: CreateEventDraftInput;
}>;

type PublishEventRequest = FastifyRequest<{
  Params: { id: string };
  Body: PublishEventInput;
}>;

type BoostEventRequest = FastifyRequest<{
  Params: { id: string };
  Body: BoostEventInput;
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

export class EventsController {
  public constructor(private readonly eventsService: EventsService) {}

  public searchEvents = async (
    request: SearchEventsRequest,
    reply: FastifyReply
  ) => {
    const result = await this.eventsService.searchEvents(
      request.query,
      request.authUser?.userId
    );
    return reply.status(200).send(result);
  };

  public getEventById = async (
    request: EventIdRequest,
    reply: FastifyReply
  ) => {
    const result = await this.eventsService.getEventById(
      request.params.id,
      request.authUser?.userId
    );
    return reply.status(200).send(result);
  };

  public createDraft = async (
    request: CreateEventDraftRequest,
    reply: FastifyReply
  ) => {
    const result = await this.eventsService.createDraft(
      getAuthenticatedUserId(request),
      request.body
    );

    return reply.status(201).send(result);
  };

  public publishEvent = async (
    request: PublishEventRequest,
    reply: FastifyReply
  ) => {
    const result = await this.eventsService.publishEvent(
      request.params.id,
      getAuthenticatedUserId(request),
      request.body.idempotencyKey
    );

    return reply.status(200).send(result);
  };

  public boostEvent = async (
    request: BoostEventRequest,
    reply: FastifyReply
  ) => {
    const result = await this.eventsService.boostEvent(
      request.params.id,
      getAuthenticatedUserId(request),
      request.body.durationDays,
      request.body.idempotencyKey
    );

    return reply.status(200).send(result);
  };
}
