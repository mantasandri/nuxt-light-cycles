import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitSelect from './CircuitSelect.vue'
import type { Option } from '~/shared/types/ui.types'

describe('CircuitSelect', () => {
  const mockOptions: Option[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ]

  const mockNumberOptions: Option[] = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two' },
    { value: 3, label: 'Three' }
  ]

  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: { options: mockOptions }
    })
    
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('renders all options', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: { options: mockOptions }
    })
    
    const options = wrapper.findAll('option')
    expect(options.length).toBe(3)
    expect(options[0]?.text()).toBe('Option 1')
    expect(options[1]?.text()).toBe('Option 2')
    expect(options[2]?.text()).toBe('Option 3')
  })

  it('renders with placeholder', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        placeholder: 'Select an option'
      }
    })
    
    const options = wrapper.findAll('option')
    expect(options.length).toBe(4) // 3 options + placeholder
    expect(options[0]?.text()).toBe('Select an option')
    expect(options[0]?.attributes('disabled')).toBeDefined()
  })

  it('reflects value from modelValue', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        modelValue: 'option2'
      }
    })
    
    expect(wrapper.find('select').element.value).toBe('option2')
  })

  it('emits update:modelValue when changed', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        modelValue: 'option1'
      }
    })
    
    await wrapper.find('select').setValue('option2')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2'])
  })

  it('emits change event when changed', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        modelValue: 'option1'
      }
    })
    
    await wrapper.find('select').setValue('option2')
    
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')?.[0]).toEqual(['option2'])
  })

  it('handles number values correctly', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockNumberOptions,
        modelValue: 1
      }
    })
    
    await wrapper.find('select').setValue('2')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2])
  })

  it('applies disabled attribute when disabled', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        disabled: true
      }
    })
    
    expect(wrapper.find('select').attributes('disabled')).toBeDefined()
  })

  it('applies fullWidth class when fullWidth is true', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: {
        options: mockOptions,
        fullWidth: true
      }
    })
    
    expect(wrapper.find('select').classes()).toContain('w-full')
  })

  it('renders option values correctly', async () => {
    const wrapper = await mountSuspended(CircuitSelect, {
      props: { options: mockOptions }
    })
    
    const options = wrapper.findAll('option')
    expect(options[0]?.attributes('value')).toBe('option1')
    expect(options[1]?.attributes('value')).toBe('option2')
    expect(options[2]?.attributes('value')).toBe('option3')
  })
})

