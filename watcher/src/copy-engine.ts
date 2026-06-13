import { DEFAULT_COPY_PCT, POOL } from './config.js';
import type { TradeIntent }        from './parser.js';
import type { Db, Vault }          from './db.js';

// ── Allocation models ─────────────────────────────────────────────────────────

export type CopyModelKey =
  | 'fixed_available_pct'
  | 'fixed_starting_pct'
  | 'current_ratio'
  | 'target_buy_pct_with_cap'
  | 'hybrid_envelope_leader_ratio';

export interface CopyModelConfig {
  buyPct?:      number;
  envelopePct?: number;
  targetBuyPct?: number;
  maxBuyPct?:   number;
}

function clamp(v: number, max: number) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.max(0, Math.min(v, max));
}

export function resolveBuyAmount(
  modelKey:           CopyModelKey,
  modelConfig:        CopyModelConfig,
  availableCashUsd:   number,
  startingCapitalUsd: number,
  leaderUsdValue:     number,
  leaderRatio:        number,
): number {
  if (availableCashUsd <= 0) return 0;
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
      const maxPct    = (modelConfig.maxBuyPct    ?? 20) / 100;
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

export async function processTrade(intent: TradeIntent, db: Db): Promise<void> {
  if (intent.isStale && intent.side === 'BUY') {
    console.log(`[engine] Skipping stale BUY from ${intent.leader.slice(0, 8)}…`);
    return;
  }

  const followerAddresses = await db.getFollowers(intent.leader);
  if (followerAddresses.length === 0) return;

  await Promise.allSettled(
    followerAddresses.map((f) => applyTrade(f, intent, db)),
  );
}

async function applyTrade(follower: `0x${string}`, intent: TradeIntent, db: Db) {
  const vault = await db.getVault(follower);
  if (!vault) return;
  intent.side === 'BUY'
    ? await paperBuy(follower, vault, intent, db)
    : await paperSell(follower, vault, intent, db);
}

async function paperBuy(follower: `0x${string}`, vault: Vault, intent: TradeIntent, db: Db) {
  const spendUsdc = resolveBuyAmount(
    vault.copyModelKey    ?? 'fixed_available_pct',
    vault.copyModelConfig ?? {},
    vault.virtualUsdc,
    vault.startingCapital,
    intent.usdValue,
    0.1,
  );
  if (spendUsdc < 0.01) return;

  const wmntAmount = spendUsdc / intent.wmntPrice;
  await db.recordPaperTrade({
    follower, leader: intent.leader,
    side: 'BUY', token: POOL.token1.symbol,
    usdcSpent: spendUsdc, tokenAmount: wmntAmount,
    entryPrice: intent.wmntPrice,
    txHash: intent.txHash, timestamp: intent.timestamp,
  });
  await db.debitVirtualUsdc(follower, spendUsdc);

  console.log(
    `[engine] BUY  ${follower.slice(0, 8)}… ` +
    `$${spendUsdc.toFixed(2)} → ${wmntAmount.toFixed(4)} WMNT @ $${intent.wmntPrice.toFixed(4)}`
  );
}

async function paperSell(follower: `0x${string}`, vault: Vault, intent: TradeIntent, db: Db) {
  const pos = await db.getOpenPosition(follower, intent.leader, POOL.token1.symbol);
  if (!pos) return;

  const pnlPct   = (intent.wmntPrice - pos.entryPrice) / pos.entryPrice;
  const pnl      = pos.usdcSpent * pnlPct;
  const exitUsdc = pos.usdcSpent + pnl;

  await db.closePosition(pos.id, intent.wmntPrice, pnl);
  await db.creditVirtualUsdc(follower, exitUsdc);

  console.log(
    `[engine] SELL ${follower.slice(0, 8)}… ` +
    `${pos.tokenAmount.toFixed(4)} WMNT @ $${intent.wmntPrice.toFixed(4)} ` +
    `P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${(pnlPct * 100).toFixed(2)}%)`
  );
}
