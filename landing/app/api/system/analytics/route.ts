import { NextResponse } from 'next/server';
import { db, analyticsRuns, desc } from '@toro/db';

export async function GET() {
  try {
    const [latestRun] = await db.select()
      .from(analyticsRuns)
      .orderBy(desc(analyticsRuns.startedAt))
      .limit(1);

    const nowMs = Date.now();
    const lastRunTimeMs = latestRun?.finishedAt ? new Date(latestRun.finishedAt).getTime() : nowMs;
    const processingLagMs = nowMs - lastRunTimeMs;

    return NextResponse.json({
      status: 'ok',
      analytics: {
        status: latestRun?.status || 'unknown',
        startedAt: latestRun?.startedAt || null,
        finishedAt: latestRun?.finishedAt || null,
        durationMs: latestRun?.durationMs || null,
        processingLagMs,
        isStale: processingLagMs > 5 * 60 * 1000, // 5 minutes
        metrics: {
          walletsProcessed: latestRun?.walletsProcessed || 0,
          tokensProcessed: latestRun?.tokensProcessed || 0,
          signalsGenerated: latestRun?.signalsGenerated || 0,
          recommendationsGenerated: latestRun?.recommendationsGenerated || 0,
        },
        error: latestRun?.error || null,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
