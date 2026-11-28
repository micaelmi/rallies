import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppEnv } from "../../config/env.js";
import { authPlugin } from "../../plugins/auth.js";
import { errorHandlerPlugin } from "../../plugins/error-handler.js";
import { localeContextPlugin } from "../../plugins/locale-context.js";
import { registerWalletRoutes } from "./wallet.routes.js";
import type { LedgerEntryType } from "./wallet.types.js";

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
  CLERK_SECRET_KEY: "sk_test_mock"
};

const createInMemoryPrisma = () => {
  const users = new Map<string, StoredUser>();
  const wallets = new Map<string, StoredWallet>();
  const entries: StoredLedgerEntry[] = [];

  const prismaMock = {
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
          return existing;
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
        return created;
      }
    },
    ledgerEntry: {
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
          .filter((e) => e.walletId === where.walletId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        let startIndex = 0;
        if (cursor) {
          const idx = ordered.findIndex((e) => e.id === cursor.id);
          startIndex = idx >= 0 ? idx + (skip ?? 0) : ordered.length;
        }
        return ordered.slice(startIndex, startIndex + take);
      }
    }
  };

  return {
    prisma: prismaMock as unknown as PrismaClient,
    seedUser: (user: StoredUser) => users.set(user.id, user),
    seedWallet: (wallet: StoredWallet) => wallets.set(wallet.userId, wallet),
    seedEntry: (entry: StoredLedgerEntry) => entries.push(entry)
  };
};

describe("Wallet routes integration", () => {
  let app: ReturnType<typeof Fastify>;
  let db: ReturnType<typeof createInMemoryPrisma>;

  beforeEach(async () => {
    db = createInMemoryPrisma();
    db.seedUser({ id: "user_1", clerkUserId: "clerk_1", email: "hugo@example.com" });
    db.seedUser({ id: "user_2", clerkUserId: "clerk_2", email: "bruna@example.com" });

    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate("config", testEnv);
    app.decorate("prisma", db.prisma);

    await app.register(authPlugin, {
      verifyAuthToken: async (token: string) => {
        if (token === "token_user_1") return { sub: "clerk_1" };
        if (token === "token_user_2") return { sub: "clerk_2" };
        throw new Error("Invalid token");
      },
      fetchClerkUserEmail: async () => null
    });
    await app.register(localeContextPlugin);
    await app.register(errorHandlerPlugin);
    await app.register(registerWalletRoutes, { prefix: "/api/v1/wallet" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /api/v1/wallet/balance", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/balance"
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("AUTHENTICATION_REQUIRED");
    });

    it("creates a zero-balance wallet on first access and projects balance from ledger entries", async () => {
      const initial = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/balance",
        headers: { authorization: "Bearer token_user_1" }
      });

      expect(initial.statusCode).toBe(200);
      expect(initial.json()).toMatchObject({
        userId: "user_1",
        balance: 0,
        currency: "COINS"
      });

      const walletId = "wallet_1";
      db.seedEntry({
        id: "entry_1",
        walletId,
        type: "CREDIT",
        amount: 100,
        referenceType: "STRIPE_PURCHASE",
        referenceId: "cs_1",
        description: null,
        createdAt: new Date("2026-11-26T10:00:00.000Z")
      });
      db.seedEntry({
        id: "entry_2",
        walletId,
        type: "DEBIT",
        amount: 35,
        referenceType: "CLUB_CREATE",
        referenceId: "550e8400-e29b-41d4-a716-446655440000",
        description: null,
        createdAt: new Date("2026-11-26T11:00:00.000Z")
      });

      const updated = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/balance",
        headers: { authorization: "Bearer token_user_1" }
      });

      expect(updated.statusCode).toBe(200);
      expect(updated.json().balance).toBe(65);

      // User 2 only sees their own wallet balance (0)
      const user2 = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/balance",
        headers: { authorization: "Bearer token_user_2" }
      });
      expect(user2.statusCode).toBe(200);
      expect(user2.json()).toMatchObject({
        userId: "user_2",
        balance: 0
      });
    });
  });

  describe("GET /api/v1/wallet/history", () => {
    it("returns cursor-paginated ledger entries for authenticated user only", async () => {
      db.seedWallet({
        id: "wallet_user_1",
        userId: "user_1",
        currentBalance: 80,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      db.seedEntry({
        id: "entry_1",
        walletId: "wallet_user_1",
        type: "CREDIT",
        amount: 100,
        referenceType: "STRIPE_PURCHASE",
        referenceId: "cs_1",
        description: "Starter pack",
        createdAt: new Date("2026-11-26T10:00:00.000Z")
      });
      db.seedEntry({
        id: "entry_2",
        walletId: "wallet_user_1",
        type: "DEBIT",
        amount: 20,
        referenceType: "EVENT_BOOST",
        referenceId: "550e8400-e29b-41d4-a716-446655440000",
        description: "Boost Open SP",
        createdAt: new Date("2026-11-26T11:00:00.000Z")
      });

      const page1 = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/history?limit=1",
        headers: { authorization: "Bearer token_user_1" }
      });

      expect(page1.statusCode).toBe(200);
      expect(page1.json().items).toHaveLength(1);
      expect(page1.json().items[0].id).toBe("entry_2");
      expect(page1.json().nextCursor).toBe("entry_2");

      const page2 = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/history?limit=1&cursor=entry_2",
        headers: { authorization: "Bearer token_user_1" }
      });

      expect(page2.statusCode).toBe(200);
      expect(page2.json().items).toHaveLength(1);
      expect(page2.json().items[0].id).toBe("entry_1");
      expect(page2.json().nextCursor).toBeNull();
    });

    it("rejects invalid limit query param with 400", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/wallet/history?limit=500",
        headers: { authorization: "Bearer token_user_1" }
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_ERROR");
    });
  });
});
