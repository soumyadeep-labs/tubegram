export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', cause } = {}) {
    super(message, { cause });
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

function matches(text, pattern) {
  return pattern.test(text);
}

/**
 * Turns yt-dlp's messy stderr into a short, safe message for the browser.
 * The original stderr is logged by the caller and never sent to the client.
 */
export function mapYtDlpError(stderr = '') {
  const text = String(stderr).toLowerCase();

  if (matches(text, /private video|this video is private/)) {
    return new AppError('This video is private.', {
      status: 403,
      code: 'VIDEO_PRIVATE',
    });
  }

  if (matches(text, /members-only|join this channel|channel members/)) {
    return new AppError('This video is only available to channel members.', {
      status: 403,
      code: 'VIDEO_MEMBERS_ONLY',
    });
  }

  if (matches(text, /age-restricted|confirm your age|inappropriate for some users/)) {
    return new AppError(
      'This video is age-restricted, so the platform will not serve it to this server.',
      { status: 403, code: 'VIDEO_AGE_RESTRICTED' },
    );
  }

  if (
    matches(
      text,
      /login required|requires authentication|please log in|sign in to confirm|use --cookies|authentication required/,
    )
  ) {
    return new AppError(
      'This platform is asking for a sign-in. Instagram posts and some YouTube videos need a logged-in session.',
      { status: 403, code: 'LOGIN_REQUIRED' },
    );
  }

  if (matches(text, /removed by the uploader|has been deleted|does not exist/)) {
    return new AppError('This video no longer exists.', {
      status: 410,
      code: 'VIDEO_DELETED',
    });
  }

  if (matches(text, /not available in your country|geo.?restrict/)) {
    return new AppError('This video is not available in the server’s region.', {
      status: 451,
      code: 'VIDEO_GEO_BLOCKED',
    });
  }

  if (
    matches(
      text,
      /video unavailable|this video is unavailable|content isn.t available|no longer available/,
    )
  ) {
    return new AppError('This video is unavailable.', {
      status: 404,
      code: 'VIDEO_UNAVAILABLE',
    });
  }

  if (matches(text, /unsupported url|is not a valid url/)) {
    return new AppError('That link is not supported. Paste a YouTube or Instagram video link.', {
      status: 400,
      code: 'UNSUPPORTED_URL',
    });
  }

  if (matches(text, /larger than max-filesize|file is larger than/)) {
    return new AppError('This video is larger than the server’s size limit.', {
      status: 413,
      code: 'FILE_TOO_LARGE',
    });
  }

  if (matches(text, /does not pass filter|duration.*filter/)) {
    return new AppError('This video is longer than the server’s time limit.', {
      status: 422,
      code: 'VIDEO_TOO_LONG',
    });
  }

  if (matches(text, /requested format is not available|no video formats found/)) {
    return new AppError('The requested quality is not available for this video.', {
      status: 422,
      code: 'FORMAT_UNAVAILABLE',
    });
  }

  if (matches(text, /http error 429|too many requests|rate.?limit/)) {
    return new AppError('The video platform is rate-limiting this server. Try again later.', {
      status: 429,
      code: 'PLATFORM_RATE_LIMITED',
    });
  }

  if (matches(text, /timed out|timeout/)) {
    return new AppError('The download took too long and was stopped.', {
      status: 504,
      code: 'DOWNLOAD_TIMEOUT',
    });
  }

  if (
    matches(
      text,
      /unable to download webpage|network is unreachable|getaddrinfo|connection refused|connection reset/,
    )
  ) {
    return new AppError('Could not reach the video platform. Try again in a moment.', {
      status: 502,
      code: 'PLATFORM_UNREACHABLE',
    });
  }

  return new AppError('The video could not be processed. The link may be private or broken.', {
    status: 502,
    code: 'YTDLP_ERROR',
  });
}
