// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Fetch-on-mount (`useEffect(() => { load(); }, [load])`) is the pattern used
    // across screens; keep it visible as a warning rather than a failure.
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
]);
