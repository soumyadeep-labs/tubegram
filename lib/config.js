const DEFAULT_ALLOWED_DOMAINS = ['youtube.com', 'youtu.be', 'instagram.com'];

function readPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readList(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * All runtime settings come from environment variables so the same build can
 * run locally and on the public instance with stricter limits.
 */
export const config = {
  allowedDomains: readList('ALLOWED_DOMAINS', DEFAULT_ALLOWED_DOMAINS),
  rateLimitPerMinute: readPositiveInt('RATE_LIMIT_PER_MINUTE', 10),
  maxVideoDurationMinutes: readPositiveInt('MAX_VIDEO_DURATION_MINUTES', 30),
  maxVideoSizeMb: readPositiveInt('MAX_VIDEO_SIZE_MB', 200),
  downloadTimeoutMs: readPositiveInt('DOWNLOAD_TIMEOUT_MS', 10 * 60 * 1000),
  infoTimeoutMs: readPositiveInt('INFO_TIMEOUT_MS', 60 * 1000),
  ytDlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  // yt-dlp uses a JavaScript runtime to solve YouTube's player challenges.
  // Set YTDLP_JS_RUNTIME to an empty string to disable this on older builds.
  ytDlpJsRuntime:
    process.env.YTDLP_JS_RUNTIME === undefined
      ? 'node'
      : process.env.YTDLP_JS_RUNTIME.trim(),
  ffmpegPath: process.env.FFMPEG_PATH || '',
};
