import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";

export const clerkWebhookHeadersSchema = z.object({
  "svix-id": z.string().min(1),
  "svix-timestamp": z.string().min(1),
  "svix-signature": z.string().min(1)
});

export const clerkWebhookResponseSchema = z.object({
  received: z.literal(true),
  eventType: z.string(),
  action: z.enum(["synced", "deleted", "ignored", "skipped_missing_email"])
});

export const clerkWebhookRouteSchema = {
  tags: ["system"],
  summary: "Clerk webhook sync",
  description: "Verifies Clerk webhook signatures and synchronizes internal identity records.",
  headers: clerkWebhookHeadersSchema,
  response: {
    200: clerkWebhookResponseSchema,
    400: errorResponseSchema,
    503: errorResponseSchema
  }
};
