# Executor Architecture — Design Document

**Status:** Review of existing code + proposal. No code changes made.  
**Files reviewed:** `packages/agent-core/src/execution/executor.ts`, `execution-engine.ts`, `mock-executor.ts`

---

## Current Architecture

```
ExecutionEngine
     │
     │ depends on
     ▼
Executor (interface)
     │
     ├── MockExecutor   (Phase 8A — no blockchain)
     └── [TwakExecutor] (Phase 8B — not yet implemented)
```

### Current `Executor` Interface

```typescript
export interface ExecutionOrder {
  id:               string
  agentId:          string
  agentWallet:      string
  recommendationId: string
  tokenAddress:     string
  tokenSymbol:      string
  action:           'BUY' | 'SELL'
  amountUsd:        number
  positionSizePct:  number
  entryPriceUsd:    number
  stopLossPct:      number
  takeProfitPct:    number
  slippageLimitPct: number
}

export interface ExecutionResult {
  success:      boolean
  txHash:       string
  errorMessage: string | null
}

export interface Executor {
  execute(order: ExecutionOrder): Promise<ExecutionResult>
}
```

### Assessment

**The existing abstraction is correct and sufficient for Phase 8B.**

The `Executor` interface is already well-designed:
- Single method (`execute`) — minimal surface area
- `ExecutionEngine` depends only on this interface, never on concrete implementations
- `ExecutionEngine` comments explicitly state "paired with MockExecutor in 8A, TwakExecutor in 8B — no changes to this file"
- The interface is stable: `ExecutionOrder` contains everything a real swap executor needs (amount, token, slippage, wallet)

**No changes required to implement `TwakExecutor`.** It simply needs to implement `Executor`.

---

## Proposed Future Structure

```
ExecutionEngine
     │
     │ depends on (unchanged)
     ▼
Executor (interface)
     │
     ├── MockExecutor             (Phase 8A — always exists for testing)
     ├── TwakExecutor             (Phase 8B — BSC swaps via TWAK SDK)
     ├── SmartAccountExecutor     (Phase 8C — ERC-4337 session key)
     └── WalletConnectExecutor    (Phase 8C+ — user-signs-each-tx)
```

### Executor Selection

A factory function replaces the hardcoded `new MockExecutor()` in the orchestrator:

```typescript
// packages/agent-core/src/execution/executor-factory.ts

import { type ExecutionAccount } from './types.js'
import { MockExecutor } from './mock-executor.js'
import { TwakExecutor } from './twak-executor.js'
import { SmartAccountExecutor } from './smart-account-executor.js'
import { WalletConnectExecutor } from './walletconnect-executor.js'

export function createExecutor(account: ExecutionAccount): Executor {
  switch (account.accountType) {
    case 'TWAK_AGENT':
      return new TwakExecutor(account)
    case 'SMART_ACCOUNT':
      return new SmartAccountExecutor(account)
    case 'WALLETCONNECT':
      return new WalletConnectExecutor(account)
    default:
      return new MockExecutor()
  }
}
```

`ExecutionEngine` does not change. Only the orchestrator (the script/process that instantiates the engine) calls `createExecutor()`.

---

## TwakExecutor Design (Phase 8B)

```typescript
// packages/agent-core/src/execution/twak-executor.ts

import { type Executor, type ExecutionOrder, type ExecutionResult } from './executor.js'
import { type ExecutionAccount } from './types.js'

export class TwakExecutor implements Executor {
  private readonly agentWallet: string
  private readonly twakConfig: TwakConfig

  constructor(account: ExecutionAccount) {
    this.agentWallet = account.walletAddress
    this.twakConfig = {
      agentId: account.metadata.twakAgentId,
      network: account.metadata.network ?? 'bsc-mainnet',
    }
  }

  async execute(order: ExecutionOrder): Promise<ExecutionResult> {
    try {
      // 1. Build swap parameters
      const swapParams = {
        tokenIn:     order.action === 'BUY' ? USDT_ADDRESS : order.tokenAddress,
        tokenOut:    order.action === 'BUY' ? order.tokenAddress : USDT_ADDRESS,
        amountIn:    toWei(order.amountUsd, 18),
        slippage:    order.slippageLimitPct / 100,
        recipient:   this.agentWallet,
      }

      // 2. Get swap route from PancakeSwap V3
      const route = await pancakeRouter.getRoute(swapParams)

      // 3. Submit via TWAK SDK
      const txHash = await twakSdk.executeSwap({
        agentId:  this.twakConfig.agentId,
        calldata: route.calldata,
        to:       route.to,
        value:    route.value,
      })

      return { success: true, txHash, errorMessage: null }

    } catch (err) {
      return {
        success:      false,
        txHash:       '',
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }
}
```

---

## SmartAccountExecutor Design (Phase 8C)

```typescript
// packages/agent-core/src/execution/smart-account-executor.ts

export class SmartAccountExecutor implements Executor {
  constructor(
    private account: ExecutionAccount,
    private sessionKey: SessionKey,
  ) {}

  async execute(order: ExecutionOrder): Promise<ExecutionResult> {
    // 1. Verify session key not expired
    if (this.sessionKey.isExpired()) {
      return { success: false, txHash: '', errorMessage: 'session_key_expired' }
    }

    // 2. Build UserOperation for PancakeSwap swap
    const userOp = await buildUserOperation({
      sender:     this.account.walletAddress,
      callData:   encodeSwapCalldata(order),
      sessionKey: this.sessionKey,
    })

    // 3. Sign with session key
    const signedOp = await this.sessionKey.sign(userOp)

    // 4. Submit to bundler
    const txHash = await bundler.sendUserOperation(signedOp)

    return { success: true, txHash, errorMessage: null }
  }
}
```

---

## WalletConnectExecutor Design (Phase 8C+)

```typescript
// packages/agent-core/src/execution/walletconnect-executor.ts

export class WalletConnectExecutor implements Executor {
  constructor(private account: ExecutionAccount, private wcSession: WCSession) {}

  async execute(order: ExecutionOrder): Promise<ExecutionResult> {
    // Prepare transaction but do NOT submit automatically
    // Instead, push to a user confirmation queue
    const pendingTx = await PendingTransactionsRepository.create({
      orderId: order.id,
      txData:  encodeSwapCalldata(order),
      status:  'AWAITING_SIGNATURE',
    })

    // Notify user via UI (SSE or polling)
    // User signs in their wallet; WC relays the signed tx
    // A webhook/callback updates execution_transactions when confirmed

    return {
      success:      false,
      txHash:       '',
      errorMessage: 'awaiting_user_signature',
    }
  }
}
```

Note: `WalletConnectExecutor` has a fundamentally different async flow — `execute()` returns immediately with `awaiting_user_signature`, and the actual completion arrives later via a callback. This requires a separate completion callback mechanism outside `ExecutionEngine.processOrders()`. Not needed for Phase 8B or 8C.

---

## Recommended Improvements to Current Interface

### 1. Add `errorCode` to `ExecutionResult`

Currently `errorMessage` is a freeform string. Structured error codes enable better handling:

```typescript
export type ExecutionErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'SLIPPAGE_EXCEEDED'
  | 'TOKEN_NOT_LIQUID'
  | 'SESSION_KEY_EXPIRED'
  | 'AWAITING_SIGNATURE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export interface ExecutionResult {
  success:      boolean
  txHash:       string
  errorMessage: string | null
  errorCode:    ExecutionErrorCode | null    // ADD THIS
}
```

`ExecutionEngine` already maps results to `execution_transactions.status`. Structured error codes would allow the engine to retry on `NETWORK_ERROR` but not on `SLIPPAGE_EXCEEDED`.

### 2. Add `estimatedGasUsd` to `ExecutionResult`

```typescript
export interface ExecutionResult {
  success:         boolean
  txHash:          string
  errorMessage:    string | null
  errorCode:       ExecutionErrorCode | null
  estimatedGasUsd: number | null    // ADD THIS — for portfolio cost tracking
}
```

### 3. Add optional `healthCheck()` to Executor

```typescript
export interface Executor {
  execute(order: ExecutionOrder): Promise<ExecutionResult>
  healthCheck?(): Promise<{ ok: boolean; message: string }>    // Optional
}
```

`ExecutionEngine` can call `healthCheck()` before a processing cycle if available. Useful for detecting TWAK connectivity issues before queuing orders.

---

## What NOT to Change

The following are correct and should not be touched:

- `ExecutionEngine` class and its `createOrders()` / `processOrders()` methods
- `ExecutionOrder` interface fields (all are needed by real executors)
- `MockExecutor` — keep it as-is for testing; do not add blockchain logic
- `PositionRegistryService` — position lifecycle is handled correctly inside the engine
- The `agentWallet` field in `ExecutionOrder` — real executors use this to sign from the right address
