import { NextResponse } from 'next/server';
import { db, indexerState, trades, desc, sql } from '@toro/db';

export async function GET() {
  try {
    const [state] = await db.select().from(indexerState).where(sql`chain = 'bsc'`).limit(1);
    const [latestTrade] = await db.select().from(trades).orderBy(desc(trades.timestamp)).limit(1);

    const nowMs = Date.now();
    const lastBlockTimeMs = state?.updatedAt ? new Date(state.updatedAt).getTime() : nowMs;
    const blockLagMs = nowMs - lastBlockTimeMs;

    return NextResponse.json({
      status: 'ok',
      indexer: {
        chain: state?.chain || 'bsc',
        lastBlockNumber: Number(state?.lastProcessedBlock) || 0,
        lastBlockTimestamp: state?.updatedAt || null,
        blockLagMs,
        isStale: blockLagMs > 5 * 60 * 1000 // 5 minutes
      },
      latestTrade: {
        timestamp: latestTrade?.timestamp || null,
        txHash: latestTrade?.txHash || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
