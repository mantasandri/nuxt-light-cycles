import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitIcon from './CircuitIcon.vue'

describe('CircuitIcon', () => {
  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitIcon)
    
    expect(wrapper.find('span').exists()).toBe(true)
  })

  it('renders with name prop', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      props: { name: '⚡' }
    })
    
    expect(wrapper.text()).toBe('⚡')
  })

  it('renders with slot content', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      slots: {
        default: '🎮'
      }
    })
    
    expect(wrapper.text()).toBe('🎮')
  })

  it('renders with different sizes', async () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
    
    for (const size of sizes) {
      const wrapper = await mountSuspended(CircuitIcon, {
        props: { size }
      })
      
      expect(wrapper.find('span').exists()).toBe(true)
    }
  })

  it('applies correct size classes', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      props: { size: 'lg' }
    })
    
    expect(wrapper.find('span').classes()).toContain('w-6')
    expect(wrapper.find('span').classes()).toContain('h-6')
  })

  it('applies custom color', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      props: { color: '#ff0000' }
    })
    
    const style = wrapper.find('span').attributes('style')
    expect(style).toContain('color')
  })

  it('applies animated class when animated is true', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      props: { animated: true }
    })
    
    expect(wrapper.find('span').classes()).toContain('animate-spin')
  })

  it('does not apply animated class when animated is false', async () => {
    const wrapper = await mountSuspended(CircuitIcon, {
      props: { animated: false }
    })
    
    expect(wrapper.find('span').classes()).not.toContain('animate-spin')
  })
})

