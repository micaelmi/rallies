import { describe, expect, it } from "vitest";
import {
  ConsumeCreditsRequestSchema,
  LedgerEntrySchema,
  WalletBalanceResponseSchema,
  WalletHistoryQuerySchema
} from "./wallet.schemas.js";

describe("wallet.schemas", () => {
  const validUuidV4 = "550e8400-e29b-41d4-a716-446655440000";

  describe("ConsumeCreditsRequestSchema", () => {
    it("accepts a valid consume request with positive integer amount and UUIDv4 idempotencyKey", () => {
      const result = ConsumeCreditsRequestSchema.safeParse({
        amount: 25,
        reason: "CLUB_CREATE",
        metadata: { clubSlug: "pinheiros-tt" },
        idempotencyKey: validUuidV4
      });

      expect(result.success).toBe(true);
    });

    it("rejects zero, negative, and non-integer amounts", () => {
      for (const badAmount of [0, -10, 12.5]) {
        const result = ConsumeCreditsRequestSchema.safeParse({
          amount: badAmount,
          reason: "EVENT_BOOST",
          idempotencyKey: validUuidV4
        });
        expect(result.success).toBe(false);
      }
    });

    it("rejects non-UUIDv4 idempotencyKey values", () => {
      const nonUuid = ConsumeCreditsRequestSchema.safeParse({
        amount: 10,
        reason: "EVENT_BOOST",
        idempotencyKey: "not-a-uuid"
      });
      expect(nonUuid.success).toBe(false);

      // UUIDv1 should be rejected when UUIDv4 is required
      const uuidV1 = ConsumeCreditsRequestSchema.safeParse({
        amount: 10,
        reason: "EVENT_BOOST",
        idempotencyKey: "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
      });
      expect(uuidV1.success).toBe(false);
    });

    it("rejects unknown fields (.strict()) and blank reason", () => {
      const extraField = ConsumeCreditsRequestSchema.safeParse({
        amount: 10,
        reason: "EVENT_BOOST",
        idempotencyKey: validUuidV4,
        balanceOverride: 9999
      });
      expect(extraField.success).toBe(false);

      const blankReason = ConsumeCreditsRequestSchema.safeParse({
        amount: 10,
        reason: "   ",
        idempotencyKey: validUuidV4
      });
      expect(blankReason.success).toBe(false);
    });
  });

  describe("WalletBalanceResponseSchema & LedgerEntrySchema", () => {
    it("validates wallet balance and immutable ledger entry shapes", () => {
      const now = new Date();
      const balance = WalletBalanceResponseSchema.safeParse({
        userId: "user_1",
        balance: 150,
        currency: "COINS",
        updatedAt: now
      });
      expect(balance.success).toBe(true);

      const entry = LedgerEntrySchema.safeParse({
        id: "entry_1",
        walletId: "wallet_1",
        type: "CREDIT",
        amount: 100,
        referenceType: "STRIPE_PURCHASE",
        referenceId: "cs_test_123",
        description: "Starter coin pack",
        createdAt: now
      });
      expect(entry.success).toBe(true);

      const invalidType = LedgerEntrySchema.safeParse({
        id: "entry_2",
        walletId: "wallet_1",
        type: "REFUND",
        amount: 50,
        referenceType: null,
        referenceId: null,
        description: null,
        createdAt: now
      });
      expect(invalidType.success).toBe(false);
    });

    it("defaults limit and validates cursor query parameters", () => {
      const defaults = WalletHistoryQuerySchema.parse({});
      expect(defaults.limit).toBe(20);
      expect(defaults.cursor).toBeUndefined();

      const custom = WalletHistoryQuerySchema.safeParse({
        limit: "50",
        cursor: "entry_10"
      });
      expect(custom.success).toBe(true);
    });
  });
});
