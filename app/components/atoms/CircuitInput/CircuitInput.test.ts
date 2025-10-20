import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CircuitInput from './CircuitInput.vue'

describe('CircuitInput', () => {
  it('renders with default props', async () => {
    const wrapper = await mountSuspended(CircuitInput)
    
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  it('renders with different types', async () => {
    const types = ['text', 'number', 'email', 'password'] as const
    
    for (const type of types) {
      const wrapper = await mountSuspended(CircuitInput, {
        props: { type }
      })
      
      expect(wrapper.find('input').attributes('type')).toBe(type)
    }
  })

  it('renders with placeholder', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { placeholder: 'Enter your name' }
    })
    
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter your name')
  })

  it('reflects value from modelValue', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { modelValue: 'test value' }
    })
    
    expect(wrapper.find('input').element.value).toBe('test value')
  })

  it('emits update:modelValue on input for text type', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { type: 'text' }
    })
    
    await wrapper.find('input').setValue('new value')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['new value'])
  })

  it('emits update:modelValue with number on input for number type', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { type: 'number' }
    })
    
    await wrapper.find('input').setValue('42')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([42])
  })

  it('emits enter event when Enter key is pressed', async () => {
    const wrapper = await mountSuspended(CircuitInput)
    
    await wrapper.find('input').trigger('keyup', { key: 'Enter' })
    
    expect(wrapper.emitted('enter')).toBeTruthy()
  })

  it('emits focus event when focused', async () => {
    const wrapper = await mountSuspended(CircuitInput)
    
    await wrapper.find('input').trigger('focus')
    
    expect(wrapper.emitted('focus')).toBeTruthy()
  })

  it('emits blur event when blurred', async () => {
    const wrapper = await mountSuspended(CircuitInput)
    
    await wrapper.find('input').trigger('blur')
    
    expect(wrapper.emitted('blur')).toBeTruthy()
  })

  it('applies disabled attribute when disabled', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { disabled: true }
    })
    
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('applies maxlength attribute', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { maxlength: 10 }
    })
    
    expect(wrapper.find('input').attributes('maxlength')).toBe('10')
  })

  it('applies min and max attributes for number type', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: {
        type: 'number',
        min: 1,
        max: 100
      }
    })
    
    expect(wrapper.find('input').attributes('min')).toBe('1')
    expect(wrapper.find('input').attributes('max')).toBe('100')
  })

  it('applies error styles when error is true', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { error: true }
    })
    
    const input = wrapper.find('input')
    expect(input.classes()).toContain('border-red-400/60')
  })

  it('applies fullWidth class when fullWidth is true', async () => {
    const wrapper = await mountSuspended(CircuitInput, {
      props: { fullWidth: true }
    })
    
    expect(wrapper.find('input').classes()).toContain('w-full')
  })

  it('does not emit enter event for non-Enter keys', async () => {
    const wrapper = await mountSuspended(CircuitInput)
    
    await wrapper.find('input').trigger('keyup', { key: 'a' })
    
    expect(wrapper.emitted('enter')).toBeFalsy()
  })
})

