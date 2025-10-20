// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    }
  },
  {
    rules: {
      // Disable requirement for default values on optional props
      'vue/require-default-prop': 'off',
      // Allow v-html (we control the content via AVATAR_OPTIONS)
      'vue/no-v-html': 'off',
      // Never use semicolons
      'semi': ['error', 'never']
    }
  }
)
