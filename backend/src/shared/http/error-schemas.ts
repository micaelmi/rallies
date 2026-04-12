import { z } from "zod";

export const errorPayloadSchema = z.object({
  code: z.string(),
  messageKey: z.string(),
  details: z.unknown().optional()
});

export const errorResponseSchema = z.object({
  error: errorPayloadSchema,
  requestId: z.string()
});
