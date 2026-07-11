/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // tfjs-node ships native bindings — keep it out of the client bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    }
    // ✅ Yeh line add karo - alias for @
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    return config;
  },
};

module.exports = nextConfig;