const security = require('eslint-plugin-security');
const globals = require('globals');

module.exports = [
  security.configs.recommended,
  { languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node } } }
];