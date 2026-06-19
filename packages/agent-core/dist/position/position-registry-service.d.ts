import { type AgentPosition, type CloseReason } from '../decision/trade-recommendation-types.js';
/**
 * PositionRegistryService — manages the agent's tracked open positions.
 *
 * Distinct from wallet_positions (raw blockchain accounting).
 * Tracks entry parameters, stop-loss, take-profit, and lifecycle state
 * for each position the agent has intentionally opened.
 *
 * Invariant: at most one OPEN position per (agentWallet, tokenAddress).
 * Enforced by openPosition() checking before inserting.
 */
export declare class PositionRegistryService {
    private readonly agentWallet;
    constructor(agentWallet: string);
    /**
     * Opens a new position. Throws if an OPEN position already exists for this token.
     */
    openPosition(params: {
        tokenAddress: string;
        tokenSymbol: string;
        recommendationId: string;
        entryPriceUsd: number;
        positionSizeUsd: number;
        positionSizePct: number;
        stopLossPct: number;
        takeProfitPct: number;
        openedAt?: Date;
    }): Promise<AgentPosition>;
    /**
     * Updates the mark-to-market price and unrealized P&L for an open position.
     * Returns null if no open position exists for this token.
     */
    updateMarkToMarket(tokenAddress: string, currentPriceUsd: number, now?: Date): Promise<AgentPosition | null>;
    /**
     * Closes an open position. Returns null if no open position exists.
     */
    closePosition(tokenAddress: string, closePriceUsd: number, reason: CloseReason, closedAt?: Date): Promise<AgentPosition | null>;
    getOpenPosition(tokenAddress: string): Promise<AgentPosition | null>;
    getAllOpenPositions(): Promise<AgentPosition[]>;
    getAllPositions(): Promise<AgentPosition[]>;
    private mapRow;
}
//# sourceMappingURL=position-registry-service.d.ts.map