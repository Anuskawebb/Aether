import { DEFAULT_COPY_PCT, POOL } from './config.js';
function clamp(v, max) {
    if (!Number.isFinite(v) || v <= 0)
        return 0;
    return Math.max(0, Math.min(v, max));
}
export function resolveBuyAmount(modelKey, modelConfig, availableCashUsd, startingCapitalUsd, leaderUsdValue, leaderRatio) {
    if (availableCashUsd <= 0)
        return 0;
    switch (modelKey) {
        case 'fixed_available_pct': {
            const pct = (modelConfig.buyPct ?? DEFAULT_COPY_PCT) / 100;
            return clamp(availableCashUsd * pct, availableCashUsd);
        }
        case 'fixed_starting_pct': {
            const pct = (modelConfig.buyPct ?? DEFAULT_COPY_PCT) / 100;
            return clamp(startingCapitalUsd * pct, availableCashUsd);
        }
        case 'current_ratio':
            return clamp(availableCashUsd * leaderRatio, availableCashUsd);
        case 'target_buy_pct_with_cap': {
            const targetPct = (modelConfig.targetBuyPct ?? 1) / 100;
            const maxPct = (modelConfig.maxBuyPct ?? 20) / 100;
            return clamp(Math.min(leaderUsdValue * targetPct, availableCashUsd * maxPct), availableCashUsd);
        }
        case 'hybrid_envelope_leader_ratio': {
            const envPct = (modelConfig.envelopePct ?? 50) / 100;
            return clamp(availableCashUsd * envPct * leaderRatio, availableCashUsd);
        }
        default:
            return 0;
    }
}
// ── Engine ────────────────────────────────────────────────────────────────────
export async function processTrade(intent, db) {
    if (intent.isStale && intent.side === 'BUY') {
        console.log(`[engine] Skipping stale BUY from ${intent.leader.slice(0, 8)}…`);
        return;
    }
    const followerAddresses = await db.getFollowers(intent.leader);
    if (followerAddresses.length === 0)
        return;
    await Promise.allSettled(followerAddresses.map((f) => applyTrade(f, intent, db)));
}
async function applyTrade(follower, intent, db) {
    const vault = await db.getVault(follower);
    if (!vault)
        return;
    intent.side === 'BUY'
        ? await paperBuy(follower, vault, intent, db)
        : await paperSell(follower, vault, intent, db);
}
async function paperBuy(follower, vault, intent, db) {
    const spendUsdc = resolveBuyAmount(vault.copyModelKey ?? 'fixed_available_pct', vault.copyModelConfig ?? {}, vault.virtualUsdc, vault.startingCapital, intent.usdValue, 0.1);
    if (spendUsdc < 0.01)
        return;
    const wsomiAmount = spendUsdc / intent.wsomiPrice;
    await db.recordPaperTrade({
        follower, leader: intent.leader,
        side: 'BUY', token: POOL.token0.symbol,
        usdcSpent: spendUsdc, tokenAmount: wsomiAmount,
        entryPrice: intent.wsomiPrice,
        txHash: intent.txHash, timestamp: intent.timestamp,
    });
    await db.debitVirtualUsdc(follower, spendUsdc);
    console.log(`[engine] BUY  ${follower.slice(0, 8)}… ` +
        `$${spendUsdc.toFixed(2)} → ${wsomiAmount.toFixed(4)} WSOMI @ $${intent.wsomiPrice.toFixed(4)}`);
}
async function paperSell(follower, vault, intent, db) {
    const pos = await db.getOpenPosition(follower, intent.leader, POOL.token0.symbol);
    if (!pos)
        return;
    const pnlPct = (intent.wsomiPrice - pos.entryPrice) / pos.entryPrice;
    const pnl = pos.usdcSpent * pnlPct;
    const exitUsdc = pos.usdcSpent + pnl;
    await db.closePosition(pos.id, intent.wsomiPrice, pnl);
    await db.creditVirtualUsdc(follower, exitUsdc);
    console.log(`[engine] SELL ${follower.slice(0, 8)}… ` +
        `${pos.tokenAmount.toFixed(4)} WSOMI @ $${intent.wsomiPrice.toFixed(4)} ` +
        `P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${(pnlPct * 100).toFixed(2)}%)`);
}
