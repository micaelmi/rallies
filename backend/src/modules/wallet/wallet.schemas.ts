import { z } from "zod";
import { errorResponseSchema } from "../../shared/http/error-schemas.js";
import { localeHeaderSchema } from "../../shared/http/locale-header-schema.js";
import { LEDGER_ENTRY_TYPES, WALLET_CURRENCY } from "./wallet.types.js";

export const walletAuthenticatedHeadersSchema = localeHeaderSchema.extend({
  authorization: z.string().min(1).optional()
});

export const ConsumeCreditsRequestSchema = z
  .object({
    amount: z.number().int().positive(),
    reason: z.string().trim().min(1).max(80),
    metadata: z.record(z.string(), z.unknown()).optional(),
    idempotencyKey: z.uuid({ version: "v4" })
  })
  .strict();

export const WalletBalanceResponseSchema = z.object({
  userId: z.string(),
  balance: z.number().int().min(0),
  currency: z.literal(WALLET_CURRENCY),
  updatedAt: z.date()
});

export const LedgerEntrySchema = z.object({
  id: z.string(),
  walletId: z.string(),
  type: z.enum(LEDGER_ENTRY_TYPES),
  amount: z.number().int().positive(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.date()
});

export const WalletHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().trim().min(1).max(191).optional()
  })
  .strict();

export const WalletHistoryResponseSchema = z.object({
  items: z.array(LedgerEntrySchema),
  nextCursor: z.string().nullable()
});

const protectedWalletRouteBaseSchema = {
  tags: ["wallet"],
  headers: walletAuthenticatedHeadersSchema,
  security: [{ bearerAuth: [] }]
};

export const getWalletBalanceRouteSchema = {
  ...protectedWalletRouteBaseSchema,
  summary: "Get the authenticated user's wallet balance",
  description:
    "Returns the authenticated user's current coin balance projected from immutable ledger entries.",
  response: {
    200: WalletBalanceResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  }
};

export const getWalletHistoryRouteSchema = {
  ...protectedWalletRouteBaseSchema,
  summary: "List the authenticated user's ledger history",
  description:
    "Returns cursor-paginated immutable credit and debit ledger entries for the authenticated user.",
  querystring: WalletHistoryQuerySchema,
  response: {
    200: WalletHistoryResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  }
};
