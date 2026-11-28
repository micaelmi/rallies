import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import { PrismaWalletRepository } from "./wallet.repository.js";
import { WalletService } from "./wallet.service.js";
import {
  IdempotencyCollisionError,
  InsufficientBalanceError,
  type LedgerEntryRecord,
  type LedgerEntryType,
  type WalletAccount,
  type WalletRepository
} from "./wallet.types.js";

const now = new Date("2026-11-26T17:00:00.000Z");

const makeWallet = (overrides: Partial<WalletAccount> = {}): WalletAccount => ({
  id: "wallet_1",
  userId: "user_1",
  currentBalance: 100,
  createdAt: now,
  updatedAt: now,
  ...overrides
});

const makeEntry = (
  overrides: Partial<LedgerEntryRecord> = {}
): LedgerEntryRecord => ({
  id: "entry_1",
  walletId: "wallet_1",
  type: "CREDIT",
  amount: 100,
  referenceType: "STRIPE_PURCHASE",
  referenceId: "cs_test_1",
  description: null,
  createdAt: now,
  ...overrides
});

const createMockWalletRepository = (): {
  [K in keyof WalletRepository]: ReturnType<typeof vi.fn<WalletRepository[K]>>;
} => ({
  getOrCreateWallet: vi.fn(),
  findWalletByUserId: vi.fn(),
  getProjectedBalance: vi.fn(),
  findLedgerEntryByIdempotencyKey: vi.fn(),
  listLedgerHistory: vi.fn(),
  applyCredit: vi.fn(),
  applyDebit: vi.fn()
});

describe("WalletService", () => {
  const validKey = "550e8400-e29b-41d4-a716-446655440000";

  it("projects balance from ledger entries via getBalance", async () => {
    const repo = createMockWalletRepository();
    repo.getOrCreateWallet.mockResolvedValue(makeWallet({ currentBalance: 0 }));
    repo.getProjectedBalance.mockResolvedValue(75);

    const service = new WalletService(repo);
    const balance = await service.getBalance("user_1");

    expect(balance).toEqual({
      userId: "user_1",
      balance: 75,
      currency: "COINS",
      updatedAt: now
    });
    expect(repo.getOrCreateWallet).toHaveBeenCalledWith("user_1");
    expect(repo.getProjectedBalance).toHaveBeenCalledWith("wallet_1");
  });

  it("consumes credits with valid UUIDv4 idempotencyKey and trimmed reason", async () => {
    const repo = createMockWalletRepository();
    repo.applyDebit.mockResolvedValue({
      wallet: makeWallet({ currentBalance: 60 }),
      entry: makeEntry({
        type: "DEBIT",
        amount: 40,
        referenceType: "CLUB_CREATE",
        referenceId: validKey
      }),
      alreadyProcessed: false
    });

    const service = new WalletService(repo);
    const result = await service.consumeCredits(
      "user_1",
      40,
      " CLUB_CREATE ",
      validKey,
      " Create Pinheiros TT "
    );

    expect(result.wallet.balance).toBe(60);
    expect(result.alreadyProcessed).toBe(false);
    expect(repo.applyDebit).toHaveBeenCalledWith({
      userId: "user_1",
      amount: 40,
      reason: "CLUB_CREATE",
      idempotencyKey: validKey,
      description: "Create Pinheiros TT"
    });
  });

  it("rejects non-positive amounts and invalid idempotency keys before hitting repository", async () => {
    const repo = createMockWalletRepository();
    const service = new WalletService(repo);

    await expect(
      service.consumeCredits("user_1", 0, "CLUB_CREATE", validKey)
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      service.consumeCredits("user_1", -5, "CLUB_CREATE", validKey)
    ).rejects.toMatchObject({ code: "INVALID_CREDIT_AMOUNT", statusCode: 400 });
    await expect(
      service.consumeCredits("user_1", 10, "CLUB_CREATE", "bad-key")
    ).rejects.toMatchObject({ code: "INVALID_IDEMPOTENCY_KEY", statusCode: 400 });

    expect(repo.applyDebit).not.toHaveBeenCalled();
  });

  it("propagates InsufficientBalanceError and IdempotencyCollisionError cleanly", async () => {
    const repo = createMockWalletRepository();
    repo.applyDebit
      .mockRejectedValueOnce(new InsufficientBalanceError(10, 25))
      .mockRejectedValueOnce(
        new IdempotencyCollisionError({ idempotencyKey: validKey })
      );

    const service = new WalletService(repo);

    await expect(
      service.consumeCredits("user_1", 25, "EVENT_BOOST", validKey)
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    await expect(
      service.consumeCredits("user_1", 25, "EVENT_BOOST", validKey)
    ).rejects.toBeInstanceOf(IdempotencyCollisionError);
  });

  it("grants credits with normalized reason and referenceId", async () => {
    const repo = createMockWalletRepository();
    repo.applyCredit.mockResolvedValue({
      wallet: makeWallet({ currentBalance: 200 }),
      entry: makeEntry({ amount: 100 }),
      alreadyProcessed: false
    });

    const service = new WalletService(repo);
    const result = await service.grantCredits(
      "user_1",
      100,
      " STRIPE_PURCHASE ",
      " cs_test_1 ",
      " Starter pack "
    );

    expect(result.wallet.balance).toBe(200);
    expect(repo.applyCredit).toHaveBeenCalledWith({
      userId: "user_1",
      amount: 100,
      reason: "STRIPE_PURCHASE",
      referenceId: "cs_test_1",
      description: "Starter pack"
    });
  });

  it("lists cursor-paginated ledger history for the user's wallet", async () => {
    const repo = createMockWalletRepository();
    const entry = makeEntry();
    repo.getOrCreateWallet.mockResolvedValue(makeWallet());
    repo.listLedgerHistory.mockResolvedValue({
      items: [entry],
      nextCursor: null
    });

    const service = new WalletService(repo);
    const history = await service.getHistory("user_1", { limit: 20 });

    expect(history).toEqual({ items: [entry], nextCursor: null });
    expect(repo.listLedgerHistory).toHaveBeenCalledWith("wallet_1", {
      limit: 20
    });
  });
});

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

const tick = (ms = 5) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const createLockingWalletPrisma = () => {
  const wallets = new Map<string, StoredWallet>();
  const entries: StoredLedgerEntry[] = [];
  const lockQueues = new Map<string, Promise<void>>();

  const acquireWalletLock = async (walletId: string) => {
    const prev = lockQueues.get(walletId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const chained = prev.then(() => current);
    lockQueues.set(walletId, chained);
    await prev;
    return () => {
      release();
      if (lockQueues.get(walletId) === chained) {
        lockQueues.delete(walletId);
      }
    };
  };

  const makeClient = (releaseCallbacks?: Array<() => void>) => ({
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
        const createdAt = new Date();
        const created: StoredWallet = {
          id: `wallet_${wallets.size + 1}`,
          userId: create.userId,
          currentBalance: create.currentBalance,
          createdAt,
          updatedAt: createdAt
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
        await tick();
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
        await tick();
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
    $queryRaw: async (_strings: TemplateStringsArray, walletId: string) => {
      const release = await acquireWalletLock(walletId);
      releaseCallbacks?.push(release);
      return [{ id: walletId }];
    }
  });

  const rootClient = makeClient();
  const prisma = {
    ...rootClient,
    $transaction: async <T>(
      fn: (tx: ReturnType<typeof makeClient>) => Promise<T>
    ): Promise<T> => {
      const releaseCallbacks: Array<() => void> = [];
      try {
        return await fn(makeClient(releaseCallbacks));
      } finally {
        for (const release of releaseCallbacks.reverse()) {
          release();
        }
      }
    }
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    getEntries: () => entries
  };
};

describe("WalletService financial math and concurrency", () => {
  it("calculates net balance accurately across multiple mixed CREDIT and DEBIT ledger entries", async () => {
    const db = createLockingWalletPrisma();
    const service = new WalletService(new PrismaWalletRepository(db.prisma));

    await service.grantCredits("user_1", 100, "STRIPE_PURCHASE", "cs_1");
    await service.grantCredits("user_1", 50, "STRIPE_PURCHASE", "cs_2");
    await service.grantCredits("user_1", 25, "ADMIN_GRANT", "adj_1");

    await service.consumeCredits(
      "user_1",
      40,
      "CLUB_CREATE",
      "550e8400-e29b-41d4-a716-446655440010"
    );
    await service.consumeCredits(
      "user_1",
      15,
      "EVENT_BOOST",
      "550e8400-e29b-41d4-a716-446655440011"
    );
    await service.consumeCredits(
      "user_1",
      20,
      "BROADCAST_UNLOCK",
      "550e8400-e29b-41d4-a716-446655440012"
    );

    const balance = await service.getBalance("user_1");
    expect(balance).toMatchObject({
      userId: "user_1",
      balance: 100,
      currency: "COINS"
    });

    const history = await service.getHistory("user_1", { limit: 20 });
    expect(history.items).toHaveLength(6);

    const creditTotal = history.items
      .filter((entry) => entry.type === "CREDIT")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const debitTotal = history.items
      .filter((entry) => entry.type === "DEBIT")
      .reduce((sum, entry) => sum + entry.amount, 0);

    expect(creditTotal - debitTotal).toBe(100);
  });

  it("allows exactly 1 of 5 simultaneous 20-credit debits when wallet balance is 30", async () => {
    const db = createLockingWalletPrisma();
    const service = new WalletService(new PrismaWalletRepository(db.prisma));

    await service.grantCredits("user_1", 30, "STRIPE_PURCHASE", "cs_race_1");

    const keys = [
      "550e8400-e29b-41d4-a716-446655440101",
      "550e8400-e29b-41d4-a716-446655440102",
      "550e8400-e29b-41d4-a716-446655440103",
      "550e8400-e29b-41d4-a716-446655440104",
      "550e8400-e29b-41d4-a716-446655440105"
    ];

    const outcomes = await Promise.allSettled(
      keys.map((key) =>
        service.consumeCredits("user_1", 20, "EVENT_BOOST", key)
      )
    );

    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<Awaited<ReturnType<WalletService["consumeCredits"]>>> =>
        outcome.status === "fulfilled"
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult =>
        outcome.status === "rejected"
    );

    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value.wallet.balance).toBe(10);
    expect(fulfilled[0]?.value.alreadyProcessed).toBe(false);

    expect(rejected).toHaveLength(4);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(InsufficientBalanceError);
      expect(failure.reason).toMatchObject({
        code: "INSUFFICIENT_BALANCE",
        statusCode: 409
      });
    }

    const finalBalance = await service.getBalance("user_1");
    expect(finalBalance.balance).toBe(10);
    expect(db.getEntries()).toHaveLength(2);
  });

  it("serializes 5 simultaneous debits sharing the same idempotencyKey without double-charging", async () => {
    const db = createLockingWalletPrisma();
    const service = new WalletService(new PrismaWalletRepository(db.prisma));

    await service.grantCredits("user_1", 50, "STRIPE_PURCHASE", "cs_idem_1");

    const sharedKey = "550e8400-e29b-41d4-a716-446655440201";
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.consumeCredits("user_1", 20, "CLUB_CREATE", sharedKey)
      )
    );

    expect(results.every((res) => res.wallet.balance === 30)).toBe(true);
    expect(results.filter((res) => !res.alreadyProcessed)).toHaveLength(1);
    expect(results.filter((res) => res.alreadyProcessed)).toHaveLength(4);

    const finalBalance = await service.getBalance("user_1");
    expect(finalBalance.balance).toBe(30);
    expect(db.getEntries().filter((entry) => entry.type === "DEBIT")).toHaveLength(1);
  });
});
