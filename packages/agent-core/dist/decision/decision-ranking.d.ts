import { type TokenSignalBundle } from '@toro/db';
import { type PriceBundle } from '../valuation/price-types.js';
import { type RiskDecision } from '../risk/risk-engine.js';
import { type RankedOpportunity } from './trade-recommendation-types.js';
export interface RankInput {
    signal: TokenSignalBundle;
    priceBundle: PriceBundle;
    riskDecision: RiskDecision;
}
/**
 * Converts a list of evaluated signals into ranked opportunities.
 *
 * Filtering rules applied here (before capital allocation):
 *   - Blocked RiskDecision (allowed = false) → excluded
 *   - Stale signal (dataFreshness = STALE)   → excluded
 *   - Manipulated price                       → excluded
 *   - Unresolvable price                      → excluded
 *
 * Sort: convictionScore DESC, tokenAddress ASC (deterministic tie-break).
 */
export declare function rankOpportunities(inputs: RankInput[]): RankedOpportunity[];
//# sourceMappingURL=decision-ranking.d.ts.map