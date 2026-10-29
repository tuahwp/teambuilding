type RateRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateRecord>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * Checks if a given identifier exceeds rate limit.
 * @param identifier e.g. IP + action ("1.2.3.4:semak")
 * @param limit maximum allowed requests within window
 * @param windowMs time window in milliseconds (default: 60,000ms / 1 min)
 * @returns { allowed: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetAt <= now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

