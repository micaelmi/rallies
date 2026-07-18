import { ProfileStatus } from "@prisma/client";
import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import { supportedLocales } from "../../shared/i18n/locale-context.js";

const profileFields = {
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  instagramUrl: z.url().max(2048),
  description: z.string().max(2000),
  preferredLocale: z.enum(supportedLocales)
};

export const profileAuthenticatedHeadersSchema = localeHeaderSchema.extend({
  "x-user-id": z.string().min(1).max(191).optional()
});

export const createProfileBodySchema = z
  .object({
    username: profileFields.username,
    city: profileFields.city.optional(),
    state: profileFields.state.optional(),
    country: profileFields.country,
    instagramUrl: profileFields.instagramUrl.optional(),
    description: profileFields.description.optional(),
    preferredLocale: profileFields.preferredLocale.optional()
  })
  .strict();

export const updateProfileBodySchema = z
  .object({
    username: profileFields.username.optional(),
    city: profileFields.city.nullable().optional(),
    state: profileFields.state.nullable().optional(),
    country: profileFields.country.optional(),
    instagramUrl: profileFields.instagramUrl.nullable().optional(),
    description: profileFields.description.nullable().optional(),
    preferredLocale: profileFields.preferredLocale.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided."
  });

export const publicProfileParamsSchema = z.object({
  username: profileFields.username
});

export const ownProfileResponseSchema = z.object({
  userId: z.string(),
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

export const publicProfileResponseSchema = z.object({
  username: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string(),
  instagramUrl: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

const protectedProfilesRouteBaseSchema = {
  tags: ["profiles"],
  headers: profileAuthenticatedHeadersSchema
};

const publicProfilesRouteBaseSchema = {
  tags: ["profiles"],
  headers: localeHeaderSchema
};

export const createProfileRouteSchema = {
  ...protectedProfilesRouteBaseSchema,
  summary: "Create or complete the authenticated user profile",
  description:
    "Creates the authenticated user's public profile. Temporary authentication uses the x-user-id header until real auth middleware is connected.",
  body: createProfileBodySchema,
  response: {
    201: ownProfileResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const updateOwnProfileRouteSchema = {
  ...protectedProfilesRouteBaseSchema,
  summary: "Update the authenticated user's profile",
  description:
    "Updates the authenticated user's own profile. Temporary authentication uses the x-user-id header until real auth middleware is connected.",
  body: updateProfileBodySchema,
  response: {
    200: ownProfileResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getOwnProfileRouteSchema = {
  ...protectedProfilesRouteBaseSchema,
  summary: "Get the authenticated user's profile",
  description:
    "Returns the authenticated user's profile, including private module fields. Temporary authentication uses the x-user-id header until real auth middleware is connected.",
  response: {
    200: ownProfileResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getPublicProfileRouteSchema = {
  ...publicProfilesRouteBaseSchema,
  summary: "Get a public profile by username",
  description:
    "Returns the public-facing profile projection for an active profile by username.",
  params: publicProfileParamsSchema,
  response: {
    200: publicProfileResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
};
