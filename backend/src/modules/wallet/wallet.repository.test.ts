import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import { PrismaWalletRepository } from "./wallet.repository.js";
import type { LedgerEntryType } from "./wallet.types.js";

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

const createInMemoryWalletPrisma = () => {
  const wallets = new Map<string, StoredWallet>();
  const entries: StoredLedgerEntry[] = [];
  let lockQueryCount = 0;

  const txClient = {
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
      },
      findUnique: async ({ where }: { where: { userId: string } }) =>
        wallets.get(where.userId) ?? null,
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
            return wallet;
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
        return (
          entries.find(
            (e) =>
              e.walletId === where.walletId &&
              (where.type === undefined || e.type === where.type) &&
              (where.referenceType === undefined ||
                e.referenceType === where.referenceType) &&
              (where.referenceId === undefined ||
                e.referenceId === where.referenceId)
          ) ?? null
        );
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
        return created;
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
    },
    $queryRaw: vi.fn(async () => {
      lockQueryCount += 1;
      return [{ id: "locked" }];
    })
  };

  const prisma = {
    ...txClient,
    $transaction: async <T>(fn: (tx: typeof txClient) => Promise<T>): Promise<T> =>
      fn(txClient)
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    getLockCount: () => lockQueryCount,
    getEntries: () => entries
  };
};

describe("PrismaWalletRepository", () => {
  it("creates wallet idempotently and applies atomic credit & debit transactions with row locking", async () => {
    const db = createInMemoryWalletPrisma();
    const repo = new PrismaWalletRepository(db.prisma);

    const credit = await repo.applyCredit({
      userId: "user_1",
      amount: 100,
      reason: "STRIPE_PURCHASE",
      referenceId: "cs_test_1",
      description: "100 coins pack"
    });

    expect(credit.alreadyProcessed).toBe(false);
    expect(credit.wallet.currentBalance).toBe(100);
    expect(credit.entry.type).toBe("CREDIT");
    expect(db.getLockCount()).toBe(1);

    const debit = await repo.applyDebit({
      userId: "user_1",
      amount: 40,
      reason: "CLUB_CREATE",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
    });

    expect(debit.alreadyProcessed).toBe(false);
    expect(debit.wallet.currentBalance).toBe(60);
    expect(debit.entry.type).toBe("DEBIT");
    expect(db.getLockCount()).toBe(2);
    await expect(repo.getProjectedBalance(credit.wallet.id)).resolves.toBe(60);
  });

  it("enforces idempotency on repeated keys and throws IDEMPOTENCY_COLLISION on mismatched params", async () => {
    const db = createInMemoryWalletPrisma();
    const repo = new PrismaWalletRepository(db.prisma);
    const key = "550e8400-e29b-41d4-a716-446655440001";

    await repo.applyCredit({
      userId: "user_1",
      amount: 50,
      reason: "STRIPE_PURCHASE",
      referenceId: "cs_1"
    });

    const first = await repo.applyDebit({
      userId: "user_1",
      amount: 20,
      reason: "EVENT_BOOST",
      idempotencyKey: key
    });
    const replay = await repo.applyDebit({
      userId: "user_1",
      amount: 20,
      reason: "EVENT_BOOST",
      idempotencyKey: key
    });

    expect(replay.alreadyProcessed).toBe(true);
    expect(replay.entry.id).toBe(first.entry.id);
    expect(replay.wallet.currentBalance).toBe(30);
    expect(db.getEntries()).toHaveLength(2);

    // Subsequent balance change must be reflected on authoritative replay
    await repo.applyCredit({
      userId: "user_1",
      amount: 10,
      reason: "STRIPE_PURCHASE",
      referenceId: "cs_2"
    });
    const replayAfterCredit = await repo.applyDebit({
      userId: "user_1",
      amount: 20,
      reason: "EVENT_BOOST",
      idempotencyKey: key
    });
    expect(replayAfterCredit.alreadyProcessed).toBe(true);
    expect(replayAfterCredit.wallet.currentBalance).toBe(40);

    await expect(
      repo.applyDebit({
        userId: "user_1",
        amount: 30,
        reason: "EVENT_BOOST",
        idempotencyKey: key
      })
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_COLLISION",
      statusCode: 409
    });
  });

  it("throws INSUFFICIENT_BALANCE without writing any ledger entry when balance is too low", async () => {
    const db = createInMemoryWalletPrisma();
    const repo = new PrismaWalletRepository(db.prisma);

    await repo.applyCredit({
      userId: "user_1",
      amount: 10,
      reason: "STRIPE_PURCHASE",
      referenceId: "cs_low"
    });

    await expect(
      repo.applyDebit({
        userId: "user_1",
        amount: 25,
        reason: "CLUB_CREATE",
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440002"
      })
    ).rejects.toBeInstanceOf(AppError);

    expect(db.getEntries()).toHaveLength(1);
    const wallet = await repo.findWalletByUserId("user_1");
    expect(wallet?.currentBalance).toBe(10);
  });

  it("paginates ledger history with cursor", async () => {
    const db = createInMemoryWalletPrisma();
    const repo = new PrismaWalletRepository(db.prisma);

    for (let i = 1; i <= 3; i += 1) {
      await repo.applyCredit({
        userId: "user_1",
        amount: i * 10,
        reason: "STRIPE_PURCHASE",
        referenceId: `cs_${i}`
      });
    }

    const wallet = await repo.getOrCreateWallet("user_1");
    const page1 = await repo.listLedgerHistory(wallet.id, { limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).toBe(page1.items[1]?.id);

    const page2 = await repo.listLedgerHistory(wallet.id, {
      limit: 2,
      cursor: page1.nextCursor ?? undefined
    });
    expect(page2.items).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
  });
});
