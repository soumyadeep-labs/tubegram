/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // These packages resolve native binaries at runtime; do not bundle them.
  serverExternalPackages: ['ffmpeg-static', '@ffprobe-installer/ffprobe'],
};

export default nextConfig;
