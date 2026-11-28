import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import rawBody from "fastify-raw-body";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../config/env.js";
import { authPlugin } from "../../plugins/auth.js";
import { errorHandlerPlugin } from "../../plugins/error-handler.js";
import { localeContextPlugin } from "../../plugins/locale-context.js";
import { registerWalletRoutes } from "../wallet/wallet.routes.js";
import type { LedgerEntryType } from "../wallet/wallet.types.js";
import {
  registerBillingRoutes,
  registerStripeWebhookRoutes
} from "./billing.routes.js";
import type { StripeClientAdapter } from "./billing.types.js";

type StoredUser = {
  id: string;
  clerkUserId: string;
  email: string;
};

type StoredWallet = {
  id: string;
  userId: string;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

type StoredLedgerEntry = {
  id: string;
  walletId: string;
  type: LedgerEntryType;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
};

const testEnv: AppEnv = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3344,
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rallies",
  CLERK_SECRET_KEY: "sk_test_mock",
  STRIPE_SECRET_KEY: "sk_test_mock_billing_routes",
  STRIPE_WEBHOOK_SECRET: "whsec_test_billing_routes_secret",
  STRIPE_PRICE_ID_STARTER: "price_starter_test",
  STRIPE_PRICE_ID_PRO: "price_pro_test",
  STRIPE_PRICE_ID_CLUB_PASS: "price_club_pass_test"
};

const createInMemoryBillingPrisma = () => {
  const users = new Map<string, StoredUser>();
  const wallets = new Map<string, StoredWallet>();
  const entries: StoredLedgerEntry[] = [];

  const client = {
    user: {
      findUnique: async ({
        where
      }: {
        where: { id?: string; clerkUserId?: string };
      }) => {
        for (const user of users.values()) {
          if (
            (where.id && user.id === where.id) ||
            (where.clerkUserId && user.clerkUserId === where.clerkUserId)
          ) {
            return { ...user, profile: null };
          }
        }
        return null;
      }
    },
    wallet: {
      upsert: async ({
        where,
        create
      }: {
        where: { userId: string };
        create: { userId: string; currentBalance: number };
      }) => {
        const existing = wallets.get(where.userId);
        if (existing) {
          return { ...existing };
        }
        const now = new Date();
        const created: StoredWallet = {
          id: `wallet_${wallets.size + 1}`,
          userId: create.userId,
          currentBalance: create.currentBalance,
          createdAt: now,
          updatedAt: now
        };
        wallets.set(where.userId, created);
        return { ...created };
      },
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const wallet = wallets.get(where.userId);
        return wallet ? { ...wallet } : null;
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: { currentBalance: number };
      }) => {
        for (const wallet of wallets.values()) {
          if (wallet.id === where.id) {
            wallet.currentBalance = data.currentBalance;
            wallet.updatedAt = new Date();
            return { ...wallet };
          }
        }
        throw new Error("Wallet not found");
      }
    },
    ledgerEntry: {
      findFirst: async ({
        where
      }: {
        where: {
          walletId: string;
          type?: LedgerEntryType;
          referenceType?: string;
          referenceId?: string;
        };
      }) => {
        const found = entries.find(
          (entry) =>
            entry.walletId === where.walletId &&
            (where.type === undefined || entry.type === where.type) &&
            (where.referenceType === undefined ||
              entry.referenceType === where.referenceType) &&
            (where.referenceId === undefined ||
              entry.referenceId === where.referenceId)
        );
        return found ? { ...found } : null;
      },
      groupBy: async ({ where }: { where: { walletId: string } }) => {
        const totals = new Map<LedgerEntryType, number>();
        for (const entry of entries) {
          if (entry.walletId === where.walletId) {
            totals.set(entry.type, (totals.get(entry.type) ?? 0) + entry.amount);
          }
        }
        return Array.from(totals.entries()).map(([type, amount]) => ({
          type,
          _sum: { amount }
        }));
      },
      create: async ({
        data
      }: {
        data: Omit<StoredLedgerEntry, "id" | "createdAt">;
      }) => {
        const created: StoredLedgerEntry = {
          id: `entry_${entries.length + 1}`,
          ...data,
          createdAt: new Date(Date.now() + entries.length)
        };
        entries.push(created);
        return { ...created };
      },
      findMany: async ({
        where,
        take,
        cursor,
        skip
      }: {
        where: { walletId: string };
        take: number;
        cursor?: { id: string };
        skip?: number;
      }) => {
        const ordered = [...entries]
          .filter((entry) => entry.walletId === where.walletId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        let startIndex = 0;
        if (cursor) {
          const idx = ordered.findIndex((entry) => entry.id === cursor.id);
          startIndex = idx >= 0 ? idx + (skip ?? 0) : ordered.length;
        }
        return ordered.slice(startIndex, startIndex + take);
      }
    },
    $queryRaw: vi.fn(async () => [{ id: "locked" }])
  };

  const prisma = {
    ...client,
    $transaction: async <T>(fn: (tx: typeof client) => Promise<T>): Promise<T> =>
      fn(client)
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    seedUser: (user: StoredUser) => users.set(user.id, user),
    getEntries: () => entries
  };
};

describe("Billing & Stripe webhook routes integration", () => {
  let app: ReturnType<typeof Fastify>;
  let db: ReturnType<typeof createInMemoryBillingPrisma>;
  let stripeHelper: Stripe;
  let mockSyncStripeAdapter: StripeClientAdapter;

  beforeEach(async () => {
    db = createInMemoryBillingPrisma();
    db.seedUser({ id: "user_1", clerkUserId: "clerk_1", email: "hugo@example.com" });

    stripeHelper = new Stripe(testEnv.STRIPE_SECRET_KEY!);
    mockSyncStripeAdapter = {
      createCheckoutSession: vi.fn(),
      retrieveCheckoutSession: vi.fn(),
      constructWebhookEvent: vi.fn()
    };

    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", testEnv);
    app.decorate("prisma", db.prisma);

    await app.register(rawBody, {
      field: "rawBody",
      global: false,
      encoding: "utf8",
      runFirst: true
    });
    await app.register(authPlugin, {
      verifyAuthToken: async (token: string) => {
        if (token === "token_user_1") return { sub: "clerk_1" };
        throw new Error("Invalid token");
      },
      fetchClerkUserEmail: async () => null
    });
    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(registerWalletRoutes, { prefix: "/api/v1/wallet" });
    await app.register(registerBillingRoutes, {
      prefix: "/api/v1/billing",
      stripeAdapter: mockSyncStripeAdapter
    });
    await app.register(registerStripeWebhookRoutes, {
      prefix: "/api/v1/webhooks"
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  const signPayload = (
    payload: string,
    secret = testEnv.STRIPE_WEBHOOK_SECRET!
  ): string =>
    stripeHelper.webhooks.generateTestHeaderString({
      payload,
      secret
    });

  it("credits wallet atomically upon signed checkout.session.completed webhook", async () => {
    const payload = JSON.stringify({
      id: "evt_wh_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_wh_1",
          mode: "payment",
          payment_status: "paid",
          client_reference_id: "user_1",
          metadata: {
            userId: "user_1",
            packageId: "starter_pack",
            coinsAmount: "100"
          }
        }
      }
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      received: true,
      eventType: "checkout.session.completed",
      action: "credited"
    });

    const entries = db.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "CREDIT",
      amount: 100,
      referenceType: "STRIPE_PURCHASE",
      referenceId: "cs_test_wh_1"
    });

    const balanceRes = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_1" }
    });

    expect(balanceRes.statusCode).toBe(200);
    expect(balanceRes.json().balance).toBe(100);
  });

  it("grants zero additional credits when the same signed checkout.session.completed webhook is replayed", async () => {
    const payload = JSON.stringify({
      id: "evt_wh_replay",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_wh_replay",
          mode: "payment",
          payment_status: "paid",
          client_reference_id: "user_1",
          metadata: {
            userId: "user_1",
            packageId: "starter_pack",
            coinsAmount: "100"
          }
        }
      }
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().action).toBe("credited");
    expect(second.statusCode).toBe(200);
    expect(second.json().action).toBe("already_processed");
    expect(db.getEntries()).toHaveLength(1);

    const balanceRes = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_1" }
    });
    expect(balanceRes.json().balance).toBe(100);
  });

  it("credits recurring subscription coins on signed invoice.paid webhook and ignores replays", async () => {
    const payload = JSON.stringify({
      id: "evt_inv_1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_sub_1",
          parent: {
            subscription_details: {
              metadata: {
                userId: "user_1",
                packageId: "club_pass_monthly",
                coinsAmount: "300"
              }
            }
          }
        }
      }
    });

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({
      received: true,
      eventType: "invoice.paid",
      action: "credited"
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().action).toBe("already_processed");

    const entries = db.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "CREDIT",
      amount: 300,
      referenceType: "STRIPE_SUBSCRIPTION",
      referenceId: "in_test_sub_1"
    });

    const balanceRes = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_1" }
    });
    expect(balanceRes.json().balance).toBe(300);
  });

  it("rejects missing or invalid stripe-signature headers with 400 WEBHOOK_VERIFICATION_FAILED", async () => {
    const payload = JSON.stringify({
      id: "evt_bad_sig",
      type: "checkout.session.completed",
      data: { object: { id: "cs_bad" } }
    });

    const missingRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json"
      },
      payload
    });

    expect(missingRes.statusCode).toBe(400);
    expect(missingRes.json().error.code).toBe("WEBHOOK_VERIFICATION_FAILED");

    const wrongSigRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload, "whsec_wrong_secret")
      },
      payload
    });

    expect(wrongSigRes.statusCode).toBe(400);
    expect(wrongSigRes.json().error.code).toBe("WEBHOOK_VERIFICATION_FAILED");
    expect(db.getEntries()).toHaveLength(0);
  });

  it("deduplicates credits across webhook delivery and POST /api/v1/billing/checkout-sessions/:sessionId/sync", async () => {
    const payload = JSON.stringify({
      id: "evt_sync_cross",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_sync_1",
          mode: "payment",
          payment_status: "paid",
          client_reference_id: "user_1",
          metadata: {
            userId: "user_1",
            packageId: "starter_pack",
            coinsAmount: "100"
          }
        }
      }
    });

    const webhookRes = await app.inject({
      method: "POST",
      url: "/api/v1/webhooks/stripe",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payload)
      },
      payload
    });
    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.json().action).toBe("credited");

    vi.mocked(mockSyncStripeAdapter.retrieveCheckoutSession).mockResolvedValueOnce({
      id: "cs_test_sync_1",
      status: "complete",
      mode: "payment",
      payment_status: "paid",
      client_reference_id: "user_1",
      metadata: {
        userId: "user_1",
        packageId: "starter_pack",
        coinsAmount: "100"
      }
    });

    const syncRes = await app.inject({
      method: "POST",
      url: "/api/v1/billing/checkout-sessions/cs_test_sync_1/sync",
      headers: { authorization: "Bearer token_user_1" }
    });

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.json()).toEqual({
      status: "already_processed",
      balance: 100
    });
    expect(db.getEntries()).toHaveLength(1);
  });
});
