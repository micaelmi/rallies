import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppEnv } from "../config/env.js";
import { authPlugin } from "./auth.js";
import { errorHandlerPlugin } from "./error-handler.js";
import { localeContextPlugin } from "./locale-context.js";
import { registerRoutes } from "./routes.js";
import { swaggerPlugin } from "./swagger.js";

const testEnv: AppEnv = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3344,
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rallies",
  SWAGGER_BASE_URL: "http://localhost:3344"
};

describe("OpenAPI & Swagger contract verification", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate("config", testEnv);
    app.decorate("prisma", {} as PrismaClient);

    await app.register(swaggerPlugin);
    await app.register(authPlugin);
    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(registerRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("generates a valid OpenAPI 3 document with all /api/v1/profiles/* routes and declared tags", async () => {
    const spec = app.swagger() as {
      openapi?: string;
      info?: { title?: string; version?: string };
      tags?: Array<{ name: string }>;
      paths?: Record<string, Record<string, Record<string, unknown>>>;
    };

    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toBe("Rallies Backend API");
    expect(
      (
        spec as {
          components?: { securitySchemes?: Record<string, unknown> };
        }
      ).components?.securitySchemes
    ).toHaveProperty("bearerAuth");

    const declaredTags = new Set((spec.tags ?? []).map((tag) => tag.name));
    expect(declaredTags.has("profiles")).toBe(true);
    expect(declaredTags.has("identity")).toBe(true);
    expect(declaredTags.has("wallet")).toBe(true);
    expect(declaredTags.has("billing")).toBe(true);
    expect(declaredTags.has("system")).toBe(true);
    expect(declaredTags.has("webhooks")).toBe(true);

    const paths = spec.paths ?? {};
    expect(paths["/api/v1/profiles"]?.post).toBeDefined();
    expect(paths["/api/v1/profiles/me"]?.get).toBeDefined();
    expect(paths["/api/v1/profiles/me"]?.put).toBeDefined();
    expect(paths["/api/v1/profiles/me"]?.patch).toBeDefined();
    expect(paths["/api/v1/profiles/{username}"]?.get).toBeDefined();
    expect(paths["/api/v1/wallet/balance"]?.get).toBeDefined();
    expect(paths["/api/v1/wallet/history"]?.get).toBeDefined();
    expect(paths["/api/v1/billing/packages"]?.get).toBeDefined();
    expect(paths["/api/v1/billing/checkout-sessions"]?.post).toBeDefined();
    expect(
      paths["/api/v1/billing/checkout-sessions/{sessionId}/sync"]?.post
    ).toBeDefined();
    expect(paths["/api/v1/webhooks/stripe"]?.post).toBeDefined();

    // Verify every operation tag is registered in top-level OpenAPI tags
    for (const methods of Object.values(paths)) {
      for (const operation of Object.values(methods)) {
        const opTags = Array.isArray(operation.tags) ? operation.tags : [];
        for (const tag of opTags) {
          expect(declaredTags.has(String(tag))).toBe(true);
        }
      }
    }
  });

  it("generates strict JSON Schemas for profile requests and privacy-safe public responses", () => {
    const spec = app.swagger() as {
      paths?: Record<
        string,
        Record<
          string,
          {
            requestBody?: {
              content?: {
                "application/json"?: {
                  schema?: {
                    type?: string;
                    additionalProperties?: boolean;
                    required?: string[];
                    properties?: Record<string, unknown>;
                  };
                };
              };
            };
            responses?: Record<
              string,
              {
                content?: {
                  "application/json"?: {
                    schema?: {
                      type?: string;
                      properties?: Record<string, unknown>;
                    };
                  };
                };
              }
            >;
          }
        >
      >;
    };

    const createBodySchema =
      spec.paths?.["/api/v1/profiles"]?.post?.requestBody?.content?.[
        "application/json"
      ]?.schema;

    expect(createBodySchema?.type).toBe("object");
    expect(createBodySchema?.additionalProperties).toBe(false);
    expect(createBodySchema?.required).toEqual(
      expect.arrayContaining(["username", "country"])
    );
    expect(createBodySchema?.properties).toHaveProperty("instagramUrl");

    const updateBodySchema =
      spec.paths?.["/api/v1/profiles/me"]?.put?.requestBody?.content?.[
        "application/json"
      ]?.schema;
    expect(updateBodySchema?.type).toBe("object");
    expect(updateBodySchema?.additionalProperties).toBe(false);

    const publicResponseProps =
      spec.paths?.["/api/v1/profiles/{username}"]?.get?.responses?.["200"]
        ?.content?.["application/json"]?.schema?.properties ?? {};

    expect(Object.keys(publicResponseProps).sort()).toEqual([
      "city",
      "country",
      "createdAt",
      "description",
      "instagramUrl",
      "state",
      "updatedAt",
      "username"
    ]);
    expect(publicResponseProps).not.toHaveProperty("userId");
    expect(publicResponseProps).not.toHaveProperty("preferredLocale");
    expect(publicResponseProps).not.toHaveProperty("status");
    expect(publicResponseProps).not.toHaveProperty("address");
  });

  it("serves OpenAPI JSON and Swagger UI from /docs", async () => {
    const jsonRes = await app.inject({
      method: "GET",
      url: "/docs/json"
    });
    expect(jsonRes.statusCode).toBe(200);
    const jsonBody = jsonRes.json();
    expect(jsonBody.paths).toHaveProperty("/api/v1/profiles/{username}");

    const uiRes = await app.inject({
      method: "GET",
      url: "/docs/"
    });
    expect(uiRes.statusCode).toBe(200);
    expect(uiRes.headers["content-type"]).toContain("text/html");
    expect(uiRes.body).toContain("Swagger UI");
  });
});
