/**
 * Simple in-memory token-bucket rate limiter per IP.
 * Suitable for single-instance deployment (no Redis needed).
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

// Clean up stale entries every 5 minutes to prevent unbounded growth
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > 60_000) {
        buckets.delete(key);
      }
    }
  },
  5 * 60 * 1000,
).unref();

function getIp(request: Request): string {
  // Trust X-Forwarded-For only when the request originates locally
  // (i.e., behind an nginx reverse proxy on the same host).
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // Take the first IP in the chain (client IP)
    return xff.split(",")[0].trim();
  }
  // Fall back to a generic key; real IP not available in edge-less Node runtime
  return "unknown";
}

function consume(ip: string, config: LimitConfig): boolean {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    bucket = { tokens: config.limit, lastRefill: now };
    buckets.set(ip, bucket);
  }

  // Refill tokens proportionally to elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / config.windowMs) * config.limit;
  bucket.tokens = Math.min(config.limit, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return false; // rate limited
  }

  bucket.tokens -= 1;
  return true;
}

/** Configs for different endpoint classes */
const HEAVY: LimitConfig = { limit: 30, windowMs: 60_000 }; // 30 req/min
const LIGHT: LimitConfig = { limit: 120, windowMs: 60_000 }; // 120 req/min

export function checkHeavyLimit(request: Request): Response | null {
  const ip = getIp(request);
  if (!consume(ip, HEAVY)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }
  return null;
}

export function checkLightLimit(request: Request): Response | null {
  const ip = getIp(request);
  if (!consume(ip, LIGHT)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }
  return null;
}
