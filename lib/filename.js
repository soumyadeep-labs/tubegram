const MAX_BASE_LENGTH = 120;

function stripUnsafeCharacters(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
}

/** Builds the filename we suggest to the browser for a fresh download. */
export function suggestFilename(title, extension = 'mp4') {
  const ext = extension === 'mp3' ? 'mp3' : 'mp4';
  const base = [...stripUnsafeCharacters(title || 'video')]
    .slice(0, MAX_BASE_LENGTH)
    .join('')
    .trim();

  return `${base || 'video'}.${ext}`;
}

/**
 * yt-dlp writes files as "Title [video-id].mp4". Strip the id marker so the
 * saved file has a friendlier name.
 */
export function cleanDownloadedName(filename) {
  const name = String(filename || '').split(/[\\/]/).pop() || 'video.mp4';
  return name.replace(/\s+\[[^\]]+\](?=\.[^.]+$)/, '');
}

function asciiFallback(filename) {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .trim();
  return fallback || 'video';
}

function encodeRfc5987(filename) {
  return encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Content-Disposition with a plain ASCII fallback and a UTF-8 filename. */
export function contentDisposition(filename) {
  return `attachment; filename="${asciiFallback(filename)}"; filename*=UTF-8''${encodeRfc5987(
    filename,
  )}`;
}
