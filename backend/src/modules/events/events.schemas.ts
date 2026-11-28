import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import { EVENT_STATUSES } from "./events.types.js";

export const eventAuthenticatedHeadersSchema = localeHeaderSchema.extend({
  authorization: z.string().min(1).optional()
});

export const EventStatusEnum = z.enum(EVENT_STATUSES);

export const createEventDraftSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(1).max(4000),
    clubId: z.string().trim().min(1).max(191).optional(),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(1).max(120).optional(),
    country: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(255),
    imageUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .optional(),
    mapsUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .optional(),
    registrationUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .optional(),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime()
  })
  .strict()
  .refine((value) => Date.parse(value.endDate) >= Date.parse(value.startDate), {
    message: "endDate must be on or after startDate.",
    path: ["endDate"]
  });

export const searchEventsQuerySchema = z
  .object({
    location: z.string().trim().min(1).max(120).optional(),
    status: EventStatusEnum.optional(),
    boostedOnly: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict();

export const eventIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(191)
});

export const publishEventBodySchema = z
  .object({
    idempotencyKey: z.uuid({ version: "v4" })
  })
  .strict();

export const boostEventBodySchema = z
  .object({
    durationDays: z.number().int().min(1).max(30).default(7),
    idempotencyKey: z.uuid({ version: "v4" })
  })
  .strict();

export const eventRecordSchema = z.object({
  id: z.string(),
  clubId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  address: z.string(),
  mapsUrl: z.string().nullable(),
  startAt: z.date(),
  endAt: z.date(),
  registrationUrl: z.string().nullable(),
  createdById: z.string(),
  status: EventStatusEnum,
  isBoosted: z.boolean(),
  boostedUntil: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const searchEventsResponseSchema = z.object({
  items: z.array(eventRecordSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

const protectedEventsRouteBaseSchema = {
  tags: ["events"],
  headers: eventAuthenticatedHeadersSchema,
  security: [{ bearerAuth: [] }]
};

export const searchEventsRouteSchema = {
  tags: ["events"],
  headers: localeHeaderSchema,
  summary: "Discover tournaments and events",
  description:
    "Publicly lists published events filtered by location and boost status, prioritizing boosted events.",
  querystring: searchEventsQuerySchema,
  response: {
    200: searchEventsResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getEventByIdRouteSchema = {
  tags: ["events"],
  headers: localeHeaderSchema,
  summary: "Get event details",
  description: "Returns a published event's details.",
  params: eventIdParamsSchema,
  response: {
    200: eventRecordSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const createEventDraftRouteSchema = {
  ...protectedEventsRouteBaseSchema,
  summary: "Create a draft event",
  description:
    "Creates an unpublished event draft owned by the authenticated organizer.",
  body: createEventDraftSchema,
  response: {
    201: eventRecordSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const publishEventRouteSchema = {
  ...protectedEventsRouteBaseSchema,
  summary: "Publish a draft event",
  description:
    "Consumes wallet credits idempotently and transitions an organizer's draft event to PUBLISHED.",
  params: eventIdParamsSchema,
  body: publishEventBodySchema,
  response: {
    200: eventRecordSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const boostEventRouteSchema = {
  ...protectedEventsRouteBaseSchema,
  summary: "Boost a published event",
  description:
    "Consumes wallet credits idempotently and boosts a published event to the top of discovery listings.",
  params: eventIdParamsSchema,
  body: boostEventBodySchema,
  response: {
    200: eventRecordSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};
