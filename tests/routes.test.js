import assert from 'node:assert/strict';
import test from 'node:test';

import { GET as health } from '../app/api/health/route.js';
import { POST as info } from '../app/api/info/route.js';
import { GET as download } from '../app/api/download/route.js';
import { config } from '../lib/config.js';

function postInfo(body, ip = '198.51.100.10') {
  return info(
    new Request('http://localhost/api/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

test('GET /api/health reports the app version', async () => {
  const response = await health();
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.status, 'ok');
  assert.match(data.version, /^\d+\.\d+\.\d+$/);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
});

test('POST /api/info validates the body before calling yt-dlp', async () => {
  const missing = await postInfo({}, '198.51.100.11');
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, 'INVALID_URL');

  const unrelated = await postInfo(
    { url: 'https://example.com/video' },
    '198.51.100.12',
  );
  assert.equal(unrelated.status, 400);
  assert.match((await unrelated.json()).error, /YouTube and Instagram/);

  const malformed = await postInfo('{not json', '198.51.100.13');
  assert.equal(malformed.status, 400);
});

test('GET /api/download validates url, format, and quality', async () => {
  const missing = await download(
    new Request('http://localhost/api/download', {
      headers: { 'x-forwarded-for': '198.51.100.20' },
    }),
  );
  assert.equal(missing.status, 400);

  const badFormat = await download(
    new Request(
      'http://localhost/api/download?url=https%3A%2F%2Fyoutu.be%2Fabc&format=avi',
      { headers: { 'x-forwarded-for': '198.51.100.21' } },
    ),
  );
  assert.equal(badFormat.status, 400);
  assert.equal((await badFormat.json()).code, 'INVALID_FORMAT');

  const badQuality = await download(
    new Request(
      'http://localhost/api/download?url=https%3A%2F%2Fyoutu.be%2Fabc&quality=99',
      { headers: { 'x-forwarded-for': '198.51.100.22' } },
    ),
  );
  assert.equal((await badQuality.json()).code, 'INVALID_QUALITY');
});

test('rate limiting blocks a client that exceeds the configured limit', async () => {
  const ip = '203.0.113.250';

  for (let index = 0; index < config.rateLimitPerMinute; index += 1) {
    const response = await postInfo({}, ip);
    assert.equal(response.status, 400);
  }

  const blocked = await postInfo({}, ip);
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).code, 'RATE_LIMITED');
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
});
