export var PriceState;
(function (PriceState) {
    PriceState["FRESH"] = "FRESH";
    PriceState["STALE"] = "STALE";
    PriceState["UNRESOLVABLE"] = "UNRESOLVABLE";
    PriceState["MANIPULATED"] = "MANIPULATED";
})(PriceState || (PriceState = {}));
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
export function computeConfidenceBreakdown(liquidityUsd, ageSinceUpdateMs, observationCount1h) {
    // A. Liquidity Score (max 40)
    let liquidity = 0;
    if (liquidityUsd > 1_000_000)
        liquidity = 40;
    else if (liquidityUsd > 100_000)
        liquidity = 30;
    else if (liquidityUsd > 25_000)
        liquidity = 20;
    else if (liquidityUsd > 10_000)
        liquidity = 10;
    // B. Freshness Score (max 40)
    const ageMs = Math.max(0, ageSinceUpdateMs);
    let freshness = 0;
    if (ageMs <= 5 * 60_000)
        freshness = 40;
    else if (ageMs <= 15 * 60_000)
        freshness = 35;
    else if (ageMs <= 60 * 60_000)
        freshness = 25;
    else if (ageMs <= 4 * 60 * 60_000)
        freshness = 10;
    // C. Observation Count Score (max 20)
    let observations = 0;
    if (observationCount1h >= 100)
        observations = 20;
    else if (observationCount1h >= 50)
        observations = 15;
    else if (observationCount1h >= 10)
        observations = 10;
    else if (observationCount1h >= 2)
        observations = 5;
    return { liquidity, freshness, observations };
}
//# sourceMappingURL=price-types.js.map