import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { contentDisposition } from '../../../lib/filename.js';
import { AppError } from '../../../lib/errors.js';
import { appErrorResponse, jsonResponse, rateLimitResponse } from '../../../lib/http.js';
import { checkRateLimit } from '../../../lib/server-rate-limit.js';
import { validateVideoUrl } from '../../../lib/validate-url.js';
import { downloadVideo } from '../../../lib/ytdlp.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseQuality(rawQuality) {
  if (!rawQuality || rawQuality === 'best') return 'best';

  const quality = Number.parseInt(rawQuality, 10);
  if (
    !/^\d{2,4}$/.test(rawQuality) ||
    !Number.isInteger(quality) ||
    quality < 144 ||
    quality > 4320
  ) {
    return null;
  }

  return String(quality);
}

export async function GET(request) {
  const limit = checkRateLimit(request);
  if (!limit.allowed) {
    return rateLimitResponse(limit);
  }

  const params = new URL(request.url).searchParams;
  const validation = validateVideoUrl(params.get('url'));
  if (!validation.ok) {
    return jsonResponse(
      { error: validation.error, code: 'INVALID_URL' },
      { status: 400 },
    );
  }

  const format = (params.get('format') || 'mp4').toLowerCase();
  if (format !== 'mp4' && format !== 'mp3') {
    return jsonResponse(
      { error: 'Format must be mp4 or mp3.', code: 'INVALID_FORMAT' },
      { status: 400 },
    );
  }

  const quality = parseQuality(params.get('quality') || 'best');
  if (!quality) {
    return jsonResponse(
      { error: 'Quality must be best or a height between 144 and 4320.', code: 'INVALID_QUALITY' },
      { status: 400 },
    );
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'tubegram-'));
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    const result = await downloadVideo({
      url: validation.url,
      quality,
      format,
      tempDir,
      signal: request.signal,
    });

    const fileStream = createReadStream(result.filePath);
    fileStream.on('close', cleanup);
    fileStream.on('error', (error) => {
      console.error('[tubegram] Stream error:', error);
      cleanup();
    });

    request.signal.addEventListener(
      'abort',
      () => {
        fileStream.destroy();
        cleanup();
      },
      { once: true },
    );

    return new Response(Readable.toWeb(fileStream), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': String(result.size),
        'Content-Disposition': contentDisposition(result.filename),
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-RateLimit-Remaining': String(limit.remaining),
      },
    });
  } catch (error) {
    await cleanup();

    if (error instanceof AppError && error.code === 'ABORTED') {
      return new Response(null, { status: 499 });
    }

    return appErrorResponse(error);
  }
}
