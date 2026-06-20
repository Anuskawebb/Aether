/**
 * Phase 8A Execution Engine Validation
 *
 * Validates the full execution lifecycle:
 *   Recommendation → ExecutionPlan → ExecutionOrder → ExecutionEngine → Transaction + Position
 *
 * Scenarios:
 *   1.  Recommendation → Plan → Order → Fill (BUY)
 *   2.  Recommendation → Plan → Order → Failure
 *   3.  Duplicate recommendation cannot create duplicate order
 *   4.  BUY fill opens position
 *   5.  SELL fill closes position
 *   6.  Transaction record created for fill
 *   7.  Multiple agents execute independently
 *   8.  Executor abstraction intact (MockExecutor pass/fail)
 *   9.  ExecutionCycleResult metrics are correct
 */

import { randomUUID } from 'crypto';
import {
  db,
  queryClient,
  sql,
  executionOrders,
  executionTransactions,
  agentPositions,
  tradeRecommendations,
  eq,
  and,
  ExecutionOrdersRepository,
  ExecutionTransactionsRepository,
  TradeRecommendationsRepository,
} from '../src/client.js';
import {
  ExecutionEngine,
  MockExecutor,
  type ExecutionEngineConfig,
} from '../../agent-core/src/execution/execution-engine.js';
import { MockExecutor as ME } from '../../agent-core/src/execution/mock-executor.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failCount++;
  }
}

const WALLET_A    = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const WALLET_B    = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const WALLET_PASS = '0xcccccccccccccccccccccccccccccccccccccccc';
const WALLET_FAIL = '0xdddddddddddddddddddddddddddddddddddddddd';
const AGENT_A     = 'agent-alpha-001';
const AGENT_B     = 'agent-beta-001';
const AGENT_PASS  = 'agent-pass-test';
const AGENT_FAIL  = 'agent-fail-test';
const USDT     = '0x55d398326f99059ff775485246999027b3197955';
const TOKEN_1  = '0x1111111111111111111111111111111111111111';
const TOKEN_2  = '0x2222222222222222222222222222222222222222';
const TOKEN_3  = '0x3333333333333333333333333333333333333333';

async function cleanupAgent(agentId: string, agentWallet: string): Promise<void> {
  await db.delete(executionOrders).where(eq(executionOrders.agentId, agentId));
  await db.delete(executionTransactions).where(eq(executionTransactions.agentId, agentId));
  await db.delete(agentPositions).where(eq(agentPositions.agentWallet, agentWallet));
  await db.delete(tradeRecommendations).where(eq(tradeRecommendations.agentWallet, agentWallet));
}

function makePlan(recommendationId: string, tokenOut: string, amountUsd: number = 500, action: 'BUY' | 'SELL' = 'BUY') {
  return {
    action,
    tokenIn:          action === 'BUY' ? USDT : tokenOut,
    tokenOut:         action === 'BUY' ? tokenOut : USDT,
    amountUsd,
    slippageLimitPct: 1.0,
    recommendationId,
  };
}

function makeRec(agentWallet: string, tokenAddress: string, action: 'BUY' | 'SELL' = 'BUY') {
  const id = randomUUID();
  return {
    id,
    agentWallet: agentWallet.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
    tokenSymbol:  'TEST',
    action,
    positionSizePct:  5,
    estimatedUsd:     500,
    entryPriceUsd:    2.5,
    stopLossPct:      6,
    takeProfitPct:    15,
    slippageLimitPct: 1.0,
    riskTier:         'SPECULATIVE',
    signalTier:       'MODERATE',
    opportunityScore: 60,
    convictionScore:  55,
    expectedEdge:     3.2,
    confidence:       75,
    blockers:         [],
    reasons:          ['test'],
    warnings:         [],
    expiresAt:        new Date(Date.now() + 2 * 60 * 60 * 1000),
    decidedAt:        new Date(),
    status:           'PENDING' as const,
    createdAt:        new Date(),
  };
}

// ── Test runner ───────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Phase 8A: Execution Engine Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await cleanupAgent(AGENT_A,    WALLET_A);
  await cleanupAgent(AGENT_B,    WALLET_B);
  await cleanupAgent(AGENT_PASS, WALLET_PASS);
  await cleanupAgent(AGENT_FAIL, WALLET_FAIL);

  // ── Section 1: Basic BUY lifecycle (Scenarios 1, 4, 6) ───────────────────

  console.log('── Section 1: BUY lifecycle — Plan → Order → Fill → Position ──');

  const rec1    = makeRec(WALLET_A, TOKEN_1, 'BUY');
  const plan1   = makePlan(rec1.id, TOKEN_1, 500, 'BUY');
  const engine1 = new ExecutionEngine(
    { agentId: AGENT_A, agentWallet: WALLET_A },
    new ME(),
  );

  // Insert recommendation into DB so markExecuted can find it
  await db.insert(tradeRecommendations).values(rec1);

  const created = await engine1.createOrders([plan1], [rec1]);
  check('Sc1: createOrders returns 1', created === 1);

  const pendingBefore = await ExecutionOrdersRepository.getPendingOrders(AGENT_A);
  check('Sc1: PENDING order exists after createOrders', pendingBefore.length === 1);
  check('Sc1: order has correct tokenAddress', pendingBefore[0]?.tokenAddress === TOKEN_1.toLowerCase());
  check('Sc1: order action is BUY', pendingBefore[0]?.action === 'BUY');

  const result1 = await engine1.processOrders();
  check('Sc1: ordersProcessed = 1', result1.ordersProcessed === 1);
  check('Sc1: ordersFilled = 1', result1.ordersFilled === 1);
  check('Sc1: ordersFailed = 0', result1.ordersFailed === 0);

  const filledOrder = await db.select().from(executionOrders)
    .where(eq(executionOrders.recommendationId, rec1.id)).limit(1);
  check('Sc1: order status is FILLED', filledOrder[0]?.status === 'FILLED');

  // Scenario 6: transaction record
  const tx1 = await ExecutionTransactionsRepository.getTransactionByOrder(filledOrder[0]!.id);
  check('Sc6: transaction record exists', tx1 !== null);
  check('Sc6: transaction status is SUCCESS', tx1?.status === 'SUCCESS');
  check('Sc6: txHash starts with mock_tx_', tx1?.txHash.startsWith('mock_tx_') ?? false);
  check('Sc6: chain is "mock"', tx1?.chain === 'mock');

  // Scenario 4: position opened
  const openPos = await db.select().from(agentPositions)
    .where(
      and(
        eq(agentPositions.agentWallet, WALLET_A.toLowerCase()),
        eq(agentPositions.tokenAddress, TOKEN_1.toLowerCase()),
        eq(agentPositions.status, 'OPEN'),
      )
    ).limit(1);
  check('Sc4: OPEN position created after BUY fill', openPos.length === 1);
  check('Sc4: position.recommendationId matches', openPos[0]?.recommendationId === rec1.id);
  check('Sc4: position.entryPriceUsd matches order', openPos[0]?.entryPriceUsd === rec1.entryPriceUsd);

  // Recommendation should be EXECUTED
  const execRec = await db.select().from(tradeRecommendations)
    .where(eq(tradeRecommendations.id, rec1.id)).limit(1);
  check('Sc1: recommendation transitioned to EXECUTED', execRec[0]?.status === 'EXECUTED');

  // ── Section 2: FAIL lifecycle (Scenario 2) ────────────────────────────────

  console.log('\n── Section 2: FAIL lifecycle — Plan → Order → Failed ──');

  const rec2  = makeRec(WALLET_A, TOKEN_2, 'BUY');
  const plan2 = makePlan(rec2.id, TOKEN_2, 300, 'BUY');
  await db.insert(tradeRecommendations).values(rec2);

  const failEngine = new ExecutionEngine(
    { agentId: AGENT_A, agentWallet: WALLET_A },
    new ME({ shouldFail: true, failureMessage: 'slippage_exceeded' }),
  );

  await failEngine.createOrders([plan2], [rec2]);
  const result2 = await failEngine.processOrders();

  check('Sc2: ordersProcessed = 1', result2.ordersProcessed === 1);
  check('Sc2: ordersFailed = 1', result2.ordersFailed === 1);
  check('Sc2: ordersFilled = 0', result2.ordersFilled === 0);

  const failedOrder = await db.select().from(executionOrders)
    .where(eq(executionOrders.recommendationId, rec2.id)).limit(1);
  check('Sc2: order status is FAILED', failedOrder[0]?.status === 'FAILED');
  check('Sc2: failureReason recorded', failedOrder[0]?.failureReason?.includes('slippage_exceeded') ?? false);

  const txFail = await ExecutionTransactionsRepository.getTransactionByOrder(failedOrder[0]!.id);
  check('Sc2: FAILED transaction record exists', txFail !== null);
  check('Sc2: FAILED transaction status is FAILED', txFail?.status === 'FAILED');

  // Recommendation should still be PENDING (not consumed on failure)
  const recAfterFail = await db.select().from(tradeRecommendations)
    .where(eq(tradeRecommendations.id, rec2.id)).limit(1);
  check('Sc2: recommendation stays PENDING after failure', recAfterFail[0]?.status === 'PENDING');

  // ── Section 3: Duplicate order prevention (Scenario 3) ───────────────────

  console.log('\n── Section 3: Duplicate order prevention ──');

  const rec3     = makeRec(WALLET_A, TOKEN_3, 'BUY');
  const plan3    = makePlan(rec3.id, TOKEN_3, 400, 'BUY');
  await db.insert(tradeRecommendations).values(rec3);

  const engine3 = new ExecutionEngine({ agentId: AGENT_A, agentWallet: WALLET_A }, new ME());

  const created3a = await engine3.createOrders([plan3], [rec3]);
  const created3b = await engine3.createOrders([plan3], [rec3]);  // duplicate call

  check('Sc3: first createOrders creates 1 order', created3a === 1);
  check('Sc3: second createOrders (duplicate) creates 0 orders', created3b === 0);

  const ordersForRec3 = await db.select().from(executionOrders)
    .where(eq(executionOrders.recommendationId, rec3.id));
  check('Sc3: only 1 order exists for recommendationId', ordersForRec3.length === 1);

  // ── Section 4: SELL lifecycle (Scenario 5) ────────────────────────────────

  console.log('\n── Section 4: SELL lifecycle — opens then closes position ──');

  // First open a position manually (simulating a prior BUY fill)
  const openPosId = randomUUID();
  await db.insert(agentPositions).values({
    id:               openPosId,
    agentWallet:      WALLET_A.toLowerCase(),
    tokenAddress:     TOKEN_3.toLowerCase(),
    tokenSymbol:      'TEST3',
    recommendationId: rec3.id,
    entryPriceUsd:    2.5,
    currentPriceUsd:  2.5,
    positionSizeUsd:  400,
    positionSizePct:  5,
    stopLossPct:      6,
    takeProfitPct:    15,
    unrealizedPnlPct: 0,
    status:           'OPEN',
    closeReason:      null,
    closePriceUsd:    null,
    openedAt:         new Date(),
    closedAt:         null,
    updatedAt:        new Date(),
  });

  // Now create a SELL recommendation + plan
  const recSell  = makeRec(WALLET_A, TOKEN_3, 'SELL');
  const planSell = makePlan(recSell.id, TOKEN_3, 400, 'SELL');
  await db.insert(tradeRecommendations).values(recSell);

  const engine4 = new ExecutionEngine({ agentId: AGENT_A, agentWallet: WALLET_A }, new ME());
  await engine4.createOrders([planSell], [recSell]);
  const result4 = await engine4.processOrders();

  check('Sc5: SELL fill processed', result4.ordersFilled === 1);
  check('Sc5: positionsClosed = 1', result4.positionsClosed === 1);

  const closedPos = await db.select().from(agentPositions)
    .where(eq(agentPositions.id, openPosId)).limit(1);
  check('Sc5: position status is CLOSED', closedPos[0]?.status === 'CLOSED');
  check('Sc5: close reason is MANUAL', closedPos[0]?.closeReason === 'MANUAL');

  // ── Section 5: Multiple agents (Scenario 7) ───────────────────────────────

  console.log('\n── Section 5: Multiple agents execute independently ──');

  const recA = makeRec(WALLET_A, TOKEN_1, 'BUY');
  const recB = makeRec(WALLET_B, TOKEN_1, 'BUY');  // same token, different agent
  const planA = makePlan(recA.id, TOKEN_1, 200, 'BUY');
  const planB = makePlan(recB.id, TOKEN_1, 300, 'BUY');

  await db.insert(tradeRecommendations).values([recA, recB]);

  // Clean OPEN position for TOKEN_1 on WALLET_A before BUY (previous test opened one)
  await db.delete(agentPositions).where(
    and(
      eq(agentPositions.agentWallet, WALLET_A.toLowerCase()),
      eq(agentPositions.tokenAddress, TOKEN_1.toLowerCase()),
    )
  );

  const engineA = new ExecutionEngine({ agentId: AGENT_A, agentWallet: WALLET_A }, new ME());
  const engineB = new ExecutionEngine({ agentId: AGENT_B, agentWallet: WALLET_B }, new ME());

  await engineA.createOrders([planA], [recA]);
  await engineB.createOrders([planB], [recB]);

  const resultA = await engineA.processOrders();
  const resultB = await engineB.processOrders();

  check('Sc7: Agent A processed 1 order', resultA.ordersProcessed === 1);
  check('Sc7: Agent B processed 1 order', resultB.ordersProcessed === 1);
  check('Sc7: Agent A filled 1 order', resultA.ordersFilled === 1);
  check('Sc7: Agent B filled 1 order', resultB.ordersFilled === 1);

  const posA = await db.select().from(agentPositions)
    .where(and(eq(agentPositions.agentWallet, WALLET_A.toLowerCase()), eq(agentPositions.tokenAddress, TOKEN_1.toLowerCase()), eq(agentPositions.status, 'OPEN')))
    .limit(1);
  const posB = await db.select().from(agentPositions)
    .where(and(eq(agentPositions.agentWallet, WALLET_B.toLowerCase()), eq(agentPositions.tokenAddress, TOKEN_1.toLowerCase()), eq(agentPositions.status, 'OPEN')))
    .limit(1);

  check('Sc7: Agent A has OPEN position for TOKEN_1', posA.length === 1);
  check('Sc7: Agent B has OPEN position for TOKEN_1', posB.length === 1);
  check('Sc7: positions are isolated by agentWallet', posA[0]?.agentWallet !== posB[0]?.agentWallet);

  // ── Section 6: Executor abstraction (Scenario 8) ─────────────────────────

  console.log('\n── Section 6: Executor abstraction ──');

  // Use isolated agents so pass-executor and fail-executor don't share order queues.
  // Both flow through identical ExecutionEngine code — only the Executor differs.
  const recPass = makeRec(WALLET_PASS, '0x4444444444444444444444444444444444444444', 'BUY');
  const recFail = makeRec(WALLET_FAIL, '0x5555555555555555555555555555555555555555', 'BUY');
  await db.insert(tradeRecommendations).values([recPass, recFail]);

  const planPass = makePlan(recPass.id, '0x4444444444444444444444444444444444444444', 100, 'BUY');
  const planFail = makePlan(recFail.id, '0x5555555555555555555555555555555555555555', 100, 'BUY');

  const passEngine = new ExecutionEngine({ agentId: AGENT_PASS, agentWallet: WALLET_PASS }, new ME({ shouldFail: false }));
  const fEngine    = new ExecutionEngine({ agentId: AGENT_FAIL, agentWallet: WALLET_FAIL }, new ME({ shouldFail: true }));

  await passEngine.createOrders([planPass], [recPass]);
  await fEngine.createOrders([planFail], [recFail]);

  const r6pass = await passEngine.processOrders();
  const r6fail = await fEngine.processOrders();

  check('Sc8: pass-executor → ordersFilled = 1', r6pass.ordersFilled === 1);
  check('Sc8: fail-executor → ordersFailed = 1', r6fail.ordersFailed === 1);
  check('Sc8: pass-executor → positionsOpened = 1', r6pass.positionsOpened === 1);
  check('Sc8: fail-executor → positionsOpened = 0', r6fail.positionsOpened === 0);

  // ── Section 7: ExecutionCycleResult metrics (Scenario 9) ─────────────────

  console.log('\n── Section 7: ExecutionCycleResult metrics ──');

  // Clean and create 2 PENDING orders: 1 pass, 1 fail (different executor → we test mixed)
  // Mixed test: create 2 orders for same engine, one of which will fail due to position_already_open
  const tokenX = '0x6666666666666666666666666666666666666666';
  const tokenY = '0x7777777777777777777777777777777777777777';

  const recX = makeRec(WALLET_A, tokenX, 'BUY');
  const recY = makeRec(WALLET_A, tokenY, 'BUY');
  await db.insert(tradeRecommendations).values([recX, recY]);

  const planX = makePlan(recX.id, tokenX, 200, 'BUY');
  const planY = makePlan(recY.id, tokenY, 200, 'BUY');

  // Pre-open TOKEN_Y to force position_already_open on that fill
  await db.insert(agentPositions).values({
    id:               randomUUID(),
    agentWallet:      WALLET_A.toLowerCase(),
    tokenAddress:     tokenY.toLowerCase(),
    tokenSymbol:      'TY',
    recommendationId: randomUUID(),
    entryPriceUsd:    1.0,
    currentPriceUsd:  1.0,
    positionSizeUsd:  200,
    positionSizePct:  2,
    stopLossPct:      6,
    takeProfitPct:    15,
    unrealizedPnlPct: 0,
    status:           'OPEN',
    closeReason:      null,
    closePriceUsd:    null,
    openedAt:         new Date(),
    closedAt:         null,
    updatedAt:        new Date(),
  });

  const metricEngine = new ExecutionEngine({ agentId: AGENT_A, agentWallet: WALLET_A }, new ME());
  await metricEngine.createOrders([planX, planY], [recX, recY]);
  const metricResult = await metricEngine.processOrders();

  check('Sc9: ordersProcessed = 2', metricResult.ordersProcessed === 2);
  check('Sc9: ordersFilled = 1 (TOKEN_X)', metricResult.ordersFilled === 1);
  check('Sc9: ordersFailed = 1 (TOKEN_Y position_already_open)', metricResult.ordersFailed === 1);
  check('Sc9: positionsOpened = 1', metricResult.positionsOpened === 1);
  check('Sc9: durationMs >= 0', metricResult.durationMs >= 0);

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passCount} PASS, ${failCount} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failCount > 0) process.exit(1);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => {
    await cleanupAgent(AGENT_A,    WALLET_A).catch(() => {});
    await cleanupAgent(AGENT_B,    WALLET_B).catch(() => {});
    await cleanupAgent(AGENT_PASS, WALLET_PASS).catch(() => {});
    await cleanupAgent(AGENT_FAIL, WALLET_FAIL).catch(() => {});
    queryClient.end();
  });
