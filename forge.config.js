const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'FlowStore',
    icon: './assets/icons/icon',
    extraResource: [
      './next/.next/standalone',
      // app.config.json will be copied by a post-package hook
    ],
    // macOS compatibility settings
    darwinDarkModeSupport: true,
    osxUniversal: {
      // Create universal binary for both Intel and Apple Silicon
      x64ArchFiles: '*',
    },
  },
  hooks: {
    postPackage: async (forgeConfig, options) => {
      const fs = require('fs-extra');
      const path = require('path');

      // Determine the correct standalone path based on platform
      let standalonePath;
      if (options.platform === 'darwin') {
        const outputDir = options.outputPaths[0];
        const appName = forgeConfig.packagerConfig.name || 'FlowStore';
        standalonePath = path.join(outputDir, `${appName}.app`, 'Contents', 'Resources', 'standalone');
      } else {
        standalonePath = path.join(options.outputPaths[0], 'resources', 'standalone');
      }

      console.log(`Platform: ${options.platform}, Standalone path: ${standalonePath}`);

      // Always copy all contents of next/.next/standalone/next (server.js, .next, etc.)
      const nextStandaloneServerSource = path.resolve(__dirname, 'next', '.next', 'standalone', 'next');
      if (fs.existsSync(nextStandaloneServerSource)) {
        console.log(`Copying Next.js standalone server from ${nextStandaloneServerSource} to ${standalonePath}`);
        await fs.copy(nextStandaloneServerSource, standalonePath, { overwrite: true });
      } else {
        console.warn(`Next.js standalone server source not found at ${nextStandaloneServerSource}`);
      }

      // Copy app.config.prod.json for production
      const prodConfigSource = path.resolve(__dirname, 'app.config.prod.json');
      const prodConfigDest = path.join(standalonePath, 'app.config.prod.json');
      console.log(`Copying ${prodConfigSource} to ${prodConfigDest}`);
      await fs.copy(prodConfigSource, prodConfigDest);

      // Also copy app.config.json as fallback
      const configSource = path.resolve(__dirname, 'app.config.json');
      const configDest = path.join(standalonePath, 'app.config.json');
      console.log(`Copying ${configSource} to ${configDest}`);
      await fs.copy(configSource, configDest);
    }
  },
  rebuildConfig: {},
  makers: [
    // Solo creamos el instalador .exe (Squirrel) si estamos en Windows.
    // En macOS/Linux requeriría instalar Wine y Mono, lo cual es complejo.
    process.platform === 'win32' ? {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './assets/icons/icon.ico',
      },
    } : null,
    // Creamos un ZIP para Windows como alternativa portable cuando se compila desde Mac/Linux
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './assets/icons/icon.icns',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: './assets/icons/png/icon-1024.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          icon: './assets/icons/png/icon-1024.png',
        },
      },
    },
  ].filter(Boolean), // Filtramos los makers nulos (Squirrel en Mac)
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
