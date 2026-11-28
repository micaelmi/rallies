import type { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../config/env.js";
import { authPlugin } from "../../plugins/auth.js";
import { errorHandlerPlugin } from "../../plugins/error-handler.js";
import { localeContextPlugin } from "../../plugins/locale-context.js";
import { registerWalletRoutes } from "../wallet/wallet.routes.js";
import type { LedgerEntryType } from "../wallet/wallet.types.js";
import { registerEventsRoutes } from "./events.routes.js";
import {
  EVENT_BOOST_COST,
  EVENT_PUBLISH_COST,
  type EventStatus
} from "./events.types.js";

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

type StoredEvent = {
  id: string;
  clubId: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string;
  mapsUrl: string | null;
  startAt: Date;
  endAt: Date;
  registrationUrl: string | null;
  createdById: string;
  status: EventStatus;
  isBoosted: boolean;
  boostedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const testEnv: AppEnv = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: 3344,
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rallies",
  CLERK_SECRET_KEY: "sk_test_mock"
};

const createInMemoryEventsPrisma = () => {
  const users = new Map<string, StoredUser>();
  const wallets = new Map<string, StoredWallet>();
  const entries: StoredLedgerEntry[] = [];
  const events: StoredEvent[] = [];

  const matchesLocation = (event: StoredEvent, location: string): boolean => {
    const needle = location.toLowerCase();
    return [event.city, event.state, event.country, event.address].some(
      (field) => field?.toLowerCase().includes(needle)
    );
  };

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
        if (existing) return { ...existing };
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
      }
    },
    event: {
      create: async ({
        data
      }: {
        data: Omit<StoredEvent, "id" | "boostedUntil" | "createdAt" | "updatedAt">;
      }) => {
        const now = new Date(Date.now() + events.length);
        const created: StoredEvent = {
          id: `event_${events.length + 1}`,
          ...data,
          boostedUntil: null,
          createdAt: now,
          updatedAt: now
        };
        events.push(created);
        return { ...created };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const found = events.find((e) => e.id === where.id);
        return found ? { ...found } : null;
      },
      findMany: async ({
        where,
        skip = 0,
        take = 20
      }: {
        where: {
          status?: EventStatus;
          createdById?: string;
          isBoosted?: boolean;
          OR?: Array<Record<string, { contains: string }>>;
        };
        skip?: number;
        take?: number;
      }) => {
        const locationTerm = where.OR?.[0]?.city?.contains;
        const filtered = events
          .filter((e) => {
            if (where.status && e.status !== where.status) return false;
            if (where.createdById && e.createdById !== where.createdById)
              return false;
            if (where.isBoosted !== undefined && e.isBoosted !== where.isBoosted)
              return false;
            if (locationTerm && !matchesLocation(e, locationTerm)) return false;
            return true;
          })
          .sort((a, b) => {
            if (a.isBoosted !== b.isBoosted) return a.isBoosted ? -1 : 1;
            return a.startAt.getTime() - b.startAt.getTime();
          });

        return filtered.slice(skip, skip + take).map((e) => ({ ...e }));
      },
      count: async ({
        where
      }: {
        where: {
          status?: EventStatus;
          createdById?: string;
          isBoosted?: boolean;
          OR?: Array<Record<string, { contains: string }>>;
        };
      }) => {
        const locationTerm = where.OR?.[0]?.city?.contains;
        return events.filter((e) => {
          if (where.status && e.status !== where.status) return false;
          if (where.createdById && e.createdById !== where.createdById)
            return false;
          if (where.isBoosted !== undefined && e.isBoosted !== where.isBoosted)
            return false;
          if (locationTerm && !matchesLocation(e, locationTerm)) return false;
          return true;
        }).length;
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: Partial<StoredEvent>;
      }) => {
        const found = events.find((e) => e.id === where.id);
        if (!found) throw new Error("Event not found");
        Object.assign(found, data, { updatedAt: new Date() });
        return { ...found };
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
    seedWalletBalance: (userId: string, balance: number) => {
      const now = new Date();
      const walletId = `wallet_seed_${wallets.size + 1}`;
      wallets.set(userId, {
        id: walletId,
        userId,
        currentBalance: balance,
        createdAt: now,
        updatedAt: now
      });
      if (balance > 0) {
        entries.push({
          id: `entry_seed_${entries.length + 1}`,
          walletId,
          type: "CREDIT",
          amount: balance,
          referenceType: "STRIPE_PURCHASE",
          referenceId: `cs_seed_${entries.length + 1}`,
          description: "Seeded balance",
          createdAt: now
        });
      }
    },
    getEntries: () => entries
  };
};

describe("Events discovery & credit spending integration", () => {
  let app: ReturnType<typeof Fastify>;
  let db: ReturnType<typeof createInMemoryEventsPrisma>;

  beforeEach(async () => {
    db = createInMemoryEventsPrisma();
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
    await app.register(registerEventsRoutes, { prefix: "/api/v1/events" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  const sampleDraft = (overrides: Record<string, unknown> = {}) => ({
    title: "Sao Paulo Open 2026",
    description: "Regional table tennis tournament with ratings brackets.",
    city: "Sao Paulo",
    state: "SP",
    country: "Brazil",
    address: "Av. Paulista, 1000",
    startDate: "2026-12-10T09:00:00.000Z",
    endDate: "2026-12-11T18:00:00.000Z",
    ...overrides
  });

  it("rejects event draft when endDate precedes startDate with 400 VALIDATION_ERROR", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: "Bearer token_user_1" },
      payload: sampleDraft({
        startDate: "2026-12-12T09:00:00.000Z",
        endDate: "2026-12-10T18:00:00.000Z"
      })
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("publishes a draft event and debits exact EVENT_PUBLISH_COST from wallet", async () => {
    db.seedWalletBalance("user_1", 100);

    const draftRes = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: "Bearer token_user_1" },
      payload: sampleDraft()
    });
    expect(draftRes.statusCode).toBe(201);
    const draft = draftRes.json();
    expect(draft.status).toBe("DRAFT");

    const publishRes = await app.inject({
      method: "POST",
      url: `/api/v1/events/${draft.id}/publish`,
      headers: { authorization: "Bearer token_user_1" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440501" }
    });

    expect(publishRes.statusCode).toBe(200);
    expect(publishRes.json().status).toBe("PUBLISHED");

    const balanceRes = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_1" }
    });
    expect(balanceRes.json().balance).toBe(100 - EVENT_PUBLISH_COST);
  });

  it("rejects publishing when wallet balance is insufficient and leaves event in DRAFT", async () => {
    db.seedWalletBalance("user_1", 10);

    const draftRes = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: "Bearer token_user_1" },
      payload: sampleDraft()
    });
    const draft = draftRes.json();

    const publishRes = await app.inject({
      method: "POST",
      url: `/api/v1/events/${draft.id}/publish`,
      headers: { authorization: "Bearer token_user_1" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440502" }
    });

    expect(publishRes.statusCode).toBe(409);
    expect(publishRes.json().error.code).toBe("INSUFFICIENT_BALANCE");

    const publicList = await app.inject({
      method: "GET",
      url: "/api/v1/events"
    });
    expect(publicList.json().items).toHaveLength(0);
  });

  it("blocks non-owners from publishing or boosting another user's event with 403", async () => {
    db.seedWalletBalance("user_2", 200);

    const draftRes = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: "Bearer token_user_1" },
      payload: sampleDraft()
    });
    const draft = draftRes.json();

    const publishRes = await app.inject({
      method: "POST",
      url: `/api/v1/events/${draft.id}/publish`,
      headers: { authorization: "Bearer token_user_2" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440503" }
    });

    expect(publishRes.statusCode).toBe(403);
    expect(publishRes.json().error.code).toBe("UNAUTHORIZED_EVENT_ACTION");

    const user2Balance = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_2" }
    });
    expect(user2Balance.json().balance).toBe(200);
  });

  it("boosts a published event, debits EVENT_BOOST_COST, and filters discovery by location", async () => {
    db.seedWalletBalance("user_1", 200);

    const sp1 = (
      await app.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { authorization: "Bearer token_user_1" },
        payload: sampleDraft({
          title: "Sao Paulo Earlier",
          startDate: "2026-12-05T09:00:00.000Z",
          endDate: "2026-12-05T18:00:00.000Z"
        })
      })
    ).json();

    const sp2 = (
      await app.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { authorization: "Bearer token_user_1" },
        payload: sampleDraft({
          title: "Sao Paulo Boosted Later",
          startDate: "2026-12-20T09:00:00.000Z",
          endDate: "2026-12-20T18:00:00.000Z"
        })
      })
    ).json();

    const rio = (
      await app.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { authorization: "Bearer token_user_1" },
        payload: sampleDraft({
          title: "Rio Open",
          city: "Rio de Janeiro",
          state: "RJ"
        })
      })
    ).json();

    // Draft-only event in Sao Paulo (never published) must stay excluded
    await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: "Bearer token_user_1" },
      payload: sampleDraft({ title: "Sao Paulo Hidden Draft" })
    });

    await app.inject({
      method: "POST",
      url: `/api/v1/events/${sp1.id}/publish`,
      headers: { authorization: "Bearer token_user_1" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440511" }
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/events/${sp2.id}/publish`,
      headers: { authorization: "Bearer token_user_1" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440512" }
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/events/${rio.id}/publish`,
      headers: { authorization: "Bearer token_user_1" },
      payload: { idempotencyKey: "550e8400-e29b-41d4-a716-446655440513" }
    });

    const boostRes = await app.inject({
      method: "POST",
      url: `/api/v1/events/${sp2.id}/boost`,
      headers: { authorization: "Bearer token_user_1" },
      payload: {
        durationDays: 7,
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440514"
      }
    });
    expect(boostRes.statusCode).toBe(200);
    expect(boostRes.json().isBoosted).toBe(true);

    const spQuery = await app.inject({
      method: "GET",
      url: "/api/v1/events?location=Sao+Paulo"
    });
    expect(spQuery.statusCode).toBe(200);
    const spItems = spQuery.json().items;
    expect(spItems).toHaveLength(2);
    expect(spItems[0].title).toBe("Sao Paulo Boosted Later");
    expect(spItems[1].title).toBe("Sao Paulo Earlier");

    const balanceRes = await app.inject({
      method: "GET",
      url: "/api/v1/wallet/balance",
      headers: { authorization: "Bearer token_user_1" }
    });
    expect(balanceRes.json().balance).toBe(
      200 - 3 * EVENT_PUBLISH_COST - EVENT_BOOST_COST
    );
  });
});
