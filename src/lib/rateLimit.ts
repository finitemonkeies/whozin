const lastActionAt = new Map<string, number>();

export function getRateLimitStatus(key: string, windowMs: number) {
  const now = Date.now();
  const last = lastActionAt.get(key) ?? 0;
  const elapsed = now - last;
  if (elapsed < windowMs) {
    return {
      allowed: false,
      retryAfterMs: windowMs - elapsed,
    };
  }

  lastActionAt.set(key, now);
  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

export function formatRetrySeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}
