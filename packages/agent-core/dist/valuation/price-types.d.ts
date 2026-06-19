export declare enum PriceState {
    FRESH = "FRESH",
    STALE = "STALE",
    UNRESOLVABLE = "UNRESOLVABLE",
    MANIPULATED = "MANIPULATED"
}
export type RouteType = 'DIRECT_STABLE' | 'WBNB_ROUTE' | 'EXTERNAL';
export interface PriceBundle {
    tokenAddress: string;
    priceUsd: number;
    vwap1m: number;
    vwap15m: number;
    vwap1h: number;
    observationCount1h: number;
    liquidityUsd: number;
    routeType: RouteType;
    priceState: PriceState;
    manipulationFlag: boolean;
    priceConfidence: number;
    confidenceBreakdown: {
        liquidity: number;
        freshness: number;
        observations: number;
    };
    updatedAt: Date;
}
/**
 * Recomputes the three confidence sub-scores from their raw inputs.
 *
 * This is a pure function — no I/O, fully deterministic.
 * Call it in PriceAggregator (write path) and PriceService (read path) so the
 * breakdown is always available without storing it as extra DB columns.
 *
 * @param liquidityUsd   Pool liquidity in USD at observation time.
 * @param ageSinceUpdateMs  Milliseconds elapsed since the last price observation.
 * @param observationCount1h  Number of raw observations recorded in the last hour.
 * @returns { liquidity, freshness, observations } — each sub-score, plus total.
 */
export declare function computeConfidenceBreakdown(liquidityUsd: number, ageSinceUpdateMs: number, observationCount1h: number): {
    liquidity: number;
    freshness: number;
    observations: number;
};
//# sourceMappingURL=price-types.d.ts.map