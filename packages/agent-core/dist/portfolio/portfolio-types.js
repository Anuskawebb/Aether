/**
 * Projects a PortfolioStateSnapshot into the RiskEngine's RiskPortfolioState interface.
 * This is the adapter between Phase 6B.2 and Phase 6A.
 */
export function toRiskPortfolioState(s) {
    return {
        currentDrawdownPct: s.drawdownPct,
        dailyLossPct: s.rollingLossPct24h,
        cashReservePct: s.cashReservePct,
        totalExposurePct: s.totalExposurePct,
        openRiskPct: s.openRiskPct,
        openPositions: s.openPositions,
    };
}
//# sourceMappingURL=portfolio-types.js.map