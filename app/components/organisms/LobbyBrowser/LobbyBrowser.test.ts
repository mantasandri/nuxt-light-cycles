import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LobbyBrowser from './LobbyBrowser.vue'
import type { LobbyInfo } from '~/shared/types/ui.types'

describe('LobbyBrowser', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const defaultProps = {
    playerName: 'TestPlayer'
  }

  it('renders component title', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('🎮 Available Lobbies')
  })

  it('displays player name', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Playing as:')
    expect(wrapper.text()).toContain('TestPlayer')
  })

  it('renders change settings button', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Change Name/Color')
  })

  it('emits changeSettings when change settings button clicked', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const settingsButton = buttons.find(b => b.text().includes('Change Name/Color'))
    
    await settingsButton?.trigger('click')
    
    expect(wrapper.emitted('changeSettings')).toBeTruthy()
  })

  it('renders refresh button', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Refresh')
  })

  it('renders auto-refresh checkbox', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Auto-refresh')
  })

  it('renders create lobby button', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('Create Lobby')
  })

  it('emits createLobby when create lobby button clicked', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const createButton = buttons.find(b => b.text().includes('Create Lobby'))
    
    await createButton?.trigger('click')
    
    expect(wrapper.emitted('createLobby')).toBeTruthy()
  })

  it('renders my replays button', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('My Replays')
  })

  it('emits openReplays when my replays button clicked', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const replaysButton = buttons.find(b => b.text().includes('My Replays'))
    
    await replaysButton?.trigger('click')
    
    expect(wrapper.emitted('openReplays')).toBeTruthy()
  })

  it('shows empty state when no lobbies available', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const emptyState = wrapper.findComponent({ name: 'EmptyState' })
    expect(emptyState.exists()).toBe(true)
    expect(wrapper.text()).toContain('No lobbies available')
  })

  it('shows empty state by default', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const emptyState = wrapper.findComponent({ name: 'EmptyState' })
    expect(emptyState.exists()).toBe(true)
  })

  it('auto-refresh is enabled by default', async () => {
    const wrapper = await mountSuspended(LobbyBrowser, {
      props: defaultProps
    })
    
    const checkbox = wrapper.findComponent({ name: 'CircuitCheckbox' })
    expect(checkbox.props('modelValue')).toBe(true)
  })
})

