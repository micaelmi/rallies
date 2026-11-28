import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import {
  CLUB_MEMBERSHIP_ACTIONS,
  CLUB_MEMBER_ROLES,
  CLUB_MEMBER_STATUSES,
  CLUB_STATUSES
} from "./clubs.types.js";

export const clubAuthenticatedHeadersSchema = localeHeaderSchema.extend({
  authorization: z.string().min(1).optional()
});

export const ClubMemberRoleEnum = z.enum(CLUB_MEMBER_ROLES);
export const ClubMemberStatusEnum = z.enum(CLUB_MEMBER_STATUSES);
export const ClubStatusEnum = z.enum(CLUB_STATUSES);

export const createClubRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    description: z.string().trim().min(1).max(4000),
    email: z.email().max(320),
    phone: z.string().trim().min(1).max(30).optional(),
    instagramUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .optional(),
    country: z.string().trim().min(1).max(120),
    state: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(255),
    mapsUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .optional(),
    maxMembers: z.number().int().positive().max(10000).optional(),
    idempotencyKey: z.uuid({ version: "v4" })
  })
  .strict();

export const searchClubsQuerySchema = z
  .object({
    location: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict();

export const clubIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(191)
});

export const clubMemberParamsSchema = z.object({
  id: z.string().trim().min(1).max(191),
  userId: z.string().trim().min(1).max(191)
});

export const updateClubMemberBodySchema = z
  .object({
    action: z.enum(CLUB_MEMBERSHIP_ACTIONS).optional(),
    role: ClubMemberRoleEnum.optional(),
    status: ClubMemberStatusEnum.optional()
  })
  .strict()
  .refine(
    (value) =>
      value.action !== undefined ||
      value.role !== undefined ||
      value.status !== undefined,
    {
      message: "At least one of action, role, or status must be provided."
    }
  );

export const clubMemberViewSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  userId: z.string(),
  role: ClubMemberRoleEnum,
  status: ClubMemberStatusEnum,
  joinedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const clubSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  country: z.string(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string(),
  ownerId: z.string(),
  status: ClubStatusEnum,
  memberCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const clubDetailResponseSchema = clubSummarySchema.extend({
  email: z.string(),
  phone: z.string().nullable(),
  instagramUrl: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  maxMembers: z.number().int().positive().nullable(),
  members: z.array(clubMemberViewSchema)
});

export const searchClubsResponseSchema = z.object({
  items: z.array(clubSummarySchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
});

const protectedClubsRouteBaseSchema = {
  tags: ["clubs"],
  headers: clubAuthenticatedHeadersSchema,
  security: [{ bearerAuth: [] }]
};

export const searchClubsRouteSchema = {
  tags: ["clubs"],
  headers: localeHeaderSchema,
  summary: "Search active clubs",
  description: "Publicly discovers active table tennis clubs by name or location.",
  querystring: searchClubsQuerySchema,
  response: {
    200: searchClubsResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getClubByIdRouteSchema = {
  tags: ["clubs"],
  headers: localeHeaderSchema,
  summary: "Get club details and roster",
  description: "Returns a club's public details and membership roster.",
  params: clubIdParamsSchema,
  response: {
    200: clubDetailResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const createClubRouteSchema = {
  ...protectedClubsRouteBaseSchema,
  summary: "Create a new club",
  description:
    "Consumes wallet credits idempotently and creates a new club owned by the authenticated user.",
  body: createClubRequestSchema,
  response: {
    201: clubDetailResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const joinClubRouteSchema = {
  ...protectedClubsRouteBaseSchema,
  summary: "Request to join a club",
  description: "Creates or re-opens a REQUESTED membership for the authenticated user.",
  params: clubIdParamsSchema,
  response: {
    200: clubMemberViewSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const updateClubMemberRouteSchema = {
  ...protectedClubsRouteBaseSchema,
  summary: "Respond to a join request or update a club member's role/status",
  description:
    "Allows club OWNER or ADMIN to accept/reject join requests or manage member roles.",
  params: clubMemberParamsSchema,
  body: updateClubMemberBodySchema,
  response: {
    200: clubMemberViewSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};
