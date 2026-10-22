import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { config } from './config.js';
import { AppError, mapYtDlpError } from './errors.js';
import {
  cleanDownloadedName,
  suggestFilename,
} from './filename.js';

const MAX_STDOUT_BYTES = 20 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;

function killProcessTree(child) {
  if (!child.pid) return;

  try {
    if (process.platform === 'win32') {
      child.kill('SIGKILL');
    } else {
      // yt-dlp is detached so its ffmpeg children share a process group.
      process.kill(-child.pid, 'SIGKILL');
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // The process already exited.
    }
  }
}

export function buildToolEnvironment({
  ffmpegPath = config.ffmpegPath,
  ffprobePath = config.ffprobePath,
  env = process.env,
} = {}) {
  const directories = [
    ...new Set(
      [ffmpegPath, ffprobePath]
        .filter((tool) => tool && path.isAbsolute(tool))
        .map((tool) => path.dirname(tool)),
    ),
  ];

  if (directories.length === 0) return env;

  const pathKey =
    Object.keys(env).find((key) => key.toUpperCase() === 'PATH') || 'PATH';

  return {
    ...env,
    [pathKey]: [
      ...directories,
      env[pathKey] || '',
    ]
      .filter(Boolean)
      .join(path.delimiter),
  };
}

export function runYtDlp(
  args,
  {
    timeoutMs = config.infoTimeoutMs,
    signal,
    maxStdoutBytes = MAX_STDOUT_BYTES,
  } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      env: buildToolEnvironment(),
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let aborted = false;
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      callback(value);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeoutMs);

    function onAbort() {
      aborted = true;
      killProcessTree(child);
    }

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (stdout.length < maxStdoutBytes) {
        stdout += chunk.slice(0, maxStdoutBytes - stdout.length);
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_STDERR_BYTES) {
        stderr += chunk.slice(0, MAX_STDERR_BYTES - stderr.length);
      }
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        finish(
          reject,
          new AppError(
            'yt-dlp is not installed on this server. Install it, then restart the app.',
            { status: 503, code: 'YTDLP_MISSING', cause: error },
          ),
        );
        return;
      }

      finish(
        reject,
        new AppError('Could not start the download engine.', {
          status: 500,
          code: 'YTDLP_START_FAILED',
          cause: error,
        }),
      );
    });

    child.on('close', (code, closeSignal) => {
      finish(resolve, {
        code,
        signal: closeSignal,
        stdout,
        stderr,
        timedOut,
        aborted,
      });
    });
  });
}

function baseArgs() {
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout',
    '15',
    '--retries',
    '3',
  ];

  if (config.ytDlpJsRuntime) {
    args.push('--js-runtimes', config.ytDlpJsRuntime);
  }

  return args;
}

export function buildInfoArgs(url) {
  return [
    ...baseArgs(),
    '--skip-download',
    '--dump-single-json',
    '--',
    url,
  ];
}

export function buildFormatSelector(quality = 'best') {
  if (!quality || quality === 'best') {
    return [
      'bv*[vcodec^=avc1]+ba[ext=m4a]',
      'b[vcodec^=avc1]',
      'bv*[ext=mp4]+ba[ext=m4a]',
      'bv*+ba',
      'b',
    ].join('/');
  }

  const height = Number.parseInt(quality, 10);
  if (!Number.isInteger(height) || height < 1) {
    throw new AppError('Choose a valid quality.', {
      status: 400,
      code: 'INVALID_QUALITY',
    });
  }

  // H.264 first for the widest device support, then any MP4, then anything.
  return [
    `bv*[height<=${height}][vcodec^=avc1]+ba[ext=m4a]`,
    `b[height<=${height}][vcodec^=avc1]`,
    `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]`,
    `bv*[height<=${height}]+ba`,
    `b[height<=${height}]`,
  ].join('/');
}

export function buildDownloadArgs({
  url,
  quality = 'best',
  format = 'mp4',
  outputTemplate,
}) {
  if (!outputTemplate) {
    throw new Error('An output template is required');
  }

  const args = [
    ...baseArgs(),
    '--no-progress',
    '--no-part',
    '--no-mtime',
    '--max-filesize',
    `${config.maxVideoSizeMb}M`,
    '--match-filter',
    `duration <= ${config.maxVideoDurationMinutes * 60}`,
  ];

  if (format === 'mp3') {
    args.push(
      '--format',
      'bestaudio/best',
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
    );
  } else {
    args.push(
      '--format',
      buildFormatSelector(quality),
      '--merge-output-format',
      'mp4',
      '--remux-video',
      'mp4',
    );
  }

  args.push('--output', outputTemplate, '--', url);
  return args;
}

function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function pickThumbnail(data) {
  const direct = safeHttpUrl(data.thumbnail);
  if (direct) return direct;

  if (Array.isArray(data.thumbnails)) {
    for (let index = data.thumbnails.length - 1; index >= 0; index -= 1) {
      const candidate = safeHttpUrl(data.thumbnails[index]?.url);
      if (candidate) return candidate;
    }
  }

  return null;
}

function buildQualities(formats = []) {
  const heights = new Set();

  for (const item of formats) {
    const height = Number(item?.height);
    if (
      item?.vcodec &&
      item.vcodec !== 'none' &&
      Number.isFinite(height) &&
      height > 0 &&
      height <= 4320
    ) {
      heights.add(Math.round(height));
    }
  }

  return [
    { value: 'best', label: 'Best available' },
    ...[...heights]
      .sort((left, right) => right - left)
      .map((height) => ({
        value: String(height),
        label: height >= 2160 ? `${height}p (4K)` : `${height}p`,
      })),
  ];
}

export function parseVideoInfo(stdout, fallbackUrl) {
  let data;
  try {
    data = JSON.parse(stdout);
  } catch (error) {
    throw new AppError('The platform returned an unexpected response.', {
      status: 502,
      code: 'BAD_PLATFORM_RESPONSE',
      cause: error,
    });
  }

  if (data?._type === 'playlist' || Array.isArray(data?.entries)) {
    throw new AppError('Playlists and channels are not supported. Paste one video link.', {
      status: 422,
      code: 'PLAYLIST_UNSUPPORTED',
    });
  }

  if (data?.is_live || data?.live_status === 'is_live') {
    throw new AppError('Live streams cannot be downloaded.', {
      status: 422,
      code: 'LIVE_STREAM',
    });
  }

  const durationSeconds = Number.isFinite(Number(data?.duration))
    ? Math.round(Number(data.duration))
    : null;

  const title =
    typeof data?.title === 'string' && data.title.trim()
      ? data.title.trim().slice(0, 300)
      : 'Untitled video';

  return {
    sourceUrl: safeHttpUrl(data?.webpage_url) || fallbackUrl,
    title,
    thumbnail: pickThumbnail(data ?? {}),
    durationSeconds,
    uploader:
      typeof data?.uploader === 'string'
        ? data.uploader.trim().slice(0, 200)
        : typeof data?.channel === 'string'
          ? data.channel.trim().slice(0, 200)
          : null,
    qualities: buildQualities(data?.formats),
    filename: suggestFilename(title, 'mp4'),
  };
}

export async function getVideoInfo(url, { signal } = {}) {
  const result = await runYtDlp(buildInfoArgs(url), {
    timeoutMs: config.infoTimeoutMs,
    signal,
  });

  if (result.aborted) {
    throw new AppError('Request cancelled.', { status: 499, code: 'ABORTED' });
  }

  if (result.timedOut) {
    throw new AppError('The platform took too long to respond.', {
      status: 504,
      code: 'INFO_TIMEOUT',
    });
  }

  if (result.code !== 0) {
    console.error('[tubegram] yt-dlp info failed:', result.stderr);
    throw mapYtDlpError(result.stderr);
  }

  return parseVideoInfo(result.stdout, url);
}

async function findOutputFile(tempDir, format) {
  const expectedExtension = format === 'mp3' ? '.mp3' : '.mp4';
  const entries = await readdir(tempDir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        !name.endsWith('.part') &&
        !name.endsWith('.ytdl') &&
        name.toLowerCase().endsWith(expectedExtension),
    );

  if (files.length === 0) {
    throw new AppError(
      'The video could not be saved in the requested format. Try a different quality.',
      { status: 502, code: 'OUTPUT_MISSING' },
    );
  }

  const filePath = path.resolve(tempDir, files[0]);
  if (!filePath.startsWith(path.resolve(tempDir) + path.sep)) {
    throw new AppError('The download engine returned an invalid file.', {
      status: 500,
      code: 'INVALID_OUTPUT',
    });
  }

  return filePath;
}

export async function downloadVideo({
  url,
  quality = 'best',
  format = 'mp4',
  tempDir,
  signal,
}) {
  const outputTemplate = path.join(
    tempDir,
    '%(title).150B [%(id)s].%(ext)s',
  );

  const result = await runYtDlp(
    buildDownloadArgs({ url, quality, format, outputTemplate }),
    { timeoutMs: config.downloadTimeoutMs, signal },
  );

  if (result.aborted) {
    throw new AppError('Download cancelled.', { status: 499, code: 'ABORTED' });
  }

  if (result.timedOut) {
    throw new AppError('The download took too long and was stopped.', {
      status: 504,
      code: 'DOWNLOAD_TIMEOUT',
    });
  }

  if (result.code !== 0) {
    console.error('[tubegram] yt-dlp download failed:', result.stderr);
    throw mapYtDlpError(result.stderr);
  }

  const filePath = await findOutputFile(tempDir, format);
  const info = await stat(filePath);

  if (!info.isFile() || info.size === 0) {
    throw new AppError('The downloaded file is empty.', {
      status: 502,
      code: 'EMPTY_OUTPUT',
    });
  }

  if (info.size > config.maxVideoSizeMb * 1024 * 1024) {
    throw new AppError('This video is larger than the server’s size limit.', {
      status: 413,
      code: 'FILE_TOO_LARGE',
    });
  }

  return {
    filePath,
    filename: cleanDownloadedName(path.basename(filePath)),
    size: info.size,
    contentType: format === 'mp3' ? 'audio/mpeg' : 'video/mp4',
  };
}
