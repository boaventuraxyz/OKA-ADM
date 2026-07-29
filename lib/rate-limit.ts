import "server-only";

import crypto from "node:crypto";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimit = globalThis as typeof globalThis & {
  __admRateLimitStore?: RateLimitStore;
};

const store = globalRateLimit.__admRateLimitStore ?? new Map<string, RateLimitEntry>();
globalRateLimit.__admRateLimitStore = store;

function requestFingerprint(headers: Headers) {
  const forwarded =
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-forwarded-for") ||
    headers.get("x-real-ip") ||
    "unknown";
  const ip = forwarded.split(",")[0].trim().slice(0, 64);
  const userAgent = (headers.get("user-agent") || "unknown").slice(0, 256);
  const identity = ip === "unknown" ? `${ip}|${userAgent}` : ip;

  return crypto.createHash("sha256").update(identity).digest("hex");
}

function removeExpiredEntries(now: number) {
  if (store.size < 1000) return;

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }

  while (store.size > 5000) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export function consumeRateLimit(
  namespace: string,
  headers: Headers,
  {
    limit,
    windowMs
  }: {
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  removeExpiredEntries(now);

  const key = `${namespace}:${requestFingerprint(headers)}`;
  const current = store.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };

  store.set(key, entry);

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(limit - entry.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((entry.resetAt - now) / 1000), 1)
  };
}

export function clearRateLimit(namespace: string, headers: Headers) {
  store.delete(`${namespace}:${requestFingerprint(headers)}`);
}
