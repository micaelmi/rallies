import { ProfileStatus } from "@prisma/client";
import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import { supportedLocales } from "../../shared/i18n/locale-context.js";

const identityProfileFields = {
  email: z.email().max(320),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  city: z.string().min(1).max(120).nullable(),
  state: z.string().min(1).max(120).nullable(),
  country: z.string().min(1).max(120),
  instagramUrl: z.url().max(2048).nullable(),
  description: z.string().max(2000).nullable(),
  preferredLocale: z.enum(supportedLocales),
  status: z.nativeEnum(ProfileStatus)
};

export const createIdentityProfileBodySchema = z
  .object({
    clerkUserId: z.string().min(1).max(191),
    email: identityProfileFields.email,
    username: identityProfileFields.username,
    city: z.string().min(1).max(120).optional(),
    state: z.string().min(1).max(120).optional(),
    country: identityProfileFields.country,
    instagramUrl: z.url().max(2048).optional(),
    description: z.string().max(2000).optional(),
    preferredLocale: z.enum(supportedLocales)
  })
  .strict();

export const updateIdentityProfileBodySchema = z
  .object({
    email: identityProfileFields.email.optional(),
    username: identityProfileFields.username.optional(),
    city: z.string().min(1).max(120).nullable().optional(),
    state: z.string().min(1).max(120).nullable().optional(),
    country: identityProfileFields.country.optional(),
    instagramUrl: z.url().max(2048).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    preferredLocale: z.enum(supportedLocales).optional(),
    status: z.nativeEnum(ProfileStatus).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const identityProfileParamsSchema = z.object({
  userId: z.string().min(1).max(191)
});

export const identityProfileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const identityProfileResponseSchema = z.object({
  userId: z.string(),
  clerkUserId: z.string(),
  email: z.email(),
  username: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string(),
  instagramUrl: z.string().nullable(),
  description: z.string().nullable(),
  preferredLocale: z.enum(supportedLocales),
  status: z.nativeEnum(ProfileStatus),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const identityProfileListResponseSchema = z.object({
  items: z.array(identityProfileResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0)
  })
});

const identityRouteBaseSchema = {
  tags: ["identity"],
  headers: localeHeaderSchema
};

export const createIdentityProfileRouteSchema = {
  ...identityRouteBaseSchema,
  summary: "Create application user and profile",
  description: "Creates the internal user record and initial public profile in a single application flow.",
  body: createIdentityProfileBodySchema,
  response: {
    201: identityProfileResponseSchema,
    400: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const listIdentityProfilesRouteSchema = {
  ...identityRouteBaseSchema,
  summary: "List identity profiles",
  querystring: identityProfileListQuerySchema,
  response: {
    200: identityProfileListResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getIdentityProfileRouteSchema = {
  ...identityRouteBaseSchema,
  summary: "Get identity profile by user ID",
  params: identityProfileParamsSchema,
  response: {
    200: identityProfileResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const updateIdentityProfileRouteSchema = {
  ...identityRouteBaseSchema,
  summary: "Update identity profile by user ID",
  params: identityProfileParamsSchema,
  body: updateIdentityProfileBodySchema,
  response: {
    200: identityProfileResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const deleteIdentityProfileRouteSchema = {
  ...identityRouteBaseSchema,
  summary: "Delete identity record by user ID",
  params: identityProfileParamsSchema,
  response: {
    204: z.null(),
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};
