import { config } from '../../../lib/config.js';
import { AppError } from '../../../lib/errors.js';
import { appErrorResponse, jsonResponse, rateLimitResponse } from '../../../lib/http.js';
import { checkRateLimit } from '../../../lib/server-rate-limit.js';
import { getVideoInfo } from '../../../lib/ytdlp.js';
import { validateVideoUrl } from '../../../lib/validate-url.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const limit = checkRateLimit(request);
  if (!limit.allowed) {
    return rateLimitResponse(limit);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Send a JSON body with a url field.' }, { status: 400 });
  }

  const validation = validateVideoUrl(body?.url);
  if (!validation.ok) {
    return jsonResponse(
      { error: validation.error, code: 'INVALID_URL' },
      { status: 400, headers: { 'X-RateLimit-Remaining': String(limit.remaining) } },
    );
  }

  try {
    const info = await getVideoInfo(validation.url, { signal: request.signal });

    if (
      info.durationSeconds !== null &&
      info.durationSeconds > config.maxVideoDurationMinutes * 60
    ) {
      throw new AppError(
        `This video is longer than the ${config.maxVideoDurationMinutes}-minute limit.`,
        { status: 422, code: 'VIDEO_TOO_LONG' },
      );
    }

    return jsonResponse(
      {
        ...info,
        durationMinutes:
          info.durationSeconds === null
            ? null
            : Math.ceil(info.durationSeconds / 60),
        formats: ['mp4', 'mp3'],
        limits: {
          maxDurationMinutes: config.maxVideoDurationMinutes,
          maxSizeMb: config.maxVideoSizeMb,
        },
      },
      { headers: { 'X-RateLimit-Remaining': String(limit.remaining) } },
    );
  } catch (error) {
    return appErrorResponse(error);
  }
}
