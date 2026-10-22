import assert from 'node:assert/strict';
import test from 'node:test';

import { validateVideoUrl } from '../lib/validate-url.js';

const domains = ['youtube.com', 'youtu.be', 'instagram.com'];

test('accepts supported YouTube and Instagram links', () => {
  const valid = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/shorts/abc123',
    'https://m.youtube.com/watch?v=abc123',
    'https://music.youtube.com/watch?v=abc123',
    'https://youtu.be/abc123?t=30',
    'http://www.youtube.com/watch?v=abc123',
    'https://www.instagram.com/reel/abc123/',
    '  https://instagram.com/p/abc123/  ',
  ];

  for (const url of valid) {
    const result = validateVideoUrl(url, domains);
    assert.equal(result.ok, true, `expected ${url} to be valid`);
    assert.equal(typeof result.url, 'string');
  }
});

test('rejects lookalike and unrelated domains', () => {
  const invalid = [
    'https://evil.com/watch?v=abc',
    'https://youtube.com.evil.com/watch?v=abc',
    'https://notyoutube.com/watch?v=abc',
    'https://www.instagram.com.evil.com/reel/abc',
    'https://evilinstagram.com/reel/abc',
  ];

  for (const url of invalid) {
    const result = validateVideoUrl(url, domains);
    assert.equal(result.ok, false, `expected ${url} to be rejected`);
    assert.match(result.error, /YouTube and Instagram/);
  }
});

test('rejects unsafe protocols, credentials, and custom ports', () => {
  assert.equal(validateVideoUrl('javascript:alert(1)', domains).ok, false);
  assert.equal(validateVideoUrl('ftp://youtube.com/watch?v=abc', domains).ok, false);
  assert.equal(
    validateVideoUrl('https://user:pass@youtube.com/watch?v=abc', domains).ok,
    false,
  );
  assert.equal(
    validateVideoUrl('https://youtube.com:8080/watch?v=abc', domains).ok,
    false,
  );
});

test('rejects empty, malformed, and oversized input', () => {
  assert.equal(validateVideoUrl('', domains).ok, false);
  assert.equal(validateVideoUrl('   ', domains).ok, false);
  assert.equal(validateVideoUrl(null, domains).ok, false);
  assert.equal(validateVideoUrl('not a url', domains).ok, false);
  assert.equal(
    validateVideoUrl(`https://youtube.com/watch?v=${'a'.repeat(3000)}`, domains).ok,
    false,
  );
});

test('honours a custom allowlist', () => {
  assert.equal(validateVideoUrl('https://vimeo.com/123', ['vimeo.com']).ok, true);
  assert.equal(validateVideoUrl('https://youtube.com/watch?v=abc', ['vimeo.com']).ok, false);
});
