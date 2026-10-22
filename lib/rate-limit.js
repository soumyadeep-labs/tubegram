/**
 * A tiny in-memory sliding-window rate limiter.
 * One instance lives for the life of the server process, which is enough for
 * a single Render web service or a local install. It is not shared between
 * serverless instances.
 */
export function createRateLimiter({
  limit,
  windowMs = 60 * 1000,
  now = () => Date.now(),
}) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Rate limiter limit must be a positive integer');
  }

  const hits = new Map();
  let requestsSinceCleanup = 0;

  function cleanup(timestamp) {
    for (const [key, timestamps] of hits) {
      if (timestamps.length === 0 || timestamp - timestamps[timestamps.length - 1] >= windowMs) {
        hits.delete(key);
      }
    }
  }

  return {
    check(key) {
      const timestamp = now();
      const recent = (hits.get(key) ?? []).filter(
        (hit) => timestamp - hit < windowMs,
      );

      if (recent.length >= limit) {
        hits.set(key, recent);
        const retryAfterMs = windowMs - (timestamp - recent[0]);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }

      recent.push(timestamp);
      hits.set(key, recent);

      requestsSinceCleanup += 1;
      if (requestsSinceCleanup >= 500) {
        cleanup(timestamp);
        requestsSinceCleanup = 0;
      }

      return {
        allowed: true,
        remaining: limit - recent.length,
        retryAfterSeconds: 0,
      };
    },

    reset() {
      hits.clear();
      requestsSinceCleanup = 0;
    },

    size() {
      return hits.size;
    },
  };
}
