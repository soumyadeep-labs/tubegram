import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { config } from '../lib/config.js';
import { AppError, mapYtDlpError } from '../lib/errors.js';
import {
  buildDownloadArgs,
  buildFormatSelector,
  buildInfoArgs,
  buildToolEnvironment,
  parseVideoInfo,
} from '../lib/ytdlp.js';

test('buildInfoArgs passes the URL as its own argument', () => {
  const url = 'https://www.youtube.com/watch?v=abc123&list=evil';
  const args = buildInfoArgs(url);

  assert.equal(args.at(-2), '--');
  assert.equal(args.at(-1), url);
  assert.ok(args.includes('--dump-single-json'));
  assert.ok(args.includes('--skip-download'));
  assert.ok(args.includes('--no-playlist'));
});

test('buildFormatSelector prefers MP4 and caps the height', () => {
  assert.equal(
    buildFormatSelector('best'),
    'bv*[vcodec^=avc1]+ba[ext=m4a]/b[vcodec^=avc1]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b',
  );
  assert.match(buildFormatSelector('720'), /height<=720/);
  assert.match(buildFormatSelector('720'), /vcodec\^=avc1/);
  assert.throws(() => buildFormatSelector('nope'), AppError);
  assert.throws(() => buildFormatSelector('0'), AppError);
});

test('buildToolEnvironment puts bundled tool directories first on PATH', () => {
  const original = { PATH: '/usr/bin' };
  const env = buildToolEnvironment({
    ffmpegPath: '/opt/tools/ffmpeg',
    ffprobePath: '/opt/tools/ffprobe',
    env: original,
  });

  assert.equal(env.PATH, ['/opt/tools', '/usr/bin'].join(path.delimiter));
  assert.equal(original.PATH, '/usr/bin');

  assert.equal(
    buildToolEnvironment({
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      env: original,
    }),
    original,
  );
});

test('buildDownloadArgs builds safe MP4 arguments', () => {
  const url = 'https://youtu.be/abc123';
  const args = buildDownloadArgs({
    url,
    quality: '720',
    format: 'mp4',
    outputTemplate: '/tmp/tubegram/%(title)s.%(ext)s',
  });

  assert.equal(args.at(-2), '--');
  assert.equal(args.at(-1), url);
  assert.ok(args.includes('--merge-output-format'));
  assert.ok(args.includes('--remux-video'));
  assert.ok(args.includes('--max-filesize'));
  assert.equal(args[args.indexOf('--max-filesize') + 1], `${config.maxVideoSizeMb}M`);
  assert.equal(
    args[args.indexOf('--match-filter') + 1],
    `duration <= ${config.maxVideoDurationMinutes * 60}`,
  );
  assert.match(args[args.indexOf('--format') + 1], /height<=720/);
  assert.ok(!args.includes('--extract-audio'));
  assert.equal(
    args[args.indexOf('--output') + 1],
    '/tmp/tubegram/%(title)s.%(ext)s',
  );
});

test('buildDownloadArgs builds MP3 arguments', () => {
  const args = buildDownloadArgs({
    url: 'https://www.instagram.com/reel/abc/',
    format: 'mp3',
    outputTemplate: '/tmp/tubegram/%(title)s.%(ext)s',
  });

  assert.ok(args.includes('--extract-audio'));
  assert.equal(args[args.indexOf('--audio-format') + 1], 'mp3');
  assert.ok(!args.includes('--merge-output-format'));
  assert.equal(args[args.indexOf('--format') + 1], 'bestaudio/best');
});

test('parseVideoInfo extracts preview data and available qualities', () => {
  const info = parseVideoInfo(
    JSON.stringify({
      _type: 'video',
      title: 'Example: Video',
      duration: 125.4,
      webpage_url: 'https://www.youtube.com/watch?v=abc123',
      thumbnail: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
      uploader: 'Alice',
      formats: [
        { height: 1080, vcodec: 'avc1', acodec: 'none' },
        { height: 720, vcodec: 'vp9', acodec: 'none' },
        { height: 360, vcodec: 'avc1', acodec: 'none' },
        { height: 1080, vcodec: 'none', acodec: 'mp4a' },
        { height: null, vcodec: 'avc1' },
      ],
    }),
    'https://www.youtube.com/watch?v=abc123',
  );

  assert.equal(info.title, 'Example: Video');
  assert.equal(info.durationSeconds, 125);
  assert.equal(info.uploader, 'Alice');
  assert.equal(info.filename, 'Example Video.mp4');
  assert.deepEqual(
    info.qualities.map((quality) => quality.value),
    ['best', '1080', '720', '360'],
  );
});

test('parseVideoInfo rejects playlists and live streams', () => {
  assert.throws(
    () => parseVideoInfo(JSON.stringify({ _type: 'playlist', entries: [] }), 'x'),
    (error) => error instanceof AppError && error.code === 'PLAYLIST_UNSUPPORTED',
  );

  assert.throws(
    () => parseVideoInfo(JSON.stringify({ title: 'Live', is_live: true }), 'x'),
    (error) => error instanceof AppError && error.code === 'LIVE_STREAM',
  );
});

test('parseVideoInfo drops unsafe thumbnail URLs and bad JSON', () => {
  const info = parseVideoInfo(
    JSON.stringify({ title: 'No thumb', thumbnail: 'javascript:alert(1)' }),
    'https://youtu.be/abc',
  );
  assert.equal(info.thumbnail, null);

  assert.throws(
    () => parseVideoInfo('not json', 'x'),
    (error) => error instanceof AppError && error.code === 'BAD_PLATFORM_RESPONSE',
  );
});

test('mapYtDlpError maps common platform failures', () => {
  const cases = [
    ['ERROR: Private video. Sign in if you have access.', 'VIDEO_PRIVATE', 403],
    ['ERROR: This video is only available to channel members', 'VIDEO_MEMBERS_ONLY', 403],
    ['ERROR: Sign in to confirm you are not a bot', 'LOGIN_REQUIRED', 403],
    ['ERROR: This video has been removed by the uploader', 'VIDEO_DELETED', 410],
    ['ERROR: This video is not available in your country', 'VIDEO_GEO_BLOCKED', 451],
    ['ERROR: Video unavailable', 'VIDEO_UNAVAILABLE', 404],
    ['ERROR: Unsupported URL: https://example.com', 'UNSUPPORTED_URL', 400],
    ['File is larger than max-filesize (300MiB > 200MiB)', 'FILE_TOO_LARGE', 413],
    ['does not pass filter (duration <= 1800)', 'VIDEO_TOO_LONG', 422],
    ['Requested format is not available', 'FORMAT_UNAVAILABLE', 422],
    ['HTTP Error 429: Too Many Requests', 'PLATFORM_RATE_LIMITED', 429],
    ['unable to download webpage: connection refused', 'PLATFORM_UNREACHABLE', 502],
  ];

  for (const [stderr, code, status] of cases) {
    const error = mapYtDlpError(stderr);
    assert.equal(error.code, code, `unexpected code for: ${stderr}`);
    assert.equal(error.status, status, `unexpected status for: ${stderr}`);
  }

  const generic = mapYtDlpError('something nobody predicted');
  assert.equal(generic.code, 'YTDLP_ERROR');
  assert.equal(generic.status, 502);
});
