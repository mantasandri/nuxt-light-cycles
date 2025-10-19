// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Disable requirement for default values on optional props
      'vue/require-default-prop': 'off',
      // Allow v-html (we control the content via AVATAR_OPTIONS)
      'vue/no-v-html': 'off'
    }
  }
)
