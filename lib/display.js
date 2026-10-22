import { suggestFilename } from './filename.js';

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Length unknown';

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) return `${hours} hr ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${remainingSeconds} sec`;
  return `${remainingSeconds} sec`;
}

export function filenameFor(title, format) {
  return suggestFilename(title, format === 'mp3' ? 'mp3' : 'mp4');
}
