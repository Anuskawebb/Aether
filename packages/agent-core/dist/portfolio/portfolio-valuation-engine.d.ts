import { type WalletPosition } from '@toro/db';
import { type PriceBundle } from '../valuation/price-types.js';
import { type PortfolioValuation } from './portfolio-types.js';
/**
 * PortfolioValuationEngine — pure computation, zero I/O.
 *
 * Takes a snapshot of wallet positions and a pre-fetched price map,
 * returns a full PortfolioValuation. All decisions are deterministic.
 *
 * Responsibilities:
 *   - BigInt → human amount conversion (avoids float precision loss)
 *   - Stablecoin vs token classification
 *   - MTM valuation per position
 *   - UNRESOLVABLE / MANIPULATED position handling
 *   - Value-weighted average confidence (valuationConfidence)
 *
 * NOT responsible for:
 *   - Drawdown (requires persisted peak)
 *   - Rolling daily loss (requires historical snapshots)
 *   - DB reads or writes
 */
export declare class PortfolioValuationEngine {
    /**
     * Computes a full portfolio valuation from positions and a price map.
     *
     * @param agentWallet    Lowercase agent wallet address
     * @param positions      All wallet_positions rows for the agent wallet
     * @param priceMap       Map<tokenAddress, PriceBundle> — pre-fetched by caller
     * @param stablecoins    Set of lowercase stablecoin addresses
     * @param valuedAt       Snapshot timestamp (defaults to now)
     */
    static compute(agentWallet: string, positions: WalletPosition[], priceMap: Map<string, PriceBundle>, stablecoins: Set<string>, valuedAt?: Date): PortfolioValuation;
}
//# sourceMappingURL=portfolio-valuation-engine.d.ts.map