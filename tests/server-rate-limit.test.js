import assert from 'node:assert/strict';
import test from 'node:test';

import { getClientIp } from '../lib/server-rate-limit.js';

function requestWith(headers) {
  return new Request('http://localhost/', { headers });
}

test('getClientIp prefers the first forwarded address', () => {
  assert.equal(
    getClientIp(
      requestWith({
        'x-forwarded-for': '203.0.113.5, 10.0.0.1',
      }),
    ),
    '203.0.113.5',
  );
});

test('getClientIp falls back through proxy headers', () => {
  assert.equal(
    getClientIp(requestWith({ 'x-real-ip': '198.51.100.8' })),
    '198.51.100.8',
  );
  assert.equal(
    getClientIp(requestWith({ 'cf-connecting-ip': '192.0.2.4' })),
    '192.0.2.4',
  );
  assert.equal(
    getClientIp(requestWith({ 'true-client-ip': '192.0.2.5' })),
    '192.0.2.5',
  );
  assert.equal(getClientIp(requestWith({})), 'unknown');
});

test('getClientIp ignores absurdly long values', () => {
  assert.equal(
    getClientIp(requestWith({ 'x-forwarded-for': '1'.repeat(200) })),
    'unknown',
  );
});
