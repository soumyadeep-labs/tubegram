import { config } from './config.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_URL_LENGTH = 2048;

function isAllowedHost(hostname, allowedDomains) {
  return allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

/**
 * Validates a pasted link before it is ever passed to yt-dlp.
 * Only http(s) links on the configured allowlist are accepted.
 */
export function validateVideoUrl(input, allowedDomains = config.allowedDomains) {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Paste a video link first.' };
  }

  const value = input.trim();
  if (!value) {
    return { ok: false, error: 'Paste a video link first.' };
  }

  if (value.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'That link is too long.' };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: 'That does not look like a valid link.' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, error: 'Only http and https links are supported.' };
  }

  if (url.username || url.password) {
    return { ok: false, error: 'Links with a username or password are not supported.' };
  }

  if (url.port && url.port !== '80' && url.port !== '443') {
    return { ok: false, error: 'Links with a custom port are not supported.' };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || !isAllowedHost(hostname, allowedDomains)) {
    return {
      ok: false,
      error: 'Only YouTube and Instagram links are supported.',
    };
  }

  return { ok: true, url: url.toString() };
}
