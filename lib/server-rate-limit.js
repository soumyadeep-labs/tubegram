import { config } from './config.js';
import { createRateLimiter } from './rate-limit.js';

const LIMITER_KEY = Symbol.for('tubegram.rate-limiter');

function cleanIp(value) {
  if (!value) return null;
  const ip = value.split(',')[0].trim();
  return ip && ip.length <= 100 ? ip : null;
}

export function getClientIp(request) {
  return (
    cleanIp(request.headers.get('x-forwarded-for')) ||
    cleanIp(request.headers.get('x-real-ip')) ||
    cleanIp(request.headers.get('cf-connecting-ip')) ||
    cleanIp(request.headers.get('true-client-ip')) ||
    'unknown'
  );
}

export function getRateLimiter() {
  if (!globalThis[LIMITER_KEY]) {
    globalThis[LIMITER_KEY] = createRateLimiter({
      limit: config.rateLimitPerMinute,
    });
  }
  return globalThis[LIMITER_KEY];
}

export function checkRateLimit(request) {
  return getRateLimiter().check(getClientIp(request));
}
