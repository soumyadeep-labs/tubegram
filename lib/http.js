import { AppError } from './errors.js';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};

export function jsonResponse(data, { status = 200, headers = {} } = {}) {
  return Response.json(data, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

export function appErrorResponse(error) {
  if (error instanceof AppError) {
    return jsonResponse(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error('[tubegram] Unexpected error:', error);
  return jsonResponse(
    { error: 'Something went wrong. Try again.', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}

export function rateLimitResponse(result) {
  return jsonResponse(
    {
      error: `Too many requests. Try again in ${result.retryAfterSeconds} second${
        result.retryAfterSeconds === 1 ? '' : 's'
      }.`,
      code: 'RATE_LIMITED',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    },
  );
}
