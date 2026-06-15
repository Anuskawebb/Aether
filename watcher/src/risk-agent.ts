import { aiJSON } from './ai.js';

// ─────────────────────────────────────────────────────────────────────────────
//  AI risk-management agent — reviews an open position that is in the
//  "watch zone" (drawdown beyond half the vault's stop-loss threshold but
//  not yet past it) and decides whether to close early.
//
//  The hard stop-loss threshold (pnl-updater.ts) is NOT delegated to this
//  agent — it remains a non-AI safety floor checked independently. This
//  agent can only recommend *earlier* discretionary closes.
//
//  Returns null if OPENAI_API_KEY is unset or the call/parse fails; callers
//  should treat null as "hold" (no change to existing behavior).
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskInput {
  token:           string;
  entryPrice:      number;
  currentPrice:    number;
  pnlPct:          number; // signed, e.g. -0.12 = -12%
  riskLevel:       number; // vault risk tolerance 1-10
  stopLossPct:     number; // vault's hard stop-loss threshold, percent (e.g. 20)
  heldForMinutes:  number;
}

export interface RiskResult {
  action: 'hold' | 'close';
  reason: string;
}

const RISK_SYSTEM_PROMPT =
  'You are the risk-management agent for Aether, an on-chain copy-trading ' +
  'platform on Mantle. A follower vault holds an open position that is ' +
  'drawing down but has not yet hit its hard stop-loss threshold. Decide ' +
  'whether to close the position now ("close") or keep holding ("hold"). ' +
  'Consider the vault\'s risk tolerance (1=very conservative, should close ' +
  'earlier; 10=very aggressive, can tolerate more drawdown), how close the ' +
  'drawdown is to the hard stop-loss, and how long the position has been ' +
  'held (very fresh positions deserve more patience). ' +
  'Respond with strict JSON: {"action": "hold"|"close", "reason": "<one short sentence>"}.';

export async function assessPositionRiskAI(i: RiskInput): Promise<RiskResult | null> {
  const user =
    `Token: ${i.token}\n` +
    `Entry price: $${i.entryPrice.toFixed(6)}\n` +
    `Current price: $${i.currentPrice.toFixed(6)}\n` +
    `Unrealized P&L: ${(i.pnlPct * 100).toFixed(2)}%\n` +
    `Vault risk tolerance: ${i.riskLevel}/10\n` +
    `Hard stop-loss threshold: -${i.stopLossPct}%\n` +
    `Held for: ${i.heldForMinutes.toFixed(1)} minutes`;

  const result = await aiJSON<{ action: unknown; reason: unknown }>(RISK_SYSTEM_PROMPT, user);
  if (!result) return null;

  const action = result.action === 'close' ? 'close' : 'hold';
  const reason = typeof result.reason === 'string' ? result.reason : 'AI risk assessment';
  return { action, reason };
}
