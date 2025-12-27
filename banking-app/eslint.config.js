const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Example rules
      "semi": ["error", "always"],
      "quotes": ["off", "single"],
      "no-unused-vars": "warn",

      "react/no-unescaped-entities": "warn",
      "react-native/no-explicit-any": "warn",

      // Add other custom rules as desired
    },
  },
]);
