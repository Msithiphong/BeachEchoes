/**
 * Expo config plugin that adds `use_modular_headers!` to the iOS Podfile.
 * Required for @react-native-firebase Swift pods with static libraries.
 *
 * This survives `npx expo prebuild --clean` because it's registered in app.json plugins.
 */
const { withPodfile } = require('@expo/config-plugins');

function withModularHeaders(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;

    if (!contents.includes('use_modular_headers!')) {
      podfileConfig.modResults.contents = contents.replace(
        "prepare_react_native_project!",
        "prepare_react_native_project!\n\n# Required for Firebase Swift pods with static libraries\nuse_modular_headers!"
      );
    }

    return podfileConfig;
  });
}

module.exports = withModularHeaders;
