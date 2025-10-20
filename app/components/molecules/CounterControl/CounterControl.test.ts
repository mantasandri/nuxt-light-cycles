import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CounterControl from './CounterControl.vue'

describe('CounterControl', () => {
  it('renders with modelValue', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: { modelValue: 5 }
    })
    
    expect(wrapper.text()).toContain('5')
  })

  it('renders with label', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 10,
        label: 'Grid Size'
      }
    })
    
    expect(wrapper.text()).toContain('Grid Size')
  })

  it('emits update:modelValue when incrementing', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const incrementButton = buttons[1] // Second button is increment
    
    await incrementButton.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6])
  })

  it('emits change event when incrementing', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const incrementButton = buttons[1]
    
    await incrementButton.trigger('click')
    
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')?.[0]).toEqual([6])
  })

  it('emits update:modelValue when decrementing', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 5,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const decrementButton = buttons[0] // First button is decrement
    
    await decrementButton.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4])
  })

  it('respects min value', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 0,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const decrementButton = buttons[0]
    
    await decrementButton.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('respects max value', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 10,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const incrementButton = buttons[1]
    
    await incrementButton.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('disables decrement button when at min', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 0,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const decrementButton = buttons[0]
    
    expect(decrementButton.props('disabled')).toBe(true)
  })

  it('disables increment button when at max', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 10,
        min: 0,
        max: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const incrementButton = buttons[1]
    
    expect(incrementButton.props('disabled')).toBe(true)
  })

  it('disables both buttons when disabled', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 5,
        disabled: true
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    
    expect(buttons[0]?.props('disabled')).toBe(true)
    expect(buttons[1]?.props('disabled')).toBe(true)
  })

  it('uses custom step value', async () => {
    const wrapper = await mountSuspended(CounterControl, {
      props: {
        modelValue: 10,
        min: 0,
        max: 100,
        step: 10
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const incrementButton = buttons[1]
    
    await incrementButton.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([20])
  })
})

