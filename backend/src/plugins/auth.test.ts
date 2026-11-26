import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../config/env.js";
import { authPlugin } from "./auth.js";
import { errorHandlerPlugin } from "./error-handler.js";
import { localeContextPlugin } from "./locale-context.js";

const baseEnv: AppEnv = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3344,
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rallies",
  CLERK_SECRET_KEY: "sk_test_mock"
};

const createMockPrisma = () => {
  const usersByClerkId = new Map<
    string,
    { id: string; clerkUserId: string; email: string }
  >();

  const prisma = {
    user: {
      findUnique: async ({
        where
      }: {
        where: { id?: string; clerkUserId?: string; email?: string };
      }) => {
        if (where.clerkUserId) {
          const user = usersByClerkId.get(where.clerkUserId);
          return user ? { ...user, profile: null } : null;
        }
        return null;
      },
      upsert: async ({
        where,
        create
      }: {
        where: { clerkUserId: string };
        update: { email: string };
        create: { clerkUserId: string; email: string };
      }) => {
        const stored = {
          id: `user_${usersByClerkId.size + 1}`,
          clerkUserId: where.clerkUserId,
          email: create.email
        };
        usersByClerkId.set(where.clerkUserId, stored);
        return stored;
      }
    }
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    seed: (user: { id: string; clerkUserId: string; email: string }) =>
      usersByClerkId.set(user.clerkUserId, user)
  };
};

describe("authPlugin", () => {
  it("returns 401 AUTHENTICATION_REQUIRED when Authorization header is missing or malformed", async () => {
    const db = createMockPrisma();
    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", baseEnv);
    app.decorate("prisma", db.prisma);

    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      verifyAuthToken: vi.fn(),
      fetchClerkUserEmail: vi.fn()
    });
    app.get(
      "/protected",
      { preHandler: [app.requireAuth] },
      async (req) => req.authUser
    );
    await app.ready();

    const missing = await app.inject({ method: "GET", url: "/protected" });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().error.code).toBe("AUTHENTICATION_REQUIRED");

    const malformed = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Basic abc123" }
    });
    expect(malformed.statusCode).toBe(401);
    expect(malformed.json().error.code).toBe("AUTHENTICATION_REQUIRED");

    await app.close();
  });

  it("returns 401 INVALID_AUTH_TOKEN when token verification fails or lacks sub", async () => {
    const db = createMockPrisma();
    const verifyAuthToken = vi
      .fn()
      .mockRejectedValueOnce(new Error("expired"))
      .mockResolvedValueOnce({});

    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", baseEnv);
    app.decorate("prisma", db.prisma);

    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      verifyAuthToken,
      fetchClerkUserEmail: vi.fn()
    });
    app.get(
      "/protected",
      { preHandler: [app.requireAuth] },
      async (req) => req.authUser
    );
    await app.ready();

    const rejected = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer bad-token" }
    });
    expect(rejected.statusCode).toBe(401);
    expect(rejected.json().error.code).toBe("INVALID_AUTH_TOKEN");

    const missingSub = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer no-sub-token" }
    });
    expect(missingSub.statusCode).toBe(401);
    expect(missingSub.json().error.code).toBe("INVALID_AUTH_TOKEN");

    await app.close();
  });

  it("attaches existing internal userId without calling Clerk API", async () => {
    const db = createMockPrisma();
    db.seed({
      id: "internal_1",
      clerkUserId: "clerk_1",
      email: "hugo@example.com"
    });
    const fetchClerkUserEmail = vi.fn();

    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", baseEnv);
    app.decorate("prisma", db.prisma);

    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      verifyAuthToken: async () => ({ sub: "clerk_1" }),
      fetchClerkUserEmail
    });
    app.get(
      "/protected",
      { preHandler: [app.requireAuth] },
      async (req) => req.authUser
    );
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer valid-token" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      userId: "internal_1",
      clerkUserId: "clerk_1"
    });
    expect(fetchClerkUserEmail).not.toHaveBeenCalled();

    await app.close();
  });

  it("lazily syncs first-time Clerk user when webhook has not arrived yet", async () => {
    const db = createMockPrisma();
    const fetchClerkUserEmail = vi
      .fn()
      .mockResolvedValue("newplayer@example.com");

    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", baseEnv);
    app.decorate("prisma", db.prisma);

    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(authPlugin, {
      verifyAuthToken: async () => ({ sub: "clerk_new" }),
      fetchClerkUserEmail
    });
    app.get(
      "/protected",
      { preHandler: [app.requireAuth] },
      async (req) => req.authUser
    );
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer valid-new-token" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      userId: "user_1",
      clerkUserId: "clerk_new"
    });
    expect(fetchClerkUserEmail).toHaveBeenCalledWith("clerk_new");

    await app.close();
  });
});
