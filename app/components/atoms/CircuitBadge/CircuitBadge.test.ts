import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitBadge from './CircuitBadge.vue'

describe('CircuitBadge', () => {
  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitBadge, {
      slots: {
        default: 'Badge'
      }
    })
    
    expect(wrapper.text()).toBe('Badge')
    expect(wrapper.find('span').exists()).toBe(true)
  })

  it('renders with different variants', async () => {
    const variants = ['default', 'success', 'warning', 'danger', 'info', 'ghost'] as const
    
    for (const variant of variants) {
      const wrapper = await mountSuspended(CircuitBadge, {
        props: { variant },
        slots: {
          default: 'Test'
        }
      })
      
      expect(wrapper.find('span').exists()).toBe(true)
    }
  })

  it('renders with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const
    
    for (const size of sizes) {
      const wrapper = await mountSuspended(CircuitBadge, {
        props: { size },
        slots: {
          default: 'Test'
        }
      })
      
      expect(wrapper.find('span').exists()).toBe(true)
    }
  })

  it('renders with icon', async () => {
    const wrapper = await mountSuspended(CircuitBadge, {
      props: { icon: '✓' },
      slots: {
        default: 'Success'
      }
    })
    
    expect(wrapper.text()).toContain('✓')
    expect(wrapper.text()).toContain('Success')
  })

  it('renders without icon', async () => {
    const wrapper = await mountSuspended(CircuitBadge, {
      slots: {
        default: 'No Icon'
      }
    })
    
    expect(wrapper.text()).toBe('No Icon')
  })
})

