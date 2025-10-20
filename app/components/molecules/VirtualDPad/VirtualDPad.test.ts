import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import VirtualDPad from './VirtualDPad.vue'

describe('VirtualDPad', () => {
  it('renders when isVisible is true', async () => {
    const wrapper = await mountSuspended(VirtualDPad, {
      props: { isVisible: true }
    })
    
    expect(wrapper.find('.dpad-container').isVisible()).toBe(true)
  })

  it('is visible by default', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    expect(wrapper.find('.dpad-container').isVisible()).toBe(true)
  })

  it('renders brake button', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    expect(wrapper.find('.brake-button').exists()).toBe(true)
    expect(wrapper.text()).toContain('BRAKE')
  })

  it('renders d-pad SVG', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    expect(wrapper.find('.dpad-svg').exists()).toBe(true)
  })

  it('renders all four direction arrows', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    expect(arrows.length).toBe(4)
  })

  it('emits direction event on up arrow touchstart', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[0]?.trigger('touchstart')
    
    expect(wrapper.emitted('direction')).toBeTruthy()
    expect(wrapper.emitted('direction')?.[0]).toEqual(['up'])
  })

  it('emits direction event on down arrow touchstart', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[1]?.trigger('touchstart')
    
    expect(wrapper.emitted('direction')).toBeTruthy()
    expect(wrapper.emitted('direction')?.[0]).toEqual(['down'])
  })

  it('emits direction event on left arrow touchstart', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[2]?.trigger('touchstart')
    
    expect(wrapper.emitted('direction')).toBeTruthy()
    expect(wrapper.emitted('direction')?.[0]).toEqual(['left'])
  })

  it('emits direction event on right arrow touchstart', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[3]?.trigger('touchstart')
    
    expect(wrapper.emitted('direction')).toBeTruthy()
    expect(wrapper.emitted('direction')?.[0]).toEqual(['right'])
  })

  it('emits direction event on mousedown', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[0]?.trigger('mousedown')
    
    expect(wrapper.emitted('direction')).toBeTruthy()
    expect(wrapper.emitted('direction')?.[0]).toEqual(['up'])
  })

  it('emits brake event with true on brake button touchstart', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    await wrapper.find('.brake-button').trigger('touchstart')
    
    expect(wrapper.emitted('brake')).toBeTruthy()
    expect(wrapper.emitted('brake')?.[0]).toEqual([true])
  })

  it('emits brake event with false on brake button touchend', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    await wrapper.find('.brake-button').trigger('touchend')
    
    expect(wrapper.emitted('brake')).toBeTruthy()
    expect(wrapper.emitted('brake')?.[0]).toEqual([false])
  })

  it('emits brake event on mousedown', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    await wrapper.find('.brake-button').trigger('mousedown')
    
    expect(wrapper.emitted('brake')).toBeTruthy()
    expect(wrapper.emitted('brake')?.[0]).toEqual([true])
  })

  it('emits brake event on mouseup', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    await wrapper.find('.brake-button').trigger('mouseup')
    
    expect(wrapper.emitted('brake')).toBeTruthy()
    expect(wrapper.emitted('brake')?.[0]).toEqual([false])
  })

  it('applies active class to brake button when braking', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    await wrapper.find('.brake-button').trigger('touchstart')
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.brake-button').classes()).toContain('active')
  })

  it('clears active direction on touchend', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    const arrows = wrapper.findAll('.dpad-arrow')
    await arrows[0]?.trigger('touchstart')
    await wrapper.vm.$nextTick()
    
    expect(arrows[0]?.classes()).toContain('active')
    
    await arrows[0]?.trigger('touchend')
    await wrapper.vm.$nextTick()
    
    expect(arrows[0]?.classes()).not.toContain('active')
  })

  it('renders center circle', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    expect(wrapper.find('.dpad-center').exists()).toBe(true)
  })

  it('renders brake icon', async () => {
    const wrapper = await mountSuspended(VirtualDPad)
    
    expect(wrapper.find('.brake-icon').exists()).toBe(true)
    expect(wrapper.find('.brake-icon').text()).toBe('🛑')
  })
})

