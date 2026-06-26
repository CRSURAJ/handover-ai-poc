// Simple in-memory rate limiter — single-instance only.
// Replace with Upstash Ratelimit for multi-instance / production deployments.

type Entry = { count: number; resetAt: number };

const stores: Record<string, Map<string, Entry>> = {};

function getStore(name: string) {
  if (!stores[name]) stores[name] = new Map();
  return stores[name];
}

export function checkRateLimit(
  name: string,
  ip: string,
  max: number,
  windowMs: number,
): boolean {
  const store = getStore(name);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
