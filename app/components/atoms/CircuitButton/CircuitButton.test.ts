import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitButton from './CircuitButton.vue'

describe('CircuitButton', () => {
  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitButton, {
      slots: {
        default: 'Click me'
      }
    })
    
    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders with different variants', async () => {
    const variants = ['primary', 'secondary', 'danger', 'ghost', 'success'] as const
    
    for (const variant of variants) {
      const wrapper = await mountSuspended(CircuitButton, {
        props: { variant }
      })
      
      expect(wrapper.find('button').exists()).toBe(true)
    }
  })

  it('renders with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const
    
    for (const size of sizes) {
      const wrapper = await mountSuspended(CircuitButton, {
        props: { size }
      })
      
      expect(wrapper.find('button').exists()).toBe(true)
    }
  })

  it('emits click event when clicked', async () => {
    const wrapper = await mountSuspended(CircuitButton)
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.length).toBe(1)
  })

  it('does not emit click event when disabled', async () => {
    const wrapper = await mountSuspended(CircuitButton, {
      props: { disabled: true }
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('applies disabled attribute when disabled', async () => {
    const wrapper = await mountSuspended(CircuitButton, {
      props: { disabled: true }
    })
    
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('renders with icon', async () => {
    const wrapper = await mountSuspended(CircuitButton, {
      props: { icon: '🚀' },
      slots: {
        default: 'Launch'
      }
    })
    
    expect(wrapper.text()).toContain('🚀')
    expect(wrapper.text()).toContain('Launch')
  })

  it('applies fullWidth class when fullWidth is true', async () => {
    const wrapper = await mountSuspended(CircuitButton, {
      props: { fullWidth: true }
    })
    
    expect(wrapper.find('button').classes()).toContain('w-full')
  })
})

