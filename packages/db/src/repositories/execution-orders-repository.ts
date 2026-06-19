import { randomUUID } from 'crypto';
import { db, executionOrders, eq, and } from '../client.js';
import { type ExecutionOrderRow } from '../schema/execution-orders.js';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'FILLED' | 'FAILED' | 'CANCELLED';

export interface CreateOrderParams {
  agentId:          string;
  agentWallet:      string;
  decisionTraceId?: string;
  recommendationId: string;
  tokenAddress:     string;
  tokenSymbol:      string;
  action:           'BUY' | 'SELL';
  amountUsd:        number;
  slippageLimitPct: number;
  positionSizePct:  number;
  entryPriceUsd:    number;
  stopLossPct:      number;
  takeProfitPct:    number;
}

export class ExecutionOrdersRepository {
  /**
   * Creates a PENDING order from an ExecutionPlan + Recommendation.
   * Silently no-ops if an order already exists for this recommendationId
   * (unique index on recommendation_id). Returns the created row or null if skipped.
   */
  static async createOrder(params: CreateOrderParams): Promise<ExecutionOrderRow | null> {
    const id  = randomUUID();
    const now = new Date();
    const row = {
      id,
      agentId:          params.agentId,
      agentWallet:      params.agentWallet.toLowerCase(),
      decisionTraceId:  params.decisionTraceId ?? null,
      recommendationId: params.recommendationId,
      tokenAddress:     params.tokenAddress.toLowerCase(),
      tokenSymbol:      params.tokenSymbol,
      action:           params.action,
      amountUsd:        params.amountUsd,
      slippageLimitPct: params.slippageLimitPct,
      positionSizePct:  params.positionSizePct,
      entryPriceUsd:    params.entryPriceUsd,
      stopLossPct:      params.stopLossPct,
      takeProfitPct:    params.takeProfitPct,
      status:           'PENDING' as OrderStatus,
      failureReason:    null,
      createdAt:        now,
      updatedAt:        now,
    };

    const result = await db
      .insert(executionOrders)
      .values(row)
      .onConflictDoNothing()
      .returning();

    return result[0] ?? null;
  }

  /**
   * Returns all PENDING orders for the given agent.
   */
  static async getPendingOrders(agentId: string): Promise<ExecutionOrderRow[]> {
    return db
      .select()
      .from(executionOrders)
      .where(
        and(
          eq(executionOrders.agentId, agentId),
          eq(executionOrders.status, 'PENDING'),
        )
      );
  }

  static async markProcessing(id: string, now: Date = new Date()): Promise<void> {
    await db
      .update(executionOrders)
      .set({ status: 'PROCESSING', updatedAt: now })
      .where(eq(executionOrders.id, id));
  }

  static async markFilled(id: string, now: Date = new Date()): Promise<void> {
    await db
      .update(executionOrders)
      .set({ status: 'FILLED', updatedAt: now })
      .where(eq(executionOrders.id, id));
  }

  static async markFailed(id: string, reason: string, now: Date = new Date()): Promise<void> {
    await db
      .update(executionOrders)
      .set({ status: 'FAILED', failureReason: reason, updatedAt: now })
      .where(eq(executionOrders.id, id));
  }

  static async markCancelled(id: string, now: Date = new Date()): Promise<void> {
    await db
      .update(executionOrders)
      .set({ status: 'CANCELLED', updatedAt: now })
      .where(eq(executionOrders.id, id));
  }
}
