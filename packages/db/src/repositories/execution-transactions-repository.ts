import { randomUUID } from 'crypto';
import { db, executionTransactions, eq } from '../client.js';
import { type ExecutionTransactionRow } from '../schema/execution-transactions.js';

export interface CreateTransactionParams {
  agentId:      string;
  agentWallet:  string;
  orderId:      string;
  txHash:       string;
  chain:        string;
  status:       'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  executedAt:   Date;
}

export class ExecutionTransactionsRepository {
  static async createTransaction(params: CreateTransactionParams): Promise<ExecutionTransactionRow> {
    const row = {
      id:           randomUUID(),
      agentId:      params.agentId,
      agentWallet:  params.agentWallet.toLowerCase(),
      orderId:      params.orderId,
      txHash:       params.txHash,
      chain:        params.chain,
      status:       params.status,
      errorMessage: params.errorMessage,
      executedAt:   params.executedAt,
      createdAt:    new Date(),
    };

    const result = await db.insert(executionTransactions).values(row).returning();
    return result[0]!;
  }

  static async getTransactionByOrder(orderId: string): Promise<ExecutionTransactionRow | null> {
    const rows = await db
      .select()
      .from(executionTransactions)
      .where(eq(executionTransactions.orderId, orderId))
      .limit(1);

    return rows[0] ?? null;
  }
}
