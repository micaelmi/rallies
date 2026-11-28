import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import {
  WALLET_CURRENCY,
  type LedgerEntryRecord,
  type WalletAccount,
  type WalletBalanceResponse,
  type WalletHistoryQuery,
  type WalletHistoryResponse,
  type WalletRepository
} from "./wallet.types.js";

const uuidV4Schema = z.uuid({ version: "v4" });

const assertPositiveIntegerAmount = (amount: number): void => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError({
      code: "INVALID_CREDIT_AMOUNT",
      messageKey: "errors.wallet.invalid_amount",
      statusCode: 400,
      details: { amount }
    });
  }
};

const normalizeNonEmpty = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      messageKey: "errors.validation.invalid_request",
      statusCode: 400,
      details: { field }
    });
  }
  return trimmed;
};

export type WalletMutationResult = {
  wallet: WalletBalanceResponse;
  entry: LedgerEntryRecord;
  alreadyProcessed: boolean;
};

export class WalletService {
  public constructor(private readonly walletRepository: WalletRepository) {}

  public async getBalance(userId: string): Promise<WalletBalanceResponse> {
    const wallet = await this.walletRepository.getOrCreateWallet(userId);
    const projectedBalance = await this.walletRepository.getProjectedBalance(
      wallet.id
    );

    return this.toBalanceResponse(wallet, projectedBalance);
  }

  public async getHistory(
    userId: string,
    query: WalletHistoryQuery
  ): Promise<WalletHistoryResponse> {
    const wallet = await this.walletRepository.getOrCreateWallet(userId);
    return this.walletRepository.listLedgerHistory(wallet.id, query);
  }

  public async consumeCredits(
    userId: string,
    amount: number,
    reason: string,
    idempotencyKey: string,
    description?: string
  ): Promise<WalletMutationResult> {
    assertPositiveIntegerAmount(amount);
    const normalizedReason = normalizeNonEmpty(reason, "reason");
    const parsedKey = uuidV4Schema.safeParse(idempotencyKey);

    if (!parsedKey.success) {
      throw new AppError({
        code: "INVALID_IDEMPOTENCY_KEY",
        messageKey: "errors.wallet.invalid_idempotency_key",
        statusCode: 400
      });
    }

    const result = await this.walletRepository.applyDebit({
      userId,
      amount,
      reason: normalizedReason,
      idempotencyKey: parsedKey.data,
      description: description?.trim() || undefined
    });

    return {
      wallet: this.toBalanceResponse(
        result.wallet,
        result.wallet.currentBalance
      ),
      entry: result.entry,
      alreadyProcessed: result.alreadyProcessed
    };
  }

  public async grantCredits(
    userId: string,
    amount: number,
    reason: string,
    referenceId: string,
    description?: string
  ): Promise<WalletMutationResult> {
    assertPositiveIntegerAmount(amount);
    const normalizedReason = normalizeNonEmpty(reason, "reason");
    const normalizedReferenceId = normalizeNonEmpty(referenceId, "referenceId");

    const result = await this.walletRepository.applyCredit({
      userId,
      amount,
      reason: normalizedReason,
      referenceId: normalizedReferenceId,
      description: description?.trim() || undefined
    });

    return {
      wallet: this.toBalanceResponse(
        result.wallet,
        result.wallet.currentBalance
      ),
      entry: result.entry,
      alreadyProcessed: result.alreadyProcessed
    };
  }

  private toBalanceResponse(
    wallet: WalletAccount,
    balance: number
  ): WalletBalanceResponse {
    return {
      userId: wallet.userId,
      balance,
      currency: WALLET_CURRENCY,
      updatedAt: wallet.updatedAt
    };
  }
}
