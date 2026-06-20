import { type PortfolioStateSnapshot } from './portfolio-types.js';
import { type RiskPortfolioState } from '../risk/risk-engine.js';
/**
 * Configuration injected at construction time.
 * Caller (orchestrator) provides these from env vars.
 */
export interface PortfolioStateConfig {
    /** Lowercase agent wallet address (AGENT_WALLET_ADDRESS env var) */
    agentWalletAddress: string;
    /** Competition starting capital in USD (COMPETITION_STARTING_CAPITAL_USD env var) */
    startingCapitalUsd: number;
}
/**
 * PortfolioStateService — orchestrates the portfolio valuation pipeline.
 *
 * Responsibilities:
 *   1. Load positions for the agent wallet from wallet_positions
 *   2. Batch-fetch price bundles for all token addresses
 *   3. Delegate MTM computation to PortfolioValuationEngine (pure)
 *   4. Resolve peak equity from persisted portfolio_state (restart-safe)
 *   5. Compute drawdown and rolling 24h loss from portfolio_snapshots
 *   6. Upsert portfolio_state (live single-row state)
 *   7. Insert portfolio_snapshots (time-series record)
 *   8. Return PortfolioStateSnapshot + RiskPortfolioState projection
 *
 * Designed to be called every 5 minutes by the orchestration scheduler.
 */
export declare class PortfolioStateService {
    private readonly agentWallet;
    private readonly startingCapitalUsd;
    constructor(config: PortfolioStateConfig);
    /**
     * Main entry point. Runs the full portfolio valuation pipeline.
     *
     * @returns { snapshot, riskState } — use riskState as input to RiskEngine.evaluate()
     */
    refresh(now?: Date): Promise<{
        snapshot: PortfolioStateSnapshot;
        riskState: RiskPortfolioState;
    }>;
    /**
     * Read-only: returns the last persisted portfolio state without triggering a refresh.
     * Returns null if no state has been persisted yet.
     */
    readCurrentState(): Promise<PortfolioStateSnapshot | null>;
    /**
     * Prunes portfolio_snapshots older than retentionDays (default: 7).
     * Call this periodically from the scheduler to keep the table bounded.
     */
    pruneSnapshots(retentionDays?: number, now?: Date): Promise<void>;
    private loadPositions;
    private fetchPriceMap;
    /**
     * Resolves the stored peak portfolio value and whether this is a bootstrap run.
     *
     * Bootstrap = no portfolio_state row has ever been written for this wallet.
     * On bootstrap, drawdown and rolling loss are suppressed to 0% so the agent
     * is not blocked before it has placed its first trade.
     *
     * On first real run with stablecoins loaded, portfolioUsd > 0, and
     * Math.max(startingCapitalUsd, portfolioUsd) correctly establishes peak.
     */
    private resolveStoredPeakAndBootstrap;
    /**
     * Drawdown = (peak - current) / peak * 100
     * Clamped to [0, 100]. Returns 0 when current > peak (new high).
     */
    private computeDrawdown;
    /**
     * Rolling 24h loss = loss since the earliest snapshot in the last 24h window.
     *
     * If no 24h-old snapshot exists (fresh start), uses startingCapitalUsd as baseline.
     * Returns 0 if portfolio gained over the 24h window.
     */
    private computeRollingLoss;
}
//# sourceMappingURL=portfolio-state-service.d.ts.map