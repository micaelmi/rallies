import { Prisma, type PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { errorHandlerPlugin } from "../../plugins/error-handler.js";
import { localeContextPlugin } from "../../plugins/locale-context.js";
import { registerProfilesRoutes } from "./profiles.routes.js";
import type { ProfileStatus } from "./profiles.types.js";

type StoredUser = {
  id: string;
  email: string;
};

type StoredProfile = {
  id: string;
  userId: string;
  username: string;
  city: string | null;
  state: string | null;
  country: string;
  instagramUrl: string | null;
  description: string | null;
  preferredLocale: string;
  status: ProfileStatus;
  createdAt: Date;
  updatedAt: Date;
};

const pickFields = <T extends Record<string, unknown>>(
  record: T,
  select?: Record<string, unknown>
): Record<string, unknown> => {
  if (!select) {
    return { ...record };
  }

  const picked: Record<string, unknown> = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) {
      picked[key] = record[key];
    }
  }
  return picked;
};

const createInMemoryPrisma = () => {
  const users = new Map<string, StoredUser>();
  const profilesByUserId = new Map<string, StoredProfile>();
  let forceNextCreateConflict = false;
  let forceNextUpdateConflict = false;

  const findProfileByUsername = (username: string): StoredProfile | undefined => {
    for (const profile of profilesByUserId.values()) {
      if (profile.username === username) {
        return profile;
      }
    }
    return undefined;
  };

  const prismaMock = {
    user: {
      findUnique: async ({
        where
      }: {
        where: { id: string };
      }) => {
        const user = users.get(where.id);
        if (!user) {
          return null;
        }
        const profile = profilesByUserId.get(user.id);
        return {
          id: user.id,
          profile: profile ? { id: profile.id } : null
        };
      }
    },
    profile: {
      findUnique: async ({
        where,
        select
      }: {
        where: { userId?: string; username?: string };
        select?: Record<string, unknown>;
      }) => {
        const profile = where.userId
          ? profilesByUserId.get(where.userId)
          : where.username
            ? findProfileByUsername(where.username)
            : undefined;

        if (!profile) {
          return null;
        }
        return pickFields(profile, select);
      },
      findFirst: async ({
        where,
        select
      }: {
        where: { username?: string; status?: ProfileStatus };
        select?: Record<string, unknown>;
      }) => {
        const profile = where.username
          ? findProfileByUsername(where.username)
          : undefined;

        if (!profile) {
          return null;
        }
        if (where.status && profile.status !== where.status) {
          return null;
        }
        return pickFields(profile, select);
      },
      create: async ({
        data,
        select
      }: {
        data: Omit<StoredProfile, "id" | "createdAt" | "updatedAt">;
        select?: Record<string, unknown>;
      }) => {
        if (forceNextCreateConflict) {
          forceNextCreateConflict = false;
          throw new Prisma.PrismaClientKnownRequestError(
            "Unique constraint failed",
            {
              code: "P2002",
              clientVersion: "7.7.0",
              meta: { target: ["username"] }
            }
          );
        }

        const now = new Date();
        const stored: StoredProfile = {
          id: `prof_${profilesByUserId.size + 1}`,
          ...data,
          createdAt: now,
          updatedAt: now
        };
        profilesByUserId.set(data.userId, stored);
        return pickFields(stored, select);
      },
      update: async ({
        where,
        data,
        select
      }: {
        where: { userId: string };
        data: Partial<StoredProfile>;
        select?: Record<string, unknown>;
      }) => {
        if (forceNextUpdateConflict) {
          forceNextUpdateConflict = false;
          throw new Prisma.PrismaClientKnownRequestError(
            "Unique constraint failed",
            {
              code: "P2002",
              clientVersion: "7.7.0",
              meta: { target: ["username"] }
            }
          );
        }

        const existing = profilesByUserId.get(where.userId);
        if (!existing) {
          throw new Error("Profile not found");
        }

        const updated: StoredProfile = {
          ...existing,
          ...data,
          updatedAt: new Date()
        };
        profilesByUserId.set(where.userId, updated);
        return pickFields(updated, select);
      }
    }
  };

  return {
    prisma: prismaMock as unknown as PrismaClient,
    seedUser: (user: StoredUser) => users.set(user.id, user),
    seedProfile: (profile: StoredProfile) =>
      profilesByUserId.set(profile.userId, profile),
    triggerCreateConflictOnce: () => {
      forceNextCreateConflict = true;
    },
    triggerUpdateConflictOnce: () => {
      forceNextUpdateConflict = true;
    }
  };
};

describe("Profiles routes integration", () => {
  let app: ReturnType<typeof Fastify>;
  let db: ReturnType<typeof createInMemoryPrisma>;

  beforeEach(async () => {
    db = createInMemoryPrisma();
    db.seedUser({ id: "user_1", email: "hugo@example.com" });
    db.seedUser({ id: "user_2", email: "bruna@example.com" });

    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("prisma", db.prisma);

    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(registerProfilesRoutes, { prefix: "/api/v1" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/profiles", () => {
    it("creates a profile with x-user-id and uses x-locale fallback", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: {
          "x-user-id": "user_1",
          "x-locale": "pt-BR"
        },
        payload: {
          username: "hugo_tt",
          city: "Rio de Janeiro",
          state: "RJ",
          country: "Brazil",
          instagramUrl: "https://www.instagram.com/hugo_tt",
          description: "Topspin specialist"
        }
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toMatchObject({
        userId: "user_1",
        username: "hugo_tt",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "Brazil",
        instagramUrl: "https://www.instagram.com/hugo_tt",
        description: "Topspin specialist",
        preferredLocale: "pt-BR",
        status: "ACTIVE"
      });
    });

    it("rejects unauthenticated requests with 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        payload: {
          username: "hugo_tt",
          country: "Brazil"
        }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("rejects whitespace-only x-user-id header with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: {
          "x-user-id": "   "
        },
        payload: {
          username: "hugo_tt",
          country: "Brazil"
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unknown private location fields (.strict())", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: {
          username: "hugo_tt",
          country: "Brazil",
          address: "123 Secret Street",
          latitude: -22.9068
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unsafe or non-Instagram URLs and blank country", async () => {
      const xssUrlResponse = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: {
          username: "hugo_tt",
          country: "Brazil",
          instagramUrl: "javascript:alert(1)"
        }
      });
      expect(xssUrlResponse.statusCode).toBe(400);

      const nonIgUrlResponse = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: {
          username: "hugo_tt",
          country: "Brazil",
          instagramUrl: "https://evil.example/hugo_tt"
        }
      });
      expect(nonIgUrlResponse.statusCode).toBe(400);

      const blankCountryResponse = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: {
          username: "hugo_tt",
          country: "   "
        }
      });
      expect(blankCountryResponse.statusCode).toBe(400);
    });

    it("returns 404 when owner user does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "ghost_user" },
        payload: {
          username: "ghost_tt",
          country: "Brazil"
        }
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("PROFILE_OWNER_NOT_FOUND");
    });

    it("returns 409 when username is already taken or user already has a profile", async () => {
      await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: { username: "hugo_tt", country: "Brazil" }
      });

      const duplicateOwner = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: { username: "hugo_tt_2", country: "Brazil" }
      });
      expect(duplicateOwner.statusCode).toBe(409);
      expect(duplicateOwner.json().error.code).toBe("PROFILE_ALREADY_EXISTS");

      const duplicateHandle = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_2" },
        payload: { username: "hugo_tt", country: "Brazil" }
      });
      expect(duplicateHandle.statusCode).toBe(409);
      expect(duplicateHandle.json().error.code).toBe(
        "PROFILE_USERNAME_ALREADY_EXISTS"
      );
    });

    it("maps Prisma P2002 race condition inside repository to 409 RESOURCE_CONFLICT", async () => {
      db.triggerCreateConflictOnce();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/profiles",
        headers: { "x-user-id": "user_1" },
        payload: { username: "race_handle", country: "Brazil" }
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("RESOURCE_CONFLICT");
    });
  });

  describe("GET /api/v1/profiles/me", () => {
    it("returns authenticated user's own profile", async () => {
      db.seedProfile({
        id: "prof_1",
        userId: "user_1",
        username: "hugo_tt",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "Brazil",
        instagramUrl: null,
        description: null,
        preferredLocale: "en",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        userId: "user_1",
        username: "hugo_tt",
        preferredLocale: "en",
        status: "ACTIVE"
      });
    });

    it("returns 401 when unauthenticated and 404 when profile is missing", async () => {
      const unauth = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/me"
      });
      expect(unauth.statusCode).toBe(401);

      const missing = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" }
      });
      expect(missing.statusCode).toBe(404);
      expect(missing.json().error.code).toBe("PROFILE_NOT_FOUND");
    });
  });

  describe("PUT & PATCH /api/v1/profiles/me", () => {
    beforeEach(() => {
      db.seedProfile({
        id: "prof_1",
        userId: "user_1",
        username: "hugo_pending",
        city: "Rio",
        state: "RJ",
        country: "Brazil",
        instagramUrl: "https://instagram.com/hugo_pending",
        description: "Initial",
        preferredLocale: "en",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      db.seedProfile({
        id: "prof_2",
        userId: "user_2",
        username: "bruna_tt",
        city: "Sao Paulo",
        state: "SP",
        country: "Brazil",
        instagramUrl: null,
        description: null,
        preferredLocale: "pt-BR",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    it("PUT /api/v1/profiles/me updates fields, clears nullable values, and transitions PENDING to ACTIVE", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" },
        payload: {
          username: "hugo_active",
          city: null,
          state: "SP",
          country: "Brazil",
          instagramUrl: null,
          description: "Ready for tournaments",
          preferredLocale: "pt-BR"
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        userId: "user_1",
        username: "hugo_active",
        city: null,
        state: "SP",
        country: "Brazil",
        instagramUrl: null,
        description: "Ready for tournaments",
        preferredLocale: "pt-BR",
        status: "ACTIVE"
      });
    });

    it("PATCH /api/v1/profiles/me rejects username conflict with 409", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" },
        payload: { username: "bruna_tt" }
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("PROFILE_USERNAME_ALREADY_EXISTS");
    });

    it("rejects empty body and unknown fields with 400", async () => {
      const emptyRes = await app.inject({
        method: "PUT",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" },
        payload: {}
      });
      expect(emptyRes.statusCode).toBe(400);

      const unknownFieldRes = await app.inject({
        method: "PUT",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" },
        payload: { streetAddress: "999 Private Ave" }
      });
      expect(unknownFieldRes.statusCode).toBe(400);
    });

    it("maps Prisma P2002 race condition during update to 409 RESOURCE_CONFLICT", async () => {
      db.triggerUpdateConflictOnce();

      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/profiles/me",
        headers: { "x-user-id": "user_1" },
        payload: { username: "new_race_handle" }
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe("RESOURCE_CONFLICT");
    });
  });

  describe("GET /api/v1/profiles/:username", () => {
    beforeEach(() => {
      db.seedProfile({
        id: "prof_active",
        userId: "user_1",
        username: "hugo_tt",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "Brazil",
        instagramUrl: "https://instagram.com/hugo_tt",
        description: "Public bio",
        preferredLocale: "pt-BR",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      });
      db.seedProfile({
        id: "prof_pending",
        userId: "user_2",
        username: "private_player",
        city: "Curitiba",
        state: "PR",
        country: "Brazil",
        instagramUrl: null,
        description: "Not yet active",
        preferredLocale: "en",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    it("returns public projection for ACTIVE profile without leaking internal or private fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/hugo_tt"
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        username: "hugo_tt",
        city: "Rio de Janeiro",
        state: "RJ",
        country: "Brazil",
        instagramUrl: "https://instagram.com/hugo_tt",
        description: "Public bio"
      });
      expect(body).not.toHaveProperty("userId");
      expect(body).not.toHaveProperty("preferredLocale");
      expect(body).not.toHaveProperty("status");
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("address");
    });

    it("hides PENDING profiles with 404 PROFILE_NOT_FOUND", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/private_player"
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("PROFILE_NOT_FOUND");
    });

    it("returns 404 for unknown username and 400 for invalid username format", async () => {
      const notFound = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/nobody_here"
      });
      expect(notFound.statusCode).toBe(404);

      const invalidSlug = await app.inject({
        method: "GET",
        url: "/api/v1/profiles/ab"
      });
      expect(invalidSlug.statusCode).toBe(400);
      expect(invalidSlug.json().error.code).toBe("VALIDATION_ERROR");
    });
  });
});
