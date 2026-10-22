import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  bundledYtDlpPath,
  getYtDlpAsset,
  resolveFfmpegPath,
  resolveFfprobePath,
  resolveYtDlpPath,
  ytDlpBinaryName,
} from '../lib/tools.js';

test('getYtDlpAsset maps every supported platform', () => {
  assert.equal(getYtDlpAsset('linux', 'x64'), 'yt-dlp_linux');
  assert.equal(getYtDlpAsset('linux', 'arm64'), 'yt-dlp_linux_aarch64');
  assert.equal(getYtDlpAsset('linux', 'arm'), 'yt-dlp_linux_armv7l');
  assert.equal(getYtDlpAsset('darwin', 'x64'), 'yt-dlp_macos');
  assert.equal(getYtDlpAsset('darwin', 'arm64'), 'yt-dlp_macos');
  assert.equal(getYtDlpAsset('win32', 'x64'), 'yt-dlp.exe');
  assert.equal(getYtDlpAsset('win32', 'ia32'), 'yt-dlp_x86.exe');
});

test('getYtDlpAsset returns null for unsupported targets', () => {
  assert.equal(getYtDlpAsset('freebsd', 'x64'), null);
  assert.equal(getYtDlpAsset('linux', 'riscv64'), null);
});

test('binary paths use the right name per platform', () => {
  assert.equal(ytDlpBinaryName('linux'), 'yt-dlp');
  assert.equal(ytDlpBinaryName('darwin'), 'yt-dlp');
  assert.equal(ytDlpBinaryName('win32'), 'yt-dlp.exe');
  assert.match(bundledYtDlpPath('/srv/app', 'linux'), /\.tools[/\\]yt-dlp$/);
  assert.match(bundledYtDlpPath('/srv/app', 'win32'), /\.tools[/\\]yt-dlp\.exe$/);
});

test('resolveYtDlpPath prefers env, then the bundled binary, then PATH', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tubegram-tools-'));

  try {
    assert.equal(
      resolveYtDlpPath({ envPath: '/custom/yt-dlp', root, platform: 'linux' }),
      '/custom/yt-dlp',
    );
    assert.equal(
      resolveYtDlpPath({ envPath: '', root, platform: 'linux' }),
      'yt-dlp',
    );

    const bundled = bundledYtDlpPath(root, 'linux');
    await mkdir(path.dirname(bundled), { recursive: true });
    await writeFile(bundled, '#!/bin/sh\n');

    assert.equal(
      resolveYtDlpPath({ envPath: '', root, platform: 'linux' }),
      bundled,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('resolveFfmpegPath prefers env and otherwise returns a usable path', () => {
  assert.equal(
    resolveFfmpegPath({ envPath: '/custom/ffmpeg' }),
    '/custom/ffmpeg',
  );

  const bundled = resolveFfmpegPath({ envPath: '' });
  assert.equal(typeof bundled, 'string');
  assert.ok(bundled.length > 0);
});

test('resolveFfprobePath prefers env and otherwise returns a usable path', () => {
  assert.equal(
    resolveFfprobePath({ envPath: '/custom/ffprobe' }),
    '/custom/ffprobe',
  );

  const bundled = resolveFfprobePath({ envPath: '' });
  assert.equal(typeof bundled, 'string');
  assert.ok(bundled.length > 0);
});
