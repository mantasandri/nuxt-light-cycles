import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import EmptyState from './EmptyState.vue'

describe('EmptyState', () => {
  it('renders with title', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'No Results' }
    })
    
    expect(wrapper.text()).toContain('No Results')
  })

  it('renders with icon', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'Empty',
        icon: '📭'
      }
    })
    
    expect(wrapper.text()).toContain('📭')
  })

  it('renders without icon when not provided', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Empty' }
    })
    
    const icon = wrapper.findComponent({ name: 'CircuitIcon' })
    expect(icon.exists()).toBe(false)
  })

  it('renders with message', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'No Data',
        message: 'There is nothing to display here.'
      }
    })
    
    expect(wrapper.text()).toContain('There is nothing to display here.')
  })

  it('renders with action button', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'No Items',
        actionLabel: 'Add Item'
      }
    })
    
    const button = wrapper.findComponent({ name: 'CircuitButton' })
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Add Item')
  })

  it('emits action event when button is clicked', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'Empty',
        actionLabel: 'Create'
      }
    })
    
    const button = wrapper.findComponent({ name: 'CircuitButton' })
    await button.trigger('click')
    
    expect(wrapper.emitted('action')).toBeTruthy()
  })

  it('renders with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const
    
    for (const size of sizes) {
      const wrapper = await mountSuspended(EmptyState, {
        props: {
          title: 'Test',
          size
        }
      })
      
      expect(wrapper.find('div').exists()).toBe(true)
    }
  })

  it('passes size prop to action button', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'Empty',
        actionLabel: 'Action',
        size: 'lg'
      }
    })
    
    const button = wrapper.findComponent({ name: 'CircuitButton' })
    expect(button.props('size')).toBe('lg')
  })

  it('renders actions slot', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Empty' },
      slots: {
        actions: '<div class="custom-actions">Custom Actions</div>'
      }
    })
    
    expect(wrapper.html()).toContain('Custom Actions')
  })

  it('applies correct icon size based on size prop', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        title: 'Test',
        icon: '🔍',
        size: 'lg'
      }
    })
    
    const icon = wrapper.findComponent({ name: 'CircuitIcon' })
    const style = icon.attributes('style')
    expect(style).toContain('72px')
  })
})

