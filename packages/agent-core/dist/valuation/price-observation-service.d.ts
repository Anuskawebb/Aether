export declare const BSC_STABLES: Set<string>;
export declare const WBNB_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
export interface SwapInput {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    tokenInDecimals: number;
    tokenOutDecimals: number;
    pairAddress?: string;
    observedAt?: Date;
}
export declare class PriceObservationService {
    /**
     * Tracks the latest WBNB price in memory to avoid redundant DB reads on every swap.
     * Evicted after WBNB_CACHE_TTL_MS to prevent stale BNB price from mispricing WBNB-routed tokens.
     */
    private static cachedWbnbPrice;
    private static cachedWbnbPriceAt;
    /**
     * Processes a raw swap event, computes USD spot price/volume,
     * identifies the route type, and inserts an observation log.
     */
    static recordObservation(input: SwapInput): Promise<void>;
    /**
     * Resolves the latest WBNB spot price from cache or database lookup.
     * Returns null if no price is available — callers must skip WBNB-routed
     * observations rather than fall back to a hardcoded default.
     */
    static resolveWbnbPrice(): Promise<number | null>;
    /**
     * Explicitly sets the cached WBNB price (used during initialization and tests).
     */
    static setCachedWbnbPrice(price: number): void;
    /**
     * Resets the WBNB price cache to unset state. Used in tests to exercise
     * cold-start and cache-expiry paths without waiting for TTL expiry.
     */
    static resetWbnbCache(): void;
}
//# sourceMappingURL=price-observation-service.d.ts.map