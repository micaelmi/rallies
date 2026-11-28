import type { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  boostEventBodySchema,
  createEventDraftSchema,
  eventRecordSchema,
  publishEventBodySchema,
  searchEventsQuerySchema,
  searchEventsResponseSchema
} from "./events.schemas.js";

export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "ARCHIVED"
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_PUBLISH_COST = 30;
export const EVENT_BOOST_COST = 25;

export class EventNotFoundError extends AppError {
  public constructor(eventId: string) {
    super({
      code: "EVENT_NOT_FOUND",
      messageKey: "errors.events.not_found",
      statusCode: 404,
      details: { eventId }
    });
    this.name = "EventNotFoundError";
  }
}

export class UnauthorizedEventActionError extends AppError {
  public constructor(details?: Record<string, unknown>) {
    super({
      code: "UNAUTHORIZED_EVENT_ACTION",
      messageKey: "errors.events.unauthorized_action",
      statusCode: 403,
      ...(details ? { details } : {})
    });
    this.name = "UnauthorizedEventActionError";
  }
}

export class InvalidEventStateError extends AppError {
  public constructor(currentStatus: EventStatus, requiredStatus: EventStatus) {
    super({
      code: "INVALID_EVENT_STATE",
      messageKey: "errors.events.invalid_state",
      statusCode: 409,
      details: { currentStatus, requiredStatus }
    });
    this.name = "InvalidEventStateError";
  }
}

export type CreateEventDraftInput = z.infer<typeof createEventDraftSchema>;
export type SearchEventsFilters = z.infer<typeof searchEventsQuerySchema>;
export type PublishEventInput = z.infer<typeof publishEventBodySchema>;
export type BoostEventInput = z.infer<typeof boostEventBodySchema>;
export type EventRecord = z.infer<typeof eventRecordSchema>;
export type SearchEventsResponse = z.infer<typeof searchEventsResponseSchema>;

export interface EventsRepository {
  create(ownerId: string, data: CreateEventDraftInput): Promise<EventRecord>;
  findById(eventId: string): Promise<EventRecord | null>;
  search(
    filters: SearchEventsFilters,
    requesterUserId?: string
  ): Promise<SearchEventsResponse>;
  updateStatus(eventId: string, status: EventStatus): Promise<EventRecord>;
  markBoosted(eventId: string, boostedUntil: Date): Promise<EventRecord>;
}
