import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitCheckbox from './CircuitCheckbox.vue'

describe('CircuitCheckbox', () => {
  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox)
    
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('renders with label', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { label: 'Accept terms' }
    })
    
    expect(wrapper.text()).toContain('Accept terms')
  })

  it('renders with hint', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: {
        label: 'Subscribe',
        hint: 'Get weekly updates'
      }
    })
    
    expect(wrapper.text()).toContain('Subscribe')
    expect(wrapper.text()).toContain('Get weekly updates')
  })

  it('renders with slot content', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      slots: {
        default: 'Custom label'
      }
    })
    
    expect(wrapper.text()).toContain('Custom label')
  })

  it('reflects checked state from modelValue', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { modelValue: true }
    })
    
    const input = wrapper.find('input[type="checkbox"]')
    expect(input.element.checked).toBe(true)
  })

  it('emits update:modelValue when changed', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { modelValue: false }
    })
    
    await wrapper.find('input[type="checkbox"]').setValue(true)
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('emits change event when changed', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { modelValue: false }
    })
    
    await wrapper.find('input[type="checkbox"]').setValue(true)
    
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')?.[0]).toEqual([true])
  })

  it('applies disabled attribute when disabled', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { disabled: true }
    })
    
    expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBeDefined()
  })

  it('renders with inline variant', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: {
        label: 'Inline checkbox',
        variant: 'inline'
      }
    })
    
    expect(wrapper.text()).toContain('Inline checkbox')
  })

  it('shows checkmark when checked', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { modelValue: true }
    })
    
    expect(wrapper.text()).toContain('✓')
  })

  it('does not show checkmark when unchecked', async () => {
    const wrapper = await mountSuspended(CircuitCheckbox, {
      props: { modelValue: false }
    })
    
    expect(wrapper.text()).not.toContain('✓')
  })
})

