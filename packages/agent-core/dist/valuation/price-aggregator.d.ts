export declare class PriceAggregator {
    /**
     * Aggregates price observations to compute VWAPs and pricing metrics.
     *
     * Batch architecture: replaces the prior per-token loop (O(N×6) queries)
     * with 7 fixed batch queries regardless of token count:
     *   1. Distinct latest observation per token (DISTINCT ON)
     *   2. All 1h observations for all tokens
     *   3. All existing token_prices rows
     *   4–6. Three route-detection queries (stable / WBNB / external)
     *   7. One batch INSERT … ON CONFLICT upsert
     *
     * Plus one optional batch UPDATE for tokens with no observations.
     */
    static aggregatePrices(now?: Date, liquidityOverrides?: Record<string, number>, tokenAddresses?: string[]): Promise<void>;
    /**
     * Determines route types for all non-routing tokens using 3 batch queries.
     *
     * Replaces the prior per-token determineRouteType() that issued 1–3 DB
     * round-trips per token. Priority order matches the original:
     *   DIRECT_STABLE > WBNB_ROUTE > EXTERNAL > WBNB_ROUTE (default)
     */
    private static batchDetermineRouteTypes;
    /**
     * Prunes price observations older than the specified retention window (default: 7 days).
     */
    static pruneObservations(retentionDays?: number, now?: Date): Promise<void>;
}
//# sourceMappingURL=price-aggregator.d.ts.map