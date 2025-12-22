/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['typeorm', 'mysql2', 'bcryptjs'],
};

module.exports = nextConfig;
