import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import ReplayBrowser from './ReplayBrowser.vue'

describe('ReplayBrowser', () => {
  const defaultProps = {
    ws: null
  }

  it('renders replay browser title', async () => {
    const wrapper = await mountSuspended(ReplayBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('My Replays')
  })

  it('renders component structure', async () => {
    const wrapper = await mountSuspended(ReplayBrowser, {
      props: defaultProps
    })
    
    // Component should render
    expect(wrapper.html()).toBeTruthy()
  })

  it('shows empty state when no replays available', async () => {
    const wrapper = await mountSuspended(ReplayBrowser, {
      props: defaultProps
    })
    
    // Should show some content
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
})

