import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import DialogHeader from './DialogHeader.vue'

describe('DialogHeader', () => {
  it('renders with title', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: { title: 'Test Dialog' }
    })
    
    expect(wrapper.text()).toContain('Test Dialog')
  })

  it('renders with subtitle', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: {
        title: 'Main Title',
        subtitle: 'Subtitle text'
      }
    })
    
    expect(wrapper.text()).toContain('Main Title')
    expect(wrapper.text()).toContain('Subtitle text')
  })

  it('renders without subtitle when not provided', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: { title: 'Main Title' }
    })
    
    const paragraphs = wrapper.findAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('shows close button by default', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: { title: 'Test Dialog' }
    })
    
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('hides close button when showClose is false', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: {
        title: 'Test Dialog',
        showClose: false
      }
    })
    
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: { title: 'Test Dialog' }
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')?.length).toBe(1)
  })

  it('renders close icon SVG', async () => {
    const wrapper = await mountSuspended(DialogHeader, {
      props: { title: 'Test Dialog' }
    })
    
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.findAll('line').length).toBe(2)
  })
})

