import type { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  ConsumeCreditsRequestSchema,
  LedgerEntrySchema,
  WalletBalanceResponseSchema,
  WalletHistoryQuerySchema,
  WalletHistoryResponseSchema
} from "./wallet.schemas.js";

export class InsufficientBalanceError extends AppError {
  public constructor(balance: number, required: number) {
    super({
      code: "INSUFFICIENT_BALANCE",
      messageKey: "errors.wallet.insufficient_balance",
      statusCode: 409,
      details: { balance, required }
    });
    this.name = "InsufficientBalanceError";
  }
}

export class IdempotencyCollisionError extends AppError {
  public constructor(details?: Record<string, unknown>) {
    super({
      code: "IDEMPOTENCY_COLLISION",
      messageKey: "errors.wallet.idempotency_collision",
      statusCode: 409,
      ...(details ? { details } : {})
    });
    this.name = "IdempotencyCollisionError";
  }
}

export const LEDGER_ENTRY_TYPES = ["CREDIT", "DEBIT"] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const WALLET_CURRENCY = "COINS" as const;

export type WalletCurrency = typeof WALLET_CURRENCY;

export type ConsumeCreditsInput = z.infer<typeof ConsumeCreditsRequestSchema>;

export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;

export type LedgerEntryRecord = z.infer<typeof LedgerEntrySchema>;

export type WalletHistoryQuery = z.infer<typeof WalletHistoryQuerySchema>;

export type WalletHistoryResponse = z.infer<typeof WalletHistoryResponseSchema>;

export type WalletAccount = {
  id: string;
  userId: string;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RecordLedgerTransactionInput = {
  walletId: string;
  type: LedgerEntryType;
  amount: number;
  referenceType?: string | null | undefined;
  referenceId?: string | null | undefined;
  description?: string | null | undefined;
};

export type WalletHistoryPage = {
  items: LedgerEntryRecord[];
  nextCursor: string | null;
};

export interface WalletRepository {
  getOrCreateWallet(userId: string): Promise<WalletAccount>;
  findWalletByUserId(userId: string): Promise<WalletAccount | null>;
  getProjectedBalance(walletId: string): Promise<number>;
  findLedgerEntryByIdempotencyKey(
    walletId: string,
    idempotencyKey: string
  ): Promise<LedgerEntryRecord | null>;
  listLedgerHistory(
    walletId: string,
    query: WalletHistoryQuery
  ): Promise<WalletHistoryPage>;
  applyCredit(params: {
    userId: string;
    amount: number;
    reason: string;
    referenceId: string;
    description?: string | undefined;
  }): Promise<{ wallet: WalletAccount; entry: LedgerEntryRecord; alreadyProcessed: boolean }>;
  applyDebit(params: {
    userId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
    description?: string | undefined;
  }): Promise<{ wallet: WalletAccount; entry: LedgerEntryRecord; alreadyProcessed: boolean }>;
}
