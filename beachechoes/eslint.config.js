// Use Expo's flat ESLint config as the baseline for app and test files.
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Ignore generated output if a dist folder is introduced later.
    ignores: ['dist/*'],
  },
]);
