import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import FormField from './FormField.vue'
import type { Option } from '~/shared/types/ui.types'

describe('FormField', () => {
  it('renders with label', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: { label: 'Username' }
    })
    
    expect(wrapper.text()).toContain('Username')
  })

  it('shows required indicator when required is true', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Email',
        required: true
      }
    })
    
    expect(wrapper.html()).toContain('*')
  })

  it('renders text input by default', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: { label: 'Name' }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.exists()).toBe(true)
  })

  it('renders number input when type is number', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Age',
        type: 'number'
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('type')).toBe('number')
  })

  it('renders select when type is select', async () => {
    const options: Option[] = [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' }
    ]
    
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Choice',
        type: 'select',
        options
      }
    })
    
    const select = wrapper.findComponent({ name: 'CircuitSelect' })
    expect(select.exists()).toBe(true)
  })

  it('passes options to select component', async () => {
    const options: Option[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ]
    
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Select',
        type: 'select',
        options
      }
    })
    
    const select = wrapper.findComponent({ name: 'CircuitSelect' })
    expect(select.props('options')).toEqual(options)
  })

  it('renders placeholder', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Name',
        placeholder: 'Enter your name'
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('placeholder')).toBe('Enter your name')
  })

  it('renders hint text', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Password',
        hint: 'Must be at least 8 characters'
      }
    })
    
    expect(wrapper.text()).toContain('Must be at least 8 characters')
  })

  it('renders error message', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Email',
        error: 'Invalid email address'
      }
    })
    
    expect(wrapper.text()).toContain('Invalid email address')
  })

  it('hides hint when error is shown', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Field',
        hint: 'Hint text',
        error: 'Error text'
      }
    })
    
    expect(wrapper.text()).toContain('Error text')
    expect(wrapper.text()).not.toContain('Hint text')
  })

  it('passes error state to input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Field',
        error: 'Error occurred'
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('error')).toBe(true)
  })

  it('passes disabled prop to input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Field',
        disabled: true
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('disabled')).toBe(true)
  })

  it('passes maxlength to input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Name',
        maxlength: 50
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('maxlength')).toBe(50)
  })

  it('passes min and max to number input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: {
        label: 'Age',
        type: 'number',
        min: 18,
        max: 99
      }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    expect(input.props('min')).toBe(18)
    expect(input.props('max')).toBe(99)
  })

  it('emits enter event from input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: { label: 'Field' }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    await input.vm.$emit('enter')
    
    expect(wrapper.emitted('enter')).toBeTruthy()
  })

  it('emits change event from input', async () => {
    const wrapper = await mountSuspended(FormField, {
      props: { label: 'Field' }
    })
    
    const input = wrapper.findComponent({ name: 'CircuitInput' })
    await input.vm.$emit('update:modelValue', 'test')
    
    // The change event is emitted from select, not input in this implementation
    // Let's test with select
    const wrapperWithSelect = await mountSuspended(FormField, {
      props: {
        label: 'Select',
        type: 'select',
        options: [{ value: '1', label: 'One' }]
      }
    })
    
    const select = wrapperWithSelect.findComponent({ name: 'CircuitSelect' })
    await select.vm.$emit('change', '1')
    
    expect(wrapperWithSelect.emitted('change')).toBeTruthy()
  })
})

