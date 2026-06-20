# V2 Database Plan — Design Document

**Status:** Planning only. No migrations to create yet.  
**Goal:** Document what new tables are needed to support multi-account execution and policy enforcement, and how they relate to existing schema.

---

## Current Schema (Relevant Tables)

```
trades
wallet_metrics
wallet_scores
token_metrics
smart_money_signals
trade_recommendations  ← decision engine output
execution_orders       ← references agentWallet (flat string)
execution_transactions ← references agentWallet (flat string)
agent_positions        ← references agentWallet (flat string)
portfolio_state        ← PK is agentWallet (flat string)
```

**Key observation:** `agentWallet` is currently a plain `varchar(42)` scattered across 5 tables. It works fine for a single-agent system but has no FK constraint to any accounts table. V2 adds the `execution_accounts` table as the source of truth for wallets, without requiring changes to the existing columns.

---

## New Tables Required

### 1. `execution_accounts`

The source of truth for all execution wallets — TWAK agent wallets, smart accounts, and WalletConnect sessions.

```sql
CREATE TABLE execution_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id           VARCHAR(255),              -- NULL for system-owned TWAK accounts (V1)
  agent_id          VARCHAR(50) NOT NULL,      -- Stable agent identifier

  account_type      VARCHAR(30) NOT NULL       -- TWAK_AGENT | SMART_ACCOUNT | WALLETCONNECT
                    CHECK (account_type IN ('TWAK_AGENT', 'SMART_ACCOUNT', 'WALLETCONNECT')),

  wallet_address    VARCHAR(42) NOT NULL,      -- The on-chain address used for execution
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED')),

  metadata          JSONB,                     -- Type-specific data (session keys, TWAK IDs, etc.)

  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (agent_id, wallet_address)
);

CREATE INDEX exec_accounts_agent_id_idx ON execution_accounts (agent_id);
CREATE INDEX exec_accounts_user_id_idx  ON execution_accounts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX exec_accounts_status_idx   ON execution_accounts (status);
```

**Relationship to existing tables:**

No FK from existing tables to this one is required in V1. The `agentWallet` in `execution_orders` etc. will match `execution_accounts.wallet_address` logically, but a hard FK constraint is not added until V2 migration (to avoid breaking existing data).

---

### 2. `execution_policies`

Per-account trade policy configuration. Enforced between DecisionEngine and Executor.

```sql
CREATE TABLE execution_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  execution_account_id  UUID REFERENCES execution_accounts(id) ON DELETE CASCADE,
  agent_id              VARCHAR(50) NOT NULL,

  -- Token filtering
  allowed_tokens        VARCHAR(42)[],          -- NULL = allow all
  denied_tokens         VARCHAR(42)[],          -- Always blocked regardless of signal

  -- Per-trade limits
  max_trade_usd         NUMERIC(12, 2),         -- Max single trade value
  max_position_pct      NUMERIC(5, 2),          -- Max % portfolio per token position
  min_signal_score      NUMERIC(5, 2),          -- Min accumulation_score required
  min_signal_tier       VARCHAR(10),            -- STRONG | MODERATE | WEAK | NOISE

  -- Session limits
  daily_loss_pct        NUMERIC(5, 2),          -- Max 24h loss as % of portfolio
  max_open_positions    INTEGER,                -- Max concurrent open positions
  max_daily_trades      INTEGER,                -- Circuit breaker: max trades/day

  -- Execution mode
  auto_trade            BOOLEAN NOT NULL DEFAULT true,
  require_confirmation  BOOLEAN NOT NULL DEFAULT false,

  -- Lifecycle
  is_active             BOOLEAN NOT NULL DEFAULT true,

  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX exec_policies_account_active_idx
  ON execution_policies (execution_account_id)
  WHERE is_active = true;                       -- Only one active policy per account
```

---

### 3. `policy_violations`

Audit log of every order blocked or modified by the policy engine.

```sql
CREATE TABLE policy_violations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  policy_id             UUID REFERENCES execution_policies(id),
  execution_account_id  UUID REFERENCES execution_accounts(id),
  recommendation_id     UUID,                   -- trade_recommendations.id (soft reference)
  order_id              UUID,                   -- execution_orders.id if order was already created

  violation_type        VARCHAR(50) NOT NULL,

  details               JSONB,
  -- Example: { "field": "max_trade_usd", "limit": 100, "actual": 287.5 }

  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX policy_violations_account_idx ON policy_violations (execution_account_id);
CREATE INDEX policy_violations_type_idx    ON policy_violations (violation_type);
CREATE INDEX policy_violations_created_idx ON policy_violations (created_at DESC);
```

---

### 4. `execution_permissions` (Smart Account only)

Tracks the on-chain delegation state for smart accounts. One row per active session key.

```sql
CREATE TABLE execution_permissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  execution_account_id  UUID REFERENCES execution_accounts(id) ON DELETE CASCADE,

  permission_type       VARCHAR(30) NOT NULL,   -- SESSION_KEY | SAFE_MODULE | WC_SESSION

  -- The delegated key / module
  delegate_address      VARCHAR(42) NOT NULL,   -- Session key or module address

  -- Scope
  allowed_tokens        VARCHAR(42)[],          -- On-chain permission scope
  max_amount_per_tx_usd NUMERIC(12, 2),
  expires_at            TIMESTAMP,              -- Session key expiry

  -- On-chain reference
  chain_id              INTEGER NOT NULL DEFAULT 56,
  tx_hash               VARCHAR(66),            -- Transaction that enabled the permission

  -- Lifecycle
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),

  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMP
);

CREATE INDEX exec_permissions_account_idx ON execution_permissions (execution_account_id);
CREATE INDEX exec_permissions_status_idx  ON execution_permissions (status);
```

---

## Schema Relationships

```
execution_accounts (id, agent_id, wallet_address, account_type, status)
   │
   ├──► execution_policies (execution_account_id)
   │         │
   │         └──► policy_violations (policy_id, execution_account_id)
   │
   └──► execution_permissions (execution_account_id)  [SMART_ACCOUNT only]


execution_accounts.wallet_address
   ↕ logical match (no FK yet — V1)
execution_orders.agent_wallet
agent_positions.agent_wallet
portfolio_state.agent_wallet (PK)
trade_recommendations.agent_wallet
execution_transactions.agent_wallet
```

---

## Migration Strategy

### Step 1 — Create new tables (additive, no breakage)

```sql
-- No existing tables change
CREATE TABLE execution_accounts ...
CREATE TABLE execution_policies ...
CREATE TABLE policy_violations ...
CREATE TABLE execution_permissions ...
```

### Step 2 — Backfill existing agent wallet

```sql
INSERT INTO execution_accounts (agent_id, account_type, wallet_address, status)
VALUES (
  'toro-agent-001',
  'TWAK_AGENT',
  (SELECT DISTINCT agent_wallet FROM portfolio_state LIMIT 1),
  'ACTIVE'
)
ON CONFLICT DO NOTHING;
```

### Step 3 — Backfill default policy

```sql
INSERT INTO execution_policies (execution_account_id, agent_id, max_trade_usd, max_position_pct,
                                 daily_loss_pct, max_open_positions, auto_trade)
SELECT id, agent_id, 100, 10, 5, 5, true
FROM execution_accounts
WHERE status = 'ACTIVE';
```

### Step 4 — Update orchestrator to look up execution_accounts

Change how `ExecutionEngineConfig` is populated:

```typescript
// Before
const config = { agentId: 'toro-agent-001', agentWallet: process.env.AGENT_WALLET! }

// After
const account = await ExecutionAccountRepository.getActive('toro-agent-001')
const config = { agentId: account.agentId, agentWallet: account.walletAddress }
```

### Step 5 — (V2 only) Add FK constraints to existing tables

After confirming all data is consistent:

```sql
ALTER TABLE execution_orders
  ADD COLUMN execution_account_id UUID REFERENCES execution_accounts(id);

ALTER TABLE agent_positions
  ADD COLUMN execution_account_id UUID REFERENCES execution_accounts(id);

-- Backfill via wallet_address join
UPDATE execution_orders eo
SET execution_account_id = ea.id
FROM execution_accounts ea
WHERE eo.agent_wallet = ea.wallet_address;
```

This step is **explicitly deferred** until V2. No migration today.

---

## What Does NOT Change

These tables are part of the intelligence pipeline and have no dependency on execution accounts:

```
trades
wallet_metrics
wallet_scores
token_metrics
smart_money_signals
```

These tables work as-is and require no V2 changes:

```
trade_recommendations    (agentWallet remains a flat string — fine)
indexer_state
price_observations
portfolio_snapshots
```

---

## Summary: What to Create vs. Defer

| Table | When | Notes |
|---|---|---|
| `execution_accounts` | Phase 8B | Create alongside TwakExecutor |
| `execution_policies` | Phase 8B | Create with default policy per account |
| `policy_violations` | Phase 8B | Create empty; populate when PolicyEngine ships |
| `execution_permissions` | Phase 8C | Only needed for Smart Account session keys |
| FK backfill on existing tables | Phase V2 | Deferred — not needed for Phase 8B function |
