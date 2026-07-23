/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // node-fetch (pulled in by Firebase Auth) optionally requires 'encoding'
    // for non-utf8 responses, a path Firebase never actually hits. Telling
    // webpack to resolve it to an empty module avoids the "Module not found:
    // Can't resolve 'encoding'" warning without adding an unused dependency.
    config.resolve.fallback = { ...config.resolve.fallback, encoding: false };
    return config;
  },
};

module.exports = nextConfig;
