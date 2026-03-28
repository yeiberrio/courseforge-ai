import crypto from 'crypto';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  generateBuildId: () => crypto.randomUUID(),
};

export default nextConfig;
