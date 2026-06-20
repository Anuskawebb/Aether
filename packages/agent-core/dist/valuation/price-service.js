import { db, tokenPrices, eq } from '@toro/db';
import { computeConfidenceBreakdown } from './price-types.js';
// WBNB on BSC — the price DB tracks this as the BNB price proxy
const WBNB_BSC = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
export class PriceService {
    static cache = new Map();
    static cacheTTLMs = 5000; // 5 seconds default cache TTL
    /**
     * Configures the in-memory cache TTL in milliseconds.
     */
    static setTTL(ttlMs) {
        this.cacheTTLMs = ttlMs;
    }
    /**
     * Clears the in-memory cache.
     */
    static clearCache() {
        this.cache.clear();
    }
    /**
     * Returns the BNB price in USD by looking up WBNB in the price DB.
     * Returns 0 if not yet tracked (watcher must have observed WBNB pairs first).
     */
    static async getBnbPrice() {
        return this.getPrice(WBNB_BSC);
    }
    /**
     * Primary entry point for Portfolio and Risk Engines.
     * Resolves the current price in USD.
     */
    static async getPrice(tokenAddress) {
        const bundle = await this.getPriceBundle(tokenAddress);
        return bundle ? bundle.priceUsd : 0.0;
    }
    /**
     * Retrieves the full valuation metadata bundle for a token.
     * Leverages an in-memory cache for O(1) reads.
     * Reconstructs confidenceBreakdown on the fly from stored fields
     * so callers can always inspect the three sub-scores for explainability.
     */
    static async getPriceBundle(tokenAddress) {
        const addr = tokenAddress.toLowerCase();
        const now = Date.now();
        const cached = this.cache.get(addr);
        if (cached && (now - cached.fetchedAt < this.cacheTTLMs)) {
            return cached.bundle;
        }
        const rows = await db
            .select()
            .from(tokenPrices)
            .where(eq(tokenPrices.tokenAddress, addr))
            .limit(1);
        if (rows.length > 0) {
            const row = rows[0];
            // Reconstruct the breakdown from stored fields — no extra query needed.
            const ageSinceUpdateMs = now - row.updatedAt.getTime();
            const confidenceBreakdown = computeConfidenceBreakdown(row.liquidityUsd, ageSinceUpdateMs, row.observationCount1h);
            const bundle = {
                tokenAddress: row.tokenAddress,
                priceUsd: row.priceUsd,
                vwap1m: row.vwap1m,
                vwap15m: row.vwap15m,
                vwap1h: row.vwap1h,
                observationCount1h: row.observationCount1h,
                liquidityUsd: row.liquidityUsd,
                routeType: row.routeType,
                priceState: row.priceState,
                manipulationFlag: row.manipulationFlag,
                priceConfidence: row.priceConfidence,
                confidenceBreakdown,
                updatedAt: row.updatedAt
            };
            this.cache.set(addr, { bundle, fetchedAt: now });
            return bundle;
        }
        return null;
    }
}
//# sourceMappingURL=price-service.js.map