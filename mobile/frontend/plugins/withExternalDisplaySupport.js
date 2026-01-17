const { withAndroidManifest } = require('@expo/config-plugins');

const CONFIG_CHANGES = [
  'keyboard',
  'keyboardHidden',
  'orientation',
  'screenLayout',
  'screenSize',
  'smallestScreenSize',
  'uiMode'
];

module.exports = function withExternalDisplaySupport(config) {
  return withAndroidManifest(config, configWithManifest => {
    const application = configWithManifest.modResults.manifest.application?.[0];
    if (!application?.activity) {
      return configWithManifest;
    }

    const mainActivity = application.activity.find(
      activity => activity.$['android:name'] === '.MainActivity'
    );

    if (!mainActivity) {
      return configWithManifest;
    }

    const existingConfigChanges = mainActivity.$['android:configChanges']
      ? mainActivity.$['android:configChanges'].split('|')
      : [];

    const mergedConfigChanges = Array.from(
      new Set([...existingConfigChanges, ...CONFIG_CHANGES])
    ).filter(Boolean);

    mainActivity.$['android:configChanges'] = mergedConfigChanges.join('|');
    mainActivity.$['android:screenOrientation'] = 'sensorLandscape';

    return configWithManifest;
  });
};
