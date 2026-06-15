// ─────────────────────────────────────────────────────────────────────────────
//  Off-chain copy-trade scorer
//
//  This is the Mantle-native replacement for the on-chain LLM "strategist" that
//  used to run on Somnia's Agent Platform. It is a faithful, deterministic port
//  of the exact rules the old on-chain prompt instructed the LLM to follow
//  (see the former VaultManager._buildPrompt): hard skip-rules, risk-level score
//  ceilings, signal-strength base, freshness adjustment, and free-balance
//  penalties. Output is an integer copy-score 0-100, identical in meaning to
//  before — the keeper passes it to executeCopyTrade().
//
//  scoreTrade() remains as the deterministic fallback. scoreTradeAI() below
//  is the OpenAI-backed agent used when OPENAI_API_KEY is configured.
// ─────────────────────────────────────────────────────────────────────────────

import { aiJSON } from './ai.js';

export interface ScoreInput {
  usdValue:    number; // leader trade size, USD (dollars)
  tradeAgeSec: number; // how old the leader trade is, seconds
  riskLevel:   number; // vault risk tolerance 1-10
  ausdLocked:  number; // vault total, USD (dollars)
  freeBalance: number; // vault free balance, USD (dollars)
}

export interface ScoreResult {
  score:  number; // 0-100
  reason: string;
}

const RISK_CEILING = (riskLevel: number): number =>
  riskLevel <= 2 ? 20 :
  riskLevel <= 4 ? 40 :
  riskLevel <= 6 ? 65 :
  riskLevel <= 8 ? 85 : 100;

/** Returns a hard-rule skip reason, or null if none of the safety
 *  invariants fire (i.e. it's safe to ask the AI agent for a score). */
function hardSkipReason(i: ScoreInput): string | null {
  const { usdValue, tradeAgeSec, ausdLocked, freeBalance } = i;
  if (freeBalance < 1)   return 'vault empty';
  if (tradeAgeSec > 120) return 'stale signal (>120s)';
  if (usdValue < 5)      return 'noise trade (<$5)';
  if (freeBalance < 10)  return 'vault nearly empty (<$10 free)';
  const tradeVsFreePct = freeBalance > 0 ? (usdValue / freeBalance) * 100 : 0;
  if (tradeVsFreePct > 100) return "cannot afford the leader's size";
  void ausdLocked;
  return null;
}

/** Returns an integer copy-score 0-100. 0 = skip. */
export function scoreTrade(i: ScoreInput): number {
  const { usdValue, tradeAgeSec, riskLevel, ausdLocked, freeBalance } = i;

  // ── Hard rules (apply strictly in order) ─────────────────────────────────
  if (hardSkipReason(i)) return 0;

  const tradeVsVaultPct = ausdLocked  > 0 ? (usdValue / ausdLocked)  * 100 : 0;
  const tradeVsFreePct  = freeBalance > 0 ? (usdValue / freeBalance) * 100 : 0;

  // ── Signal strength → base score (size vs follower vault, NOT raw $) ──────
  let score: number;
  if (tradeVsVaultPct < 5)        score = 30; // weak signal
  else if (tradeVsVaultPct < 20)  score = 55; // moderate
  else if (tradeVsVaultPct < 50)  score = 75; // strong
  else                            score = 90; // very strong (big leader move)

  // ── Freshness adjustment ─────────────────────────────────────────────────
  if (tradeAgeSec < 10)      score += 10;
  else if (tradeAgeSec > 30) score -= 10; // 30-120s window

  // ── Free-balance penalties ───────────────────────────────────────────────
  if (ausdLocked > 0 && freeBalance < 0.10 * ausdLocked) score *= 0.7;
  if (tradeVsFreePct > 50)                               score *= 0.8;

  // ── Risk-level score ceiling ─────────────────────────────────────────────
  if (score > RISK_CEILING(riskLevel)) score = RISK_CEILING(riskLevel);

  // ── Clamp ────────────────────────────────────────────────────────────────
  score = Math.round(score);
  if (score < 0)   score = 0;
  if (score > 100) score = 100;
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
//  AI copy-score agent — asks an LLM to weigh the same signal that
//  scoreTrade() weighs deterministically, but with room for judgment
//  (e.g. trading off freshness vs. signal strength). The hard safety
//  rules above are NOT delegated to the model — they're checked first
//  and short-circuit before any API call.
//
//  Returns null if OPENAI_API_KEY is unset or the call/parse fails;
//  callers should fall back to scoreTrade().
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_SYSTEM_PROMPT =
  'You are the copy-trade scoring agent for Aether, an on-chain copy-trading ' +
  'platform on Mantle. Given a leader trade and a follower vault\'s state, ' +
  'output a copy-score from 0-100 representing how strongly the follower ' +
  'vault should mirror this trade (0 = skip entirely, 100 = full conviction). ' +
  'Weigh: signal strength (trade size relative to the vault), freshness ' +
  '(older signals are less reliable), and the vault\'s risk tolerance ' +
  '(1=very conservative, 10=very aggressive — conservative vaults should get ' +
  'lower scores even for strong signals). ' +
  `Respond with strict JSON: {"score": <integer 0-100>, "reason": "<one short sentence>"}.`;

export async function scoreTradeAI(i: ScoreInput): Promise<ScoreResult | null> {
  const skip = hardSkipReason(i);
  if (skip) return { score: 0, reason: `hard rule: ${skip}` };

  const { usdValue, tradeAgeSec, riskLevel, ausdLocked, freeBalance } = i;
  const tradeVsVaultPct = ausdLocked  > 0 ? (usdValue / ausdLocked)  * 100 : 0;
  const tradeVsFreePct  = freeBalance > 0 ? (usdValue / freeBalance) * 100 : 0;

  const user =
    `Leader trade size: $${usdValue.toFixed(2)}\n` +
    `Trade age: ${tradeAgeSec}s\n` +
    `Vault risk tolerance: ${riskLevel}/10\n` +
    `Vault total (aUSD locked): $${ausdLocked.toFixed(2)}\n` +
    `Vault free balance: $${freeBalance.toFixed(2)}\n` +
    `Trade size vs. vault total: ${tradeVsVaultPct.toFixed(1)}%\n` +
    `Trade size vs. free balance: ${tradeVsFreePct.toFixed(1)}%`;

  const result = await aiJSON<{ score: unknown; reason: unknown }>(SCORE_SYSTEM_PROMPT, user);
  if (!result) return null;

  let score = Number(result.score);
  if (!Number.isFinite(score)) return null;

  const ceiling = RISK_CEILING(riskLevel);
  score = Math.round(Math.max(0, Math.min(100, Math.min(score, ceiling))));

  const reason = typeof result.reason === 'string' ? result.reason : 'AI score';
  return { score, reason };
}
