import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../shared/errors/app-error.js";
import { WalletService } from "./wallet.service.js";
import {
  IdempotencyCollisionError,
  InsufficientBalanceError,
  type LedgerEntryRecord,
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
