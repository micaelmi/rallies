import {
  LedgerEntryType as PrismaLedgerEntryType,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { mapPrismaError } from "../../infra/database/prisma-errors.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  IdempotencyCollisionError,
  InsufficientBalanceError,
  type LedgerEntryRecord,
  type RecordLedgerTransactionInput,
  type WalletAccount,
  type WalletHistoryPage,
  type WalletHistoryQuery,
  type WalletRepository
} from "./wallet.types.js";

const walletSelect = {
  id: true,
  userId: true,
  currentBalance: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.WalletSelect;

const ledgerEntrySelect = {
  id: true,
  walletId: true,
  type: true,
  amount: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true
} satisfies Prisma.LedgerEntrySelect;

const toWalletAccount = (
  record: Prisma.WalletGetPayload<{ select: typeof walletSelect }>
): WalletAccount => ({
  id: record.id,
  userId: record.userId,
  currentBalance: record.currentBalance,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

const toLedgerEntry = (
  record: Prisma.LedgerEntryGetPayload<{ select: typeof ledgerEntrySelect }>
): LedgerEntryRecord => ({
  id: record.id,
  walletId: record.walletId,
  type: record.type,
  amount: record.amount,
  referenceType: record.referenceType,
  referenceId: record.referenceId,
  description: record.description,
  createdAt: record.createdAt
});

export class PrismaWalletRepository implements WalletRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOrCreateWallet(userId: string): Promise<WalletAccount> {
    try {
      const wallet = await this.prisma.wallet.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          currentBalance: 0
        },
        select: walletSelect
      });

      return toWalletAccount(wallet);
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  public async findWalletByUserId(userId: string): Promise<WalletAccount | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: walletSelect
    });

    return wallet ? toWalletAccount(wallet) : null;
  }

  public async getProjectedBalance(walletId: string): Promise<number> {
    return this.computeProjectedBalance(this.prisma, walletId);
  }

  public async findLedgerEntryByIdempotencyKey(
    walletId: string,
    idempotencyKey: string
  ): Promise<LedgerEntryRecord | null> {
    return this.checkIdempotencyKey(this.prisma, walletId, idempotencyKey);
  }

  public async listLedgerHistory(
    walletId: string,
    query: WalletHistoryQuery
  ): Promise<WalletHistoryPage> {
    const take = query.limit + 1;
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1
          }
        : {}),
      select: ledgerEntrySelect
    });

    const hasMore = rows.length > query.limit;
    const items = (hasMore ? rows.slice(0, query.limit) : rows).map(
      toLedgerEntry
    );
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items,
      nextCursor
    };
  }

  public async applyCredit(params: {
    userId: string;
    amount: number;
    reason: string;
    referenceId: string;
    description?: string | undefined;
  }): Promise<{
    wallet: WalletAccount;
    entry: LedgerEntryRecord;
    alreadyProcessed: boolean;
  }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const wallet = await this.ensureAndLockWallet(tx, params.userId);
        const existingEntry = await tx.ledgerEntry.findFirst({
          where: {
            walletId: wallet.id,
            type: PrismaLedgerEntryType.CREDIT,
            referenceType: params.reason,
            referenceId: params.referenceId
          },
          select: ledgerEntrySelect
        });

        if (existingEntry) {
          if (existingEntry.amount !== params.amount) {
            throw new IdempotencyCollisionError({
              referenceId: params.referenceId,
              reason: params.reason
            });
          }

          const projectedBalance = await this.computeProjectedBalance(
            tx,
            wallet.id
          );

          return {
            wallet: {
              ...wallet,
              currentBalance: projectedBalance
            },
            entry: toLedgerEntry(existingEntry),
            alreadyProcessed: true
          };
        }

        const projectedBalance = await this.computeProjectedBalance(
          tx,
          wallet.id
        );
        const result = await this.recordTransaction(tx, {
          walletId: wallet.id,
          type: "CREDIT",
          amount: params.amount,
          referenceType: params.reason,
          referenceId: params.referenceId,
          description: params.description ?? null,
          nextBalance: projectedBalance + params.amount
        });

        return {
          ...result,
          alreadyProcessed: false
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      return mapPrismaError(error);
    }
  }

  public async applyDebit(params: {
    userId: string;
    amount: number;
    reason: string;
    idempotencyKey: string;
    description?: string | undefined;
  }): Promise<{
    wallet: WalletAccount;
    entry: LedgerEntryRecord;
    alreadyProcessed: boolean;
  }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const wallet = await this.ensureAndLockWallet(tx, params.userId);
        const existingEntry = await this.checkIdempotencyKey(
          tx,
          wallet.id,
          params.idempotencyKey
        );

        if (existingEntry) {
          if (
            existingEntry.type !== "DEBIT" ||
            existingEntry.amount !== params.amount ||
            existingEntry.referenceType !== params.reason
          ) {
            throw new IdempotencyCollisionError({
              idempotencyKey: params.idempotencyKey
            });
          }

          const projectedBalance = await this.computeProjectedBalance(
            tx,
            wallet.id
          );

          return {
            wallet: {
              ...wallet,
              currentBalance: projectedBalance
            },
            entry: existingEntry,
            alreadyProcessed: true
          };
        }

        const projectedBalance = await this.computeProjectedBalance(
          tx,
          wallet.id
        );

        if (projectedBalance < params.amount) {
          throw new InsufficientBalanceError(projectedBalance, params.amount);
        }

        const result = await this.recordTransaction(tx, {
          walletId: wallet.id,
          type: "DEBIT",
          amount: params.amount,
          referenceType: params.reason,
          referenceId: params.idempotencyKey,
          description: params.description ?? null,
          nextBalance: projectedBalance - params.amount
        });

        return {
          ...result,
          alreadyProcessed: false
        };
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      return mapPrismaError(error);
    }
  }

  private async checkIdempotencyKey(
    client: Pick<PrismaClient, "ledgerEntry"> | Prisma.TransactionClient,
    walletId: string,
    key: string
  ): Promise<LedgerEntryRecord | null> {
    const entry = await client.ledgerEntry.findFirst({
      where: {
        walletId,
        referenceId: key
      },
      select: ledgerEntrySelect
    });

    return entry ? toLedgerEntry(entry) : null;
  }

  private async recordTransaction(
    tx: Prisma.TransactionClient,
    params: RecordLedgerTransactionInput & { nextBalance: number }
  ): Promise<{ wallet: WalletAccount; entry: LedgerEntryRecord }> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new AppError({
        code: "INVALID_CREDIT_AMOUNT",
        messageKey: "errors.wallet.invalid_amount",
        statusCode: 400,
        details: { amount: params.amount }
      });
    }

    if (!Number.isInteger(params.nextBalance) || params.nextBalance < 0) {
      throw new AppError({
        code: "INTERNAL_SERVER_ERROR",
        messageKey: "errors.common.internal_server_error",
        statusCode: 500
      });
    }

    const entry = await tx.ledgerEntry.create({
      data: {
        walletId: params.walletId,
        type:
          params.type === "CREDIT"
            ? PrismaLedgerEntryType.CREDIT
            : PrismaLedgerEntryType.DEBIT,
        amount: params.amount,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        description: params.description ?? null
      },
      select: ledgerEntrySelect
    });

    const wallet = await tx.wallet.update({
      where: { id: params.walletId },
      data: { currentBalance: params.nextBalance },
      select: walletSelect
    });

    return {
      wallet: toWalletAccount(wallet),
      entry: toLedgerEntry(entry)
    };
  }

  private async ensureAndLockWallet(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<WalletAccount> {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currentBalance: 0
      },
      select: walletSelect
    });

    // Lock the wallet row inside the transaction to serialize concurrent debits.
    await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;

    return toWalletAccount(wallet);
  }

  private async computeProjectedBalance(
    client: Pick<PrismaClient, "ledgerEntry"> | Prisma.TransactionClient,
    walletId: string
  ): Promise<number> {
    const grouped = await client.ledgerEntry.groupBy({
      by: ["type"],
      where: { walletId },
      _sum: { amount: true }
    });

    let credits = 0;
    let debits = 0;

    for (const row of grouped) {
      const total = row._sum.amount ?? 0;
      if (row.type === PrismaLedgerEntryType.CREDIT) {
        credits += total;
      } else if (row.type === PrismaLedgerEntryType.DEBIT) {
        debits += total;
      }
    }

    return credits - debits;
  }
}
