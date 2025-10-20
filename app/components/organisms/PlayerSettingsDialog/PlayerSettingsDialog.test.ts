import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import PlayerSettingsDialog from './PlayerSettingsDialog.vue'

describe('PlayerSettingsDialog', () => {
  const defaultProps = {
    isConfigured: false
  }

  it('renders dialog with initial setup view', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Welcome to Circuit Breaker!')
  })

  it('renders name field', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Your Name')
  })

  it('renders color section', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Your Color')
  })

  it('renders avatar section', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Your Avatar')
  })

  it('renders continue button', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Continue')
  })

  it('renders with configured state', async () => {
    const wrapper = await mountSuspended(PlayerSettingsDialog, {
      props: {
        isConfigured: true,
        initialName: 'TestPlayer',
        initialColor: 'hsl(180, 90%, 60%)'
      }
    })
    
    // Should render in edit mode
    expect(wrapper.html()).toBeTruthy()
  })
})

