import assert from 'node:assert/strict';
import test from 'node:test';

import { createRateLimiter } from '../lib/rate-limit.js';

test('allows requests up to the limit and then blocks', () => {
  let now = 0;
  const limiter = createRateLimiter({
    limit: 2,
    windowMs: 60_000,
    now: () => now,
  });

  const first = limiter.check('1.2.3.4');
  const second = limiter.check('1.2.3.4');
  const third = limiter.check('1.2.3.4');

  assert.deepEqual(first, { allowed: true, remaining: 1, retryAfterSeconds: 0 });
  assert.deepEqual(second, { allowed: true, remaining: 0, retryAfterSeconds: 0 });
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(third.retryAfterSeconds, 60);
});

test('tracks each client separately', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });

  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, false);
  assert.equal(limiter.check('b').allowed, true);
  assert.equal(limiter.size(), 2);
});

test('slides the window forward and reports a shrinking retry delay', () => {
  let now = 0;
  const limiter = createRateLimiter({
    limit: 1,
    windowMs: 60_000,
    now: () => now,
  });

  assert.equal(limiter.check('client').allowed, true);

  now = 30_000;
  const blocked = limiter.check('client');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 30);

  now = 60_001;
  assert.equal(limiter.check('client').allowed, true);
});

test('reset clears all buckets', () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
  limiter.check('a');
  assert.equal(limiter.size(), 1);
  limiter.reset();
  assert.equal(limiter.size(), 0);
  assert.equal(limiter.check('a').allowed, true);
});

test('requires a positive integer limit', () => {
  assert.throws(() => createRateLimiter({ limit: 0 }), /positive integer/);
  assert.throws(() => createRateLimiter({ limit: 1.5 }), /positive integer/);
});
