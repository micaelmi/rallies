import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const swaggerPlugin = fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Rallies Backend API",
        description: "Initial modular monolith backend foundation for Rallies.",
        version: "0.1.0"
      },
      servers: app.config.SWAGGER_BASE_URL
        ? [
            {
              url: app.config.SWAGGER_BASE_URL
            }
          ]
        : [],
      tags: [
        { name: "system", description: "Technical and operational routes" },
        { name: "identity", description: "Identity and profile bootstrap routes" },
        { name: "profiles", description: "Public and authenticated player profile routes" },
        { name: "wallet", description: "Authenticated coin wallet and ledger history routes" },
        { name: "billing", description: "Stripe checkout and coin package catalog routes" },
        { name: "webhooks", description: "Third-party provider webhook endpoints" }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    },
    transform: jsonSchemaTransform
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false
    }
  });
});
