import { type RiskPortfolioState } from '../risk/risk-engine.js';
import { type RankedOpportunity, type CapitalAllocation } from './trade-recommendation-types.js';
/**
 * Allocates capital across ranked opportunities under portfolio constraints.
 *
 * Process:
 *   1. Compute effective exposure: max(wallet_positions exposure, agent intent from OPEN agent_positions)
 *   2. Compute available headroom from effective exposure and effective cash
 *   3. Iterate ranked opportunities (highest conviction first)
 *   4. Skip tokens with an existing open position (Exit Engine handles those)
 *   5. Skip if adding this position would breach exposure or cash reserve limits
 *   6. Approve and accumulate; stop when headroom exhausted
 *
 * agentIntentPct — sum of positionSizePct across all OPEN agent_positions.
 * This captures capital committed by the agent but not yet confirmed on-chain
 * (the execution lag window). It is used as a floor for the effective exposure
 * calculation, preventing double-allocation during that window and in Phase 7
 * (where wallet_positions never reflects agent trades).
 *
 * Deterministic: same inputs always produce same output (no randomness, no I/O).
 */
export declare function allocateCapital(ranked: RankedOpportunity[], portfolio: RiskPortfolioState, openPositionTokens: Set<string>, agentIntentPct: number): CapitalAllocation;
//# sourceMappingURL=capital-allocator.d.ts.map