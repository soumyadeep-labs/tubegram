/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Render builds a self-contained server; local builds stay in normal mode so
  // `next start` works without extra copying.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
};

export default nextConfig;
