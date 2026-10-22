import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

function optionalRequire(id) {
  try {
    return require(id);
  } catch {
    return null;
  }
}

const YT_DLP_ASSETS = {
  'linux-x64': 'yt-dlp_linux',
  'linux-arm64': 'yt-dlp_linux_aarch64',
  'linux-arm': 'yt-dlp_linux_armv7l',
  'darwin-x64': 'yt-dlp_macos',
  'darwin-arm64': 'yt-dlp_macos',
  'win32-x64': 'yt-dlp.exe',
  'win32-ia32': 'yt-dlp_x86.exe',
};

export function getYtDlpAsset(
  platform = process.platform,
  architecture = process.arch,
) {
  return YT_DLP_ASSETS[`${platform}-${architecture}`] ?? null;
}

export function ytDlpBinaryName(platform = process.platform) {
  return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

export function bundledYtDlpPath(
  root = process.cwd(),
  platform = process.platform,
) {
  return path.join(root, '.tools', ytDlpBinaryName(platform));
}

/**
 * Prefer an explicit YTDLP_PATH, then the binary installed by npm, then
 * whatever `yt-dlp` happens to be on PATH.
 */
export function resolveYtDlpPath({
  envPath = process.env.YTDLP_PATH,
  root = process.cwd(),
  platform = process.platform,
} = {}) {
  if (envPath) return envPath;

  const bundled = bundledYtDlpPath(root, platform);
  return existsSync(bundled) ? bundled : 'yt-dlp';
}

/** Prefer FFMPEG_PATH, then the binary shipped by ffmpeg-static, then PATH. */
export function resolveFfmpegPath({
  envPath = process.env.FFMPEG_PATH,
} = {}) {
  if (envPath) return envPath;

  const ffmpegStatic = optionalRequire('ffmpeg-static');
  if (
    typeof ffmpegStatic === 'string' &&
    existsSync(/* turbopackIgnore: true */ ffmpegStatic)
  ) {
    return ffmpegStatic;
  }

  return 'ffmpeg';
}

/** Prefer FFPROBE_PATH, then the binary shipped by @ffprobe-installer, then PATH. */
export function resolveFfprobePath({
  envPath = process.env.FFPROBE_PATH,
} = {}) {
  if (envPath) return envPath;

  const ffprobeInstaller = optionalRequire('@ffprobe-installer/ffprobe');
  if (
    typeof ffprobeInstaller?.path === 'string' &&
    existsSync(/* turbopackIgnore: true */ ffprobeInstaller.path)
  ) {
    return ffprobeInstaller.path;
  }

  return 'ffprobe';
}
