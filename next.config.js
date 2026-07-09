/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tfjs-node ships native bindings — keep it out of the client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    }
    return config;
  },
};

module.exports = nextConfig;
