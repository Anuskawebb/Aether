# Execution Policies — Design Document

**Status:** Design only. No implementation exists yet.  
**Phase:** Pre-8B planning. Implementation begins alongside or after Phase 8B.

---

## What Is an Execution Policy?

An execution policy is the user-configured ruleset that sits between the Decision Engine output and the Executor. It answers the question: "Given that the intelligence layer recommends buying token X with 8% of the portfolio — should this specific agent, for this specific user, actually do it?"

Today, risk parameters live inside `trade_recommendations` (stop_loss_pct, take_profit_pct) and the `RiskEngine` enforces drawdown limits. These are agent-level controls. Execution policies extend this into user-level controls that are:

- Persistent (stored in DB, not just in-memory)
- Per-account (each execution account can have different constraints)
- Auditable (violations are logged)
- Enforceable across account types (TWAK, Smart Account, WalletConnect)

---

## Proposed Schema

### `execution_policies`

```sql
CREATE TABLE execution_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  execution_account_id  UUID REFERENCES execution_accounts(id) ON DELETE CASCADE,
  agent_id              VARCHAR(50) NOT NULL,

  -- Token allowlist / denylist
  allowed_tokens        VARCHAR(42)[],           -- NULL = allow all
  denied_tokens         VARCHAR(42)[],           -- Always blocked

  -- Per-trade limits
  max_trade_usd         NUMERIC(12, 2),          -- Max single trade size
  max_position_pct      NUMERIC(5, 2),           -- Max % of portfolio per token
  min_signal_score      NUMERIC(5, 2),           -- Min accumulation_score to act on

  -- Session limits
  daily_loss_pct        NUMERIC(5, 2),           -- Max daily loss as % of portfolio
  max_open_positions    INTEGER,                 -- Max concurrent positions
  max_daily_trades      INTEGER,                 -- Circuit breaker

  -- Mode
  auto_trade            BOOLEAN NOT NULL DEFAULT true,
  require_confirmation  BOOLEAN NOT NULL DEFAULT false,

  -- Lifecycle
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### `policy_violations`

```sql
CREATE TABLE policy_violations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id             UUID REFERENCES execution_policies(id),
  execution_account_id  UUID REFERENCES execution_accounts(id),
  recommendation_id     UUID,                    -- The recommendation that was blocked

  violation_type        VARCHAR(50) NOT NULL,    -- See types below
  details               JSONB,                   -- { field, limit, actual }

  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Example Policy Configuration

### Conservative User
```json
{
  "allowedTokens": ["0xbb4c...", "0x0e09..."],
  "deniedTokens": [],
  "maxTradeUsd": 50,
  "maxPositionPct": 5,
  "minSignalScore": 70,
  "dailyLossPct": 3,
  "maxOpenPositions": 3,
  "maxDailyTrades": 5,
  "autoTrade": true,
  "requireConfirmation": false
}
```

### Aggressive User
```json
{
  "allowedTokens": null,
  "deniedTokens": ["0xstablecoin..."],
  "maxTradeUsd": 500,
  "maxPositionPct": 15,
  "minSignalScore": 40,
  "dailyLossPct": 10,
  "maxOpenPositions": 10,
  "maxDailyTrades": null,
  "autoTrade": true,
  "requireConfirmation": false
}
```

### Assisted User (human-in-the-loop)
```json
{
  "autoTrade": false,
  "requireConfirmation": true,
  "maxTradeUsd": 200,
  "maxPositionPct": 10,
  "dailyLossPct": 5
}
```

---

## Validation Rules

| Field | Rule |
|---|---|
| `max_trade_usd` | Must be ≤ `portfolio_state.buying_power_usd` |
| `max_position_pct` | Must be ≤ 25 (hard cap, non-negotiable) |
| `min_signal_score` | Must be ≥ 0 and ≤ 100 |
| `daily_loss_pct` | Must be ≤ 20 (hard cap) |
| `max_open_positions` | Must be ≥ 1 and ≤ 20 |
| `allowed_tokens` + `denied_tokens` | Cannot overlap |
| `auto_trade = false` | Forces `require_confirmation = true` |

---

## Enforcement Flow

The policy check runs **between** Decision Engine output and Executor call, inside the ExecutionEngine `processOrders()` loop:

```
DecisionEngine.run()
  → trade_recommendations (PENDING)
    ↓
ExecutionEngine.createOrders()
  → execution_orders (PENDING)
    ↓
PolicyEngine.evaluate(order, policy)      ← NEW STEP
  → APPROVED or BLOCKED
    ↓ (APPROVED)
Executor.execute(order)
  → execution_transactions
    ↓ (BLOCKED)
PolicyViolationsRepository.log(violation)
execution_orders SET status = 'CANCELLED'
```

### PolicyEngine.evaluate() Logic

```typescript
interface PolicyDecision {
  approved: boolean
  blockedBy: string | null    // violation_type if blocked
  details: Record<string, unknown>
}

async function evaluate(order: ExecutionOrder, policy: ExecutionPolicy): Promise<PolicyDecision> {
  // 1. Token denylist (hard block, no override)
  if (policy.denied_tokens?.includes(order.tokenAddress)) {
    return block('TOKEN_DENIED', { token: order.tokenAddress })
  }

  // 2. Token allowlist (if set, only listed tokens are permitted)
  if (policy.allowed_tokens && !policy.allowed_tokens.includes(order.tokenAddress)) {
    return block('TOKEN_NOT_ALLOWED', { token: order.tokenAddress })
  }

  // 3. Trade size
  if (policy.max_trade_usd && order.amountUsd > policy.max_trade_usd) {
    return block('TRADE_SIZE_EXCEEDED', { limit: policy.max_trade_usd, actual: order.amountUsd })
  }

  // 4. Position concentration
  if (policy.max_position_pct && order.positionSizePct > policy.max_position_pct) {
    return block('POSITION_CONCENTRATION_EXCEEDED', { ... })
  }

  // 5. Daily loss circuit breaker
  const portfolio = await getPortfolioState(order.agentWallet)
  if (policy.daily_loss_pct && portfolio.rollingLossPct24h >= policy.daily_loss_pct) {
    return block('DAILY_LOSS_LIMIT_BREACHED', { ... })
  }

  // 6. Open positions count
  if (policy.max_open_positions) {
    const openCount = await countOpenPositions(order.agentWallet)
    if (openCount >= policy.max_open_positions) {
      return block('MAX_POSITIONS_REACHED', { ... })
    }
  }

  // 7. Manual confirmation required
  if (!policy.auto_trade || policy.require_confirmation) {
    return block('AWAITING_CONFIRMATION', { requiresUserAction: true })
  }

  // 8. Signal score floor
  if (policy.min_signal_score) {
    const signal = await getSignal(order.tokenAddress)
    if (signal.accumulation_score < policy.min_signal_score) {
      return block('SIGNAL_SCORE_TOO_LOW', { ... })
    }
  }

  return { approved: true, blockedBy: null, details: {} }
}
```

### Violation Types

| `violation_type` | Trigger |
|---|---|
| `TOKEN_DENIED` | Token is on the denylist |
| `TOKEN_NOT_ALLOWED` | Token not in allowlist |
| `TRADE_SIZE_EXCEEDED` | Trade > `max_trade_usd` |
| `POSITION_CONCENTRATION_EXCEEDED` | Position > `max_position_pct` |
| `DAILY_LOSS_LIMIT_BREACHED` | 24h loss ≥ `daily_loss_pct` |
| `MAX_POSITIONS_REACHED` | Open positions ≥ `max_open_positions` |
| `MAX_DAILY_TRADES_REACHED` | Daily trade count ≥ `max_daily_trades` |
| `SIGNAL_SCORE_TOO_LOW` | Signal below `min_signal_score` |
| `AWAITING_CONFIRMATION` | `require_confirmation = true` (not a failure — user must approve) |

---

## Integration with ExecutionEngine

The `ExecutionEngine` constructor gains an optional `PolicyEngine` dependency:

```typescript
export class ExecutionEngine {
  constructor(
    config: ExecutionEngineConfig,
    executor: Executor,
    policyEngine?: PolicyEngine,    // Optional — backward compatible
  )
}
```

If `policyEngine` is not provided, all orders pass through (preserving current behavior). This means:

- Phase 8B (TWAK): deploy ExecutionEngine without PolicyEngine — all orders execute
- Phase 8B+ (after policy UI exists): inject PolicyEngine — policies enforced per user

**The ExecutionEngine core loop does not change.** The policy gate is a pre-check in `processOrders()` before `executor.execute(order)` is called.

---

## Default Policy

When an execution account is created and no policy has been configured by the user, a default policy is applied:

```json
{
  "maxTradeUsd": 100,
  "maxPositionPct": 10,
  "minSignalScore": 40,
  "dailyLossPct": 5,
  "maxOpenPositions": 5,
  "maxDailyTrades": 20,
  "autoTrade": true,
  "requireConfirmation": false
}
```

This matches the "Balanced" strategy option in the onboarding flow.

---

## Onboarding Wizard Mapping

| Onboarding Choice | Policy Fields Set |
|---|---|
| Strategy: Conservative | `max_trade_usd=50`, `max_position_pct=5`, `daily_loss_pct=3`, `min_signal_score=70` |
| Strategy: Balanced | Default policy (see above) |
| Strategy: Aggressive | `max_trade_usd=500`, `max_position_pct=15`, `daily_loss_pct=10`, `min_signal_score=40` |
| Mode: Autonomous | `auto_trade=true`, `require_confirmation=false` |
| Mode: Assisted | `auto_trade=false`, `require_confirmation=true` |
| Mode: Manual | `auto_trade=false`, `require_confirmation=true` (and no orders are created) |
