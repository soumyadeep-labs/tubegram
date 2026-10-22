#!/usr/bin/env node

/**
 * Downloads a self-contained yt-dlp binary into .tools/.
 *
 * Runs automatically after `npm install`, so a fresh clone needs Node only --
 * no Python, no system yt-dlp, no Docker. On Render every build fetches the
 * latest release.
 */

import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { chmod, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { bundledYtDlpPath, getYtDlpAsset } from '../lib/tools.js';

function verifyBinary(binary) {
  const result = spawnSync(binary, ['--version'], {
    encoding: 'utf8',
    timeout: 30_000,
  });

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.error?.message ||
        'The downloaded yt-dlp binary did not run.',
    );
  }

  return result.stdout.trim();
}

async function main() {
  const force = process.argv.includes('--force');
  const skip = process.env.YTDLP_SKIP_DOWNLOAD === '1';
  const target = bundledYtDlpPath();

  if (process.env.YTDLP_PATH && !force) {
    console.log(`YTDLP_PATH is set; keeping ${process.env.YTDLP_PATH}.`);
    return;
  }

  if (skip && !force) {
    console.log('YTDLP_SKIP_DOWNLOAD=1; skipping the yt-dlp download.');
    return;
  }

  if (existsSync(target) && !force) {
    try {
      const version = verifyBinary(target);
      console.log(`Using bundled yt-dlp ${version}.`);
      return;
    } catch {
      console.warn('The bundled yt-dlp is not runnable; downloading a fresh copy.');
      await rm(target, { force: true });
    }
  }

  const asset = getYtDlpAsset();
  if (!asset) {
    throw new Error(
      `No yt-dlp binary is available for ${process.platform}-${process.arch}. Install yt-dlp yourself and set YTDLP_PATH.`,
    );
  }

  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  const temporary = `${target}.download`;

  console.log(`Downloading yt-dlp (${asset})...`);
  await mkdir(path.dirname(target), { recursive: true });

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok || !response.body) {
      throw new Error(`GitHub returned HTTP ${response.status}.`);
    }

    await pipeline(
      Readable.fromWeb(response.body),
      createWriteStream(temporary, { mode: 0o755 }),
    );

    if (process.platform !== 'win32') {
      await chmod(temporary, 0o755);
    }

    const version = verifyBinary(temporary);
    await rename(temporary, target);
    console.log(
      `yt-dlp ${version} ready at ${path.relative(process.cwd(), target)}.`,
    );
  } catch (error) {
    await rm(temporary, { force: true });
    throw new Error(
      `Could not install yt-dlp: ${error.message}. Retry with "npm run tools:update", or install yt-dlp yourself and set YTDLP_PATH.`,
      { cause: error },
    );
  }
}

await main();
