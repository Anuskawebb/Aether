# Aionis — Implementation Plan

> Last updated: 2026-06-06  
> Status: Planning complete, ready to build

---

## What We're Building

Aionis is a copy-trading platform on Somnia mainnet. Users follow top traders, create per-trader vaults funded with AUSDC (our test stablecoin), and an AI agent pipeline automatically mirrors every trade into a virtual position. Nothing is actually swapped on a DEX — the stablecoin is locked in the smart contract and P&L is tracked virtually against real market prices.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Chain | Somnia Mainnet (chain ID 50312, `dream-rpc.somnia.network`) |
| Auth | Dynamic (Google / email / MetaMask) |
| Test token | AUSDC — new ERC-20, 6 decimals, faucet-mintable |
| Core contract | VaultManager.sol |
| AI pipeline | Somnia Agent Platform (JSON API Agent + LLM Agent) |
| Data | PostgreSQL + Prisma |
| Watcher | Node.js — WebSocket + HTTP polling on Somnia mainnet |
| Frontend | Next.js App Router |

---

## Architecture Overview

```
USER
 │  Dynamic auth (Google / email / MetaMask)
 ▼
FRONTEND (Next.js)
 │  /app/leaderboard  →  browse traders
 │  /app/vaults       →  create & manage vaults
 │  /app/portfolio    →  P&L across all vaults
 ▼
SMART CONTRACTS (Somnia mainnet)
 │
 ├── AUSDC.sol              ERC-20 test token + faucet (10k AUSDC / day / address)
 │
 └── VaultManager.sol
       │  createVault(leader, amount, riskLevel, maxPct, allowlist[])
       │  setKeeper(serverWallet)     ← user delegates backend to trigger trades
       │  updatePrice(token)          ← server triggers periodically
       │  checkLeaderActivity(f, l)   ← server triggers on leader trade
       │
       │  ── 3-agent pipeline ──
       │  → JSON API Agent fetches /api/agent/leader/{addr}/latest-swap
       │  ← onWatcherResponse()       stale / allowlist checks
       │  → LLM Agent scores trade (0-100) given risk profile
       │  ← onStrategistResponse()    records virtual Position on-chain
       │
       │  ── price pipeline ──
       │  → JSON API Agent fetches /api/price/{token}
       │  ← onPriceUpdate()           stores latestPrice[token] on-chain
       │  getUnrealizedPnL()          view fn — live P&L from stored price

OFF-CHAIN
 ├── Watcher Service
 │     WebSocket detects leader swap → keeper wallet calls
 │     checkLeaderActivity(follower) for each follower of that leader
 │     also calls updatePrice(token) on each new swap
 │
 ├── PostgreSQL (Prisma)
 │     mirrors on-chain state for fast UI queries
 │
 └── Next.js API
       /api/agent/leader/[addr]/latest-swap  ← read by JSON API Agent
       /api/price/[token]                    ← read by JSON API Agent
       /api/traders/leaderboard              ← frontend
       /api/vaults/[address]                 ← frontend
       /api/portfolio/[address]              ← frontend
```

---

## User Flow

```
1. LAND ON /
   Click "Launch App"

2. AUTH (Dynamic modal)
   ┌──────────────────────────────────┐
   │  Continue with Google            │  → embedded wallet auto-created
   │  Continue with Email             │  → embedded wallet auto-created
   │  Connect MetaMask / WalletConnect│  → use existing wallet
   └──────────────────────────────────┘

3. ONBOARDING (first time)
   AUSDC balance = 0 → banner: "Claim 10,000 AUSDC to start"
   Click → faucet contract mints AUSDC to wallet (1 claim / 24h)

4. LEADERBOARD  /app/leaderboard
   Table of all addresses that traded WSOMI/USDC.e on QuickSwap
   Columns: Rank, Address, Volume, Trades, Buy/Sell ratio, Last trade
   Time windows: 5m / 30m / 1h / 6h / 12h / 24h
   Each row: [ View Profile ]  [ Copy Trade ]

5. LEADER PROFILE  /app/traders/[address]
   Trade history chart, win rate, avg trade size, follower count
   [ Copy Trade ] button → opens vault creation modal

6. CREATE VAULT (3-step modal)
   Step 1/3 — Deposit
     "How much AUSDC to lock in this vault?"
     Input: amount  (min 10 AUSDC)
     → approve() AUSDC to VaultManager

   Step 2/3 — Risk Settings
     Risk level:     [1 ──────────── 10]  (1 = conservative, 10 = aggressive)
     Max per trade:  [___]% of vault      (default 20%)
     Token allowlist: WSOMI ✓ (more tokens coming)

   Step 3/3 — Confirm
     Leader:        0x419c…
     Vault size:    1,000 AUSDC
     Risk level:    6/10
     Max per trade: 200 AUSDC
     [ Activate Vault ] → createVault() on-chain

7. VAULT IS ACTIVE
   User can have multiple vaults (one per leader)
   Vault A → Leader 0x419c…  [1,000 AUSDC]  active
   Vault B → Leader 0xbf3a…  [  500 AUSDC]  active
   Actions per vault: Deposit | Pause | Close & Withdraw

8. COPY TRADE HAPPENS (automatic)
   Leader trades on-chain
   → Watcher detects swap (<1s via WebSocket)
   → Keeper wallet calls checkLeaderActivity(follower, leader) on-chain
   → Somnia JSON API Agent fetches latest trade from your API
   → Somnia LLM Agent scores the trade (0-100) given risk profile
   → If score ≥ threshold: Position recorded on-chain, AUSDC locked
   → No DEX swap, no real token movement — purely virtual

9. POSITION CLOSES (automatic)
   Leader makes a SELL trade
   → Watcher detects it
   → Keeper calls closePosition(positionId)
   → Contract calculates P&L using latestPrice[WSOMI]
   → P&L written on-chain, vault balance updated
   → PositionClosed event emitted

10. PORTFOLIO  /app/portfolio
    Cross-vault summary: total locked, total P&L, open positions
    Per-vault drill-down: /app/vaults/[leader]
      Open positions table + P&L chart + trade history
```

---

## Copy Trade Pipeline (detailed)

```
SOMNIA MAINNET POOL (WSOMI/USDC.e on QuickSwap)
         │
         │  Swap event
         ▼
┌─────────────────────┐
│   Watcher Service   │  WebSocket + HTTP fallback
└──────────┬──────────┘
           │  parseSwapLog → TradeIntent
           │
           ├── db.recordLeaderSwap()        always (for leaderboard)
           ├── db.upsertTokenPrice(price)   always (for /api/price endpoint)
           │
           └── for each follower with active vault for this leader:
                         │
                         ▼
               keeper.callCheckLeaderActivity(follower, leader)
                         │ (server wallet pays gas — near-zero on Somnia)
                         ▼
               VaultManager.checkLeaderActivity()
                         │
                         │ createRequest(agentId=1, encode(url, jsonPath))
                         ▼
               Somnia JSON API Agent (id=1)
                         │ GET /api/agent/leader/{leader}/latest-swap
                         │ ← your Next.js API → Postgres
                         ▼
               onWatcherResponse(requestId, tradeData)
                         │
                         ├── stale? (> 5 min)     → skip
                         ├── wrong pair?           → skip
                         ├── vault paused?         → skip
                         └── passes:
                               │
                               │ createRequest(agentId=2, encode(prompt))
                               ▼
               Somnia LLM Agent (id=2)
                         │ Prompt includes:
                         │   trade direction (BUY/SELL)
                         │   trade size ($USD)
                         │   trade age (seconds)
                         │   leader recent win rate
                         │   follower riskLevel (1-10)
                         │   vault balance remaining
                         │   maxPerTrade setting
                         │ Returns: integer 0-100
                         ▼
               onStrategistResponse(requestId, score)
                         │
                         ├── score < threshold     → skip, emit CopyTradeSkipped
                         └── score ≥ threshold:
                               │
                               │ ausdcAllocated = (score/100) × min(maxPerTrade, balance)
                               │ position = {
                               │   follower, leader, ausdcAllocated,
                               │   entryPrice = latestPrice[WSOMI],
                               │   status: OPEN
                               │ }
                               │ vault.ausdcLocked -= ausdcAllocated (internal accounting)
                               │ emit PositionOpened(...)
                               ▼
                         NO DEX SWAP. AUSDC stays in contract.
```

---

## Smart Contracts

### AUSDC.sol (new)

```
ERC-20 · 6 decimals · test stablecoin

faucet()
  └── mints 10,000 AUSDC to caller
  └── rate-limited: 1 claim per address per 24h
  └── tracks lastFaucet[address]

mint(address to, uint256 amount)
  └── owner-only (VaultManager whitelisted)
```

### VaultManager.sol (new — replaces AionisAgentManager)

```
Constants:
  AGENT_PLATFORM  = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
  JSON_API_AGENT  = 1
  LLM_AGENT       = 2
  MAX_TRADE_AGE   = 5 minutes  (30s is too tight for agent round-trip)

Storage:
  vaults[keccak256(follower, leader)]  → VaultConfig
  positions[positionId]                → Position
  keeperOf[follower]                   → keeper address
  requestToVault[requestId]            → vaultId
  pendingTradeData[vaultId]            → bytes (trade data between callbacks)
  latestPrice[token]                   → uint256

VaultConfig {
  address   follower
  address   leader
  uint256   ausdcLocked
  uint8     riskLevel       (1-10)
  uint8     maxPerTradePct  (1-100)
  address[] allowlist
  Status    status          (ACTIVE | PAUSED | CLOSED)
}

Position {
  address follower
  address leader
  bytes32 vaultId
  uint256 ausdcAllocated
  uint256 entryPrice      (price × 1e10)
  uint256 exitPrice       (0 if open)
  int256  pnl
  Status  status          (OPEN | CLOSED)
  uint256 openedAt
  uint256 closedAt
}

Functions:
  createVault(leader, amount, riskLevel, maxPerTradePct, allowlist[])
  setKeeper(keeperAddress)
  deposit(leader, amount)
  withdraw(leader)              only when no OPEN positions
  pauseVault(leader)
  checkLeaderActivity(follower, leader)   requires follower OR keeper
  onWatcherResponse(requestId, data)      onlyAgentPlatform
  onStrategistResponse(requestId, score)  onlyAgentPlatform
  updatePrice(token)
  onPriceUpdate(requestId, price)         onlyAgentPlatform
  getUnrealizedPnL(follower, leader)      view
  closePosition(positionId)              requires follower OR keeper
```

### FollowerRegistry.sol (keep as-is)

---

## Database Schema Changes

### New models (add to both `/prisma/schema.prisma` and `/watcher/prisma/schema.prisma`)

```prisma
model Position {
  id             String    @id @default(uuid())
  follower       String
  leader         String
  vaultId        String    @map("vault_id")
  ausdcAllocated Decimal   @map("ausdc_allocated") @db.Decimal(20, 6)
  entryPrice     Decimal   @map("entry_price")     @db.Decimal(20, 10)
  exitPrice      Decimal?  @map("exit_price")      @db.Decimal(20, 10)
  pnl            Decimal?  @db.Decimal(20, 6)
  status         String    @default("OPEN")
  openedAt       DateTime  @map("opened_at")
  closedAt       DateTime? @map("closed_at")
  txHashOpen     String?   @map("tx_hash_open")
  txHashClose    String?   @map("tx_hash_close")

  @@index([follower, status])
  @@index([leader, status])
  @@map("positions")
}

model TokenPrice {
  token     String   @id
  price     Decimal  @db.Decimal(20, 10)
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("token_prices")
}
```

### Expand existing `Vault` model

```prisma
model Vault {
  // existing fields stay
  address         String  @id
  virtualUsdc     Decimal ...
  startingCapital Decimal ...
  copyModelKey    String  ...
  copyModelConfig Json    ...

  // new fields
  leaderAddress   String?  @map("leader_address")
  riskLevel       Int?     @map("risk_level")
  maxPerTradePct  Int?     @map("max_per_trade_pct")
  allowlistJson   Json     @default("[]") @map("allowlist_json")
  status          String   @default("ACTIVE")
  onChainVaultId  String?  @map("on_chain_vault_id")

  follows         Follow[]
  paperTrades     PaperTrade[]
}
```

---

## API Routes

| Route | Status | Purpose |
|---|---|---|
| `GET /api/agent/leader/[address]/latest-swap` | Exists | Called by Somnia JSON API Agent |
| `GET /api/price/[token]` | **New** | Called by Somnia JSON API Agent for price updates |
| `GET /api/traders/leaderboard` | Exists | Leaderboard data |
| `GET /api/traders/[address]` | Exists | Single trader stats |
| `GET /api/traders/search` | Exists | Address search |
| `GET /api/vaults/[address]` | **New** | User's vaults + open positions |
| `GET /api/portfolio/[address]` | **New** | Cross-vault P&L summary |
| `POST /api/vault` | Exists (update) | Add createVault / deposit / withdraw DB sync |

### `/api/price/[token]` response shape
```json
{
  "token": "WSOMI",
  "price": 0.04230000,
  "updatedAt": "2026-06-06T12:34:56Z"
}
```
JSON path for agent: `"$.price"`

---

## Frontend Pages

| Route | Status | Description |
|---|---|---|
| `/` | Exists | Landing page (untouched) |
| `/app` | **New** | Auth-gated app shell |
| `/app/leaderboard` | **New** | Trader leaderboard (refactored from `/traders`) |
| `/app/traders/[address]` | **New** | Leader profile: chart, win rate, followers |
| `/app/vaults` | **New** | All user vaults + aggregate stats |
| `/app/vaults/[leader]` | **New** | Single vault: positions, P&L chart, history |
| `/app/portfolio` | **New** | Cross-vault P&L summary |
| `/app/faucet` | **New** | Claim AUSDC test tokens |
| `/traders` | Redirect | → `/app/leaderboard` |
| `/portfolio` | Redirect | → `/app/portfolio` |

### Route group structure
```
src/app/
  (marketing)/          ← landing + public pages
    layout.tsx          ← LandingNav only
    page.tsx            ← homepage
  app/                  ← auth-gated app
    layout.tsx          ← AppNav + AuthGuard
    leaderboard/page.tsx
    traders/[address]/page.tsx
    vaults/page.tsx
    vaults/[leader]/page.tsx
    portfolio/page.tsx
    faucet/page.tsx
```

---

## New Components

| Component | Purpose |
|---|---|
| `src/components/AuthGuard.tsx` | Gates `/app/*` routes, shows Dynamic sign-in if not authenticated |
| `src/components/AppNav.tsx` | Authenticated app navbar (separate from landing `Navbar.tsx`) |
| `src/components/CreateVaultModal.tsx` | 3-step vault creation: approve AUSDC → set risk → confirm |
| `src/components/VaultCard.tsx` | Reusable vault summary card |
| `src/components/FaucetBanner.tsx` | First-time banner when AUSDC balance = 0 |

---

## New React Hooks

| Hook | Purpose |
|---|---|
| `src/hooks/useVault.ts` | `useCreateVault`, `useDeposit`, `useWithdraw`, `usePauseVault`, `useVaultData`, `useUnrealizedPnL` |
| `src/hooks/useAUSDC.ts` | `useAusdcBalance`, `useClaimFaucet`, `useApproveAUSDC` |

---

## Watcher Service Changes

| File | Change |
|---|---|
| `watcher/src/config.ts` | Fix chain ID `5031` → `50312`, RPC → `dream-rpc.somnia.network` |
| `watcher/src/keeper.ts` | **New** — server wallet, calls `checkLeaderActivity`, `updatePrice`, `closePosition` |
| `watcher/src/db.ts` | Add `getActiveVaultsForLeader`, `upsertTokenPrice`, `openPosition`, `closePositionByLeaderSell` |
| `watcher/src/copy-engine.ts` | After leader trade → call `keeper.callCheckLeaderActivity()` per follower; on SELL → call `keeper.callClosePosition()` |
| `watcher/src/pnl-updater.ts` | Write latest price to `TokenPrice` table on every poll |
| `watcher/src/index.ts` | Import + init keeper, log keeper address on startup |

---

## Delegation (Keeper) Pattern

When the user creates a vault, they also call `setKeeper(serverWalletAddress)` once. This gives the backend wallet permission to trigger copy trades on their behalf.

```
User creates vault
  └── createVault(leader, amount, ...)
  └── setKeeper(SERVER_WALLET_ADDRESS)   ← one-time delegation

Watcher detects leader trade
  └── server wallet calls checkLeaderActivity(follower, leader)
  └── server pays gas (near-zero on Somnia)
  └── Agent pipeline fires automatically

User can revoke anytime:
  └── setKeeper(address(0))
```

---

## Somnia Agent Platform — How It's Used

| Agent | ID | Trigger | Input | Output |
|---|---|---|---|---|
| JSON API Agent | 1 | `checkLeaderActivity` | `encode(url, "$.swap")` where url = `/api/agent/leader/{addr}/latest-swap` | ABI-decoded trade struct |
| LLM Agent | 2 | After watcher callback | `encode(prompt)` with trade + risk context | Integer 0-100 (copy score) |
| JSON API Agent | 1 | `updatePrice` | `encode(url, "$.price")` where url = `/api/price/{token}` | uint256 price |

All callbacks have signature `(bytes32 requestId, bytes calldata response)` and are gated by `onlyAgentPlatform`.

---

## Build Phases

### Phase 0 — Schema, Env, Chain Alignment `[S]`
- Add `Position` and `TokenPrice` models to both Prisma schemas
- Expand `Vault` model with new fields
- Add env vars to `.env.local` and `watcher/.env`
- Run migrations

### Phase 1 — Smart Contracts `[L]`  *(parallel with 2 & 3)*
- Write `AUSDC.sol`
- Write `VaultManager.sol`
- Write deploy scripts
- Deploy to Somnia (chain 50312)
- Create `src/lib/contracts.ts` with ABIs + addresses

### Phase 2 — Auth: RainbowKit → Dynamic `[M]`  *(parallel with 1 & 3)*
- Install `@dynamic-labs/sdk-react-core`, `@dynamic-labs/ethereum`, `@dynamic-labs/wagmi-connector`
- Remove `@rainbow-me/rainbowkit`
- Update `Providers.tsx`, `Navbar.tsx`, all pages using `<ConnectButton>`
- Create `AuthGuard.tsx`

### Phase 3 — New API Routes `[S]`  *(parallel with 1 & 2)*
- `/api/price/[token]`
- `/api/vaults/[address]`
- `/api/portfolio/[address]`
- Update `/api/vault` and `/api/portfolio`

### Phase 4 — Watcher Service Updates `[M]`  *(requires 0 + 1)*
- Create `keeper.ts`
- Fix chain ID in `config.ts`
- Extend `db.ts` with new queries
- Update `copy-engine.ts` to trigger on-chain
- Update `pnl-updater.ts` for price writes

### Phase 5 — App Shell & Route Restructure `[S]`  *(requires 2)*
- Create `(marketing)` and `app` route groups
- Create `app/layout.tsx` with `AuthGuard`
- Create `AppNav.tsx`
- Add redirects on old routes

### Phase 6 — Frontend Pages `[L]`  *(requires 2, 3, 5)*
- `/app/leaderboard`
- `/app/traders/[address]`
- `/app/vaults`
- `/app/vaults/[leader]`
- `/app/portfolio`
- `/app/faucet`
- `CreateVaultModal`, `VaultCard`, `FaucetBanner` components

### Phase 7 — Contract Hooks `[M]`  *(requires 1 + 6)*
- `useVault.ts`
- `useAUSDC.ts`
- Wire hooks into all pages

### Phase 8 — Polish & Testing `[S]`
- End-to-end smoke test: create vault → leader trades → position opens → leader sells → P&L written
- Branding cleanup
- `MAX_TRADE_AGE` set to 5 minutes (30s is too tight for agent latency)
- Update `CLAUDE.md` with deployed addresses

---

## Dependency Graph

```
Phase 0
 ├── Phase 1 (Contracts) ────────────────────┐
 │       └── Phase 4 (Watcher) ──────────────┤
 ├── Phase 2 (Auth) ──────────────────────────┤
 │       └── Phase 5 (App Shell) ─────────────┤
 │               └── Phase 6 (Pages) ─────────┤
 │                       └── Phase 7 (Hooks) ◄─┘
 └── Phase 3 (APIs) ──────────► Phase 6
```

---

## Critical Gotchas

1. **Two Prisma schemas** — every schema change must be applied to both `/prisma/schema.prisma` (Next.js) and `/watcher/prisma/schema.prisma` (watcher service). They must stay in sync.

2. **Two-stage requestId problem** — when `onWatcherResponse` dispatches to the LLM Agent, a **new** `requestId` is created. VaultManager must store `newRequestId → vaultId` in `requestToVault` AND carry trade data in `pendingTradeData[vaultId]` between the two callbacks.

3. **AUSDC two-step approval** — `CreateVaultModal` must check allowance first, run `approve()`, then run `createVault()`. Standard ERC-20 pattern but the UI must handle it as two sequential transactions.

4. **No real swap** — `onStrategistResponse` creates a `Position` struct on-chain but calls no DEX. AUSDC never leaves VaultManager. P&L is purely virtual against `latestPrice[token]`.

5. **Chain ID mismatch** — `watcher/src/config.ts` currently uses chain id `5031`. All new code uses `50312` with `dream-rpc.somnia.network`. Fix this in Phase 4.

6. **MAX_TRADE_AGE** — existing `AionisAgentManager` uses 30 seconds. This is too tight given Somnia Agent Platform round-trip latency. VaultManager uses 5 minutes.

7. **Dynamic + wagmi** — Dynamic wraps wagmi, so all existing `useAccount()`, `useWriteContract()`, `useBalance()` hooks continue to work unchanged. Only `<ConnectButton>` → `<DynamicWidget>` needs to change per page.

---

## Deployed Addresses (fill in after Phase 1)

| Contract | Address |
|---|---|
| AUSDC | `—` |
| VaultManager | `—` |
| FollowerRegistry | `—` |
| Somnia Agent Platform | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| QuickSwap Router | `0x1582f6f3D26658F7208A799Be46e34b1f366CE44` |
| WSOMI | `0x046EDe9564A72571df6F5e44d0405360c0f4dCab` |
| WSOMI/USDC.e Pool | (from watcher config) |
