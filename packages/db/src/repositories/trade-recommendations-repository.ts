import { db, tradeRecommendations } from '../client.js';
import { and, eq, lt } from 'drizzle-orm';
import { type TradeRecommendationRow } from '../schema/trade-recommendations.js';

/**
 * TradeRecommendationsRepository — lifecycle management for trade_recommendations.
 *
 * Write operations that the DecisionEngine delegates here:
 *   - expirePending(): sweeps stale PENDING rows to EXPIRED before each cycle.
 *
 * Write operations that the ExecutionEngine delegates here:
 *   - markExecuted(): transitions PENDING → EXECUTED after a successful fill.
 *   - getPendingByWallet(): loads all PENDING recommendations for an agent wallet.
 */
export class TradeRecommendationsRepository {
  /**
   * Transitions all PENDING recommendations whose expiresAt < now to EXPIRED.
   * Must be called at the start of every DecisionEngine cycle, before consuming
   * PENDING recommendations or generating new ones.
   *
   * Returns the number of rows transitioned.
   */
  static async expirePending(agentWallet: string, now: Date = new Date()): Promise<number> {
    const result = await db
      .update(tradeRecommendations)
      .set({ status: 'EXPIRED' })
      .where(
        and(
          eq(tradeRecommendations.agentWallet, agentWallet.toLowerCase()),
          eq(tradeRecommendations.status, 'PENDING'),
          lt(tradeRecommendations.expiresAt, now),
        )
      );
    // postgres.js returns rowCount as a property on the result array
    return (result as unknown as { length?: number }).length ?? 0;
  }

  /**
   * Transitions a PENDING recommendation to EXECUTED after a successful order fill.
   * Called by ExecutionEngine immediately after marking the order FILLED.
   */
  static async markExecuted(id: string): Promise<void> {
    await db
      .update(tradeRecommendations)
      .set({ status: 'EXECUTED' })
      .where(
        and(
          eq(tradeRecommendations.id, id),
          eq(tradeRecommendations.status, 'PENDING'),
        )
      );
  }

  /**
   * Returns all PENDING recommendations for a given agent wallet.
   * Used by ExecutionEngine.createOrders() to resolve recommendation data when
   * building orders from ExecutionPlans.
   */
  static async getPendingByWallet(agentWallet: string): Promise<TradeRecommendationRow[]> {
    return db
      .select()
      .from(tradeRecommendations)
      .where(
        and(
          eq(tradeRecommendations.agentWallet, agentWallet.toLowerCase()),
          eq(tradeRecommendations.status, 'PENDING'),
        )
      );
  }
}
