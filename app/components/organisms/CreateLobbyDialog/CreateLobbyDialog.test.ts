import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import CreateLobbyDialog from './CreateLobbyDialog.vue'

describe('CreateLobbyDialog', () => {
  it('renders dialog with title', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Create New Lobby')
  })

  it('renders dialog header', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const header = wrapper.findComponent({ name: 'DialogHeader' })
    expect(header.exists()).toBe(true)
  })

  it('renders grid size field', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Grid Size')
  })

  it('renders max players field', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Max Players')
  })

  it('renders privacy checkbox', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Private Lobby')
  })

  it('renders allow spectators checkbox', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Allow Spectators')
  })

  it('renders enable AI checkbox', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    expect(wrapper.text()).toContain('Add AI Players')
  })

  it('renders create and cancel buttons', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('emits cancel when cancel button clicked', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const cancelButton = buttons.find(b => b.text().includes('Cancel'))
    
    await cancelButton?.trigger('click')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits cancel when dialog header close clicked', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const header = wrapper.findComponent({ name: 'DialogHeader' })
    await header.vm.$emit('close')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits create with settings when create button clicked', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const createButton = buttons.find(b => b.text().includes('Create Lobby'))
    
    await createButton?.trigger('click')
    
    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')?.[0]).toBeDefined()
  })

  it('emits cancel when background is clicked', async () => {
    const wrapper = await mountSuspended(CreateLobbyDialog)
    
    const overlay = wrapper.find('.fixed')
    await overlay.trigger('click.self')
    
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})

