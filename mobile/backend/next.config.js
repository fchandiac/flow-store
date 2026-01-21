/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Suppress TypeORM warnings about missing database drivers in mobile environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'react-native-sqlite-storage': false,
      'mysql': false,
      '@sap/hana-client/extension/Stream': false,
    };

    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /typeorm\/connection\/ConnectionOptionsReader/ },
      { module: /typeorm\/driver\/react-native\/ReactNativeDriver/ },
      { module: /typeorm\/platform\/PlatformTools/ },
      { module: /typeorm\/util\/DirectoryExportedClassesLoader/ },
      { module: /app-root-path/ },
    ];

    return config;
  },
};

module.exports = nextConfig;
