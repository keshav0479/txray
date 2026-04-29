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

function normalizeIp(candidate: string | null): string | null {
  const value = candidate?.trim();
  if (!value || value.length > 100) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(value)) return null;
  return value;
}

function getForwardedFor(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  return normalizeIp(first);
}

export function getRateLimitKey(request: Request): string {
  if (process.env.TXRAY_TRUST_PROXY_HEADERS === "true") {
    const trustedIp =
      normalizeIp(request.headers.get("cf-connecting-ip")) ||
      normalizeIp(request.headers.get("x-real-ip")) ||
      getForwardedFor(request.headers.get("x-forwarded-for"));

    if (trustedIp) {
      return `ip:${trustedIp}`;
    }
  }

  // Next's Web Request does not expose the direct socket IP in route handlers.
  // Without a trusted proxy we avoid spoofable IP headers and use a bounded
  // best-effort key. Public deployments should enable trusted headers only
  // behind a proxy that overwrites client-supplied forwarding headers.
  const ua = request.headers.get("user-agent") || "unknown-agent";
  return `direct:${ua.slice(0, 120)}`;
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
  const ip = getRateLimitKey(request);
  if (!consume(`heavy:${ip}`, HEAVY)) {
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
  const ip = getRateLimitKey(request);
  if (!consume(`light:${ip}`, LIGHT)) {
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
