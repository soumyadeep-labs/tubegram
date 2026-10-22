import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanDownloadedName,
  contentDisposition,
  suggestFilename,
} from '../lib/filename.js';

test('suggestFilename removes characters that are illegal in filenames', () => {
  assert.equal(
    suggestFilename('Hello: World?/Test\\Again', 'mp4'),
    'Hello World Test Again.mp4',
  );
  assert.equal(suggestFilename('  ', 'mp3'), 'video.mp3');
  assert.equal(suggestFilename(null, 'mp4'), 'video.mp4');
});

test('suggestFilename limits the base name length', () => {
  const filename = suggestFilename('a'.repeat(400), 'mp4');
  assert.equal(filename.endsWith('.mp4'), true);
  assert.equal([...filename.slice(0, -4)].length, 120);
});

test('suggestFilename normalises the requested extension', () => {
  assert.equal(suggestFilename('Song', 'mp3'), 'Song.mp3');
  assert.equal(suggestFilename('Clip', 'exe'), 'Clip.mp4');
});

test('cleanDownloadedName strips yt-dlp video ids and paths', () => {
  assert.equal(cleanDownloadedName('My Video [abc123].mp4'), 'My Video.mp4');
  assert.equal(cleanDownloadedName('/tmp/x/Title [id].mp3'), 'Title.mp3');
  assert.equal(cleanDownloadedName('No id.mp4'), 'No id.mp4');
  assert.equal(cleanDownloadedName(''), 'video.mp4');
});

test('contentDisposition includes an ASCII fallback and UTF-8 name', () => {
  assert.equal(
    contentDisposition('simple.mp4'),
    'attachment; filename="simple.mp4"; filename*=UTF-8\'\'simple.mp4',
  );

  const header = contentDisposition('Café video.mp4');
  assert.match(header, /filename="Caf_ video\.mp4"/);
  assert.match(header, /filename\*=UTF-8''Caf%C3%A9%20video\.mp4/);
});

test('contentDisposition escapes quotes and parentheses', () => {
  const header = contentDisposition('a "quote" (test).mp4');
  assert.match(header, /filename="a _quote_ \(test\)\.mp4"/);
  assert.match(header, /filename\*=UTF-8''a%20%22quote%22%20%28test%29\.mp4/);
});
