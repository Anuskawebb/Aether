import { type PriceBundle } from './price-types.js';
export declare class PriceService {
    private static cache;
    private static cacheTTLMs;
    /**
     * Configures the in-memory cache TTL in milliseconds.
     */
    static setTTL(ttlMs: number): void;
    /**
     * Clears the in-memory cache.
     */
    static clearCache(): void;
    /**
     * Primary entry point for Portfolio and Risk Engines.
     * Resolves the current price in USD.
     */
    static getPrice(tokenAddress: string): Promise<number>;
    /**
     * Retrieves the full valuation metadata bundle for a token.
     * Leverages an in-memory cache for O(1) reads.
     * Reconstructs confidenceBreakdown on the fly from stored fields
     * so callers can always inspect the three sub-scores for explainability.
     */
    static getPriceBundle(tokenAddress: string): Promise<PriceBundle | null>;
}
//# sourceMappingURL=price-service.d.ts.map