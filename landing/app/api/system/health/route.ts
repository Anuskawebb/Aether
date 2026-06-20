import { NextResponse } from 'next/server';
import { db, sql } from '@toro/db';

export async function GET() {
  try {
    // Simple query to verify DB connection
    await db.execute(sql`SELECT 1`);
    
    return NextResponse.json({
      status: 'ok',
      service: 'toro-api',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      service: 'toro-api',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
