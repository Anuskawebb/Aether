import { Redis } from '@upstash/redis';
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const TTL = 86_400; // 24h
/**
 * Atomically claims a swap event.
 * Returns true if this is the first time we've seen it (proceed).
 * Returns false if it's a duplicate (skip).
 */
export async function claimSwap(txHash, leader) {
    const key = `stellalpha:swap:${txHash}:${leader.toLowerCase()}`;
    const result = await redis.set(key, '1', { ex: TTL, nx: true });
    return result === 'OK';
}
// No-op — @upstash/redis is stateless HTTP, nothing to close
export async function closeRedis() { }
