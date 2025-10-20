import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import LobbyCard from './LobbyCard.vue'

describe('LobbyCard', () => {
  const defaultProps = {
    lobbyId: 'lobby-123',
    hostName: 'TestHost',
    playerCount: 2,
    maxPlayers: 4,
    gridSize: 20,
    isPrivate: false,
    state: 'waiting'
  }

  it('renders lobby information', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('TestHost')
    expect(wrapper.text()).toContain('2/4')
    expect(wrapper.text()).toContain('20x20')
  })

  it('shows public indicator when not private', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('🌐')
  })

  it('shows private indicator when private', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: {
        ...defaultProps,
        isPrivate: true
      }
    })
    
    expect(wrapper.text()).toContain('🔒')
  })

  it('shows waiting state badge', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('⏳ Waiting')
  })

  it('shows in game state badge', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: {
        ...defaultProps,
        state: 'inGame'
      }
    })
    
    expect(wrapper.text()).toContain('🎮 In Game')
  })

  it('emits join event when join button clicked', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const joinButton = buttons[0]
    
    await joinButton?.trigger('click')
    
    expect(wrapper.emitted('join')).toBeTruthy()
    expect(wrapper.emitted('join')?.[0]).toEqual(['lobby-123'])
  })

  it('emits spectate event when watch button clicked', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const spectateButton = buttons[1]
    
    await spectateButton?.trigger('click')
    
    expect(wrapper.emitted('spectate')).toBeTruthy()
    expect(wrapper.emitted('spectate')?.[0]).toEqual(['lobby-123'])
  })

  it('disables join button when lobby is full', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: {
        ...defaultProps,
        playerCount: 4,
        maxPlayers: 4
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const joinButton = buttons[0]
    
    expect(joinButton?.props('disabled')).toBe(true)
    expect(joinButton?.text()).toContain('Full')
  })

  it('disables join button when game is in progress', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: {
        ...defaultProps,
        state: 'inGame'
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const joinButton = buttons[0]
    
    expect(joinButton?.props('disabled')).toBe(true)
    expect(joinButton?.text()).toContain('In Progress')
  })

  it('shows join button text when lobby is available', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const joinButton = buttons[0]
    
    expect(joinButton?.text()).toContain('▶ Join')
  })

  it('renders player count badge with correct icon', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const badges = wrapper.findAllComponents({ name: 'CircuitBadge' })
    const playerBadge = badges.find(b => b.text().includes('2/4'))
    
    expect(playerBadge?.props('icon')).toBe('👥')
  })

  it('renders grid size badge with correct icon', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const badges = wrapper.findAllComponents({ name: 'CircuitBadge' })
    const gridBadge = badges.find(b => b.text().includes('20x20'))
    
    expect(gridBadge?.props('icon')).toBe('📏')
  })

  it('applies correct badge variant for waiting state', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: defaultProps
    })
    
    const badges = wrapper.findAllComponents({ name: 'CircuitBadge' })
    const stateBadge = badges.find(b => b.text().includes('Waiting'))
    
    expect(stateBadge?.props('variant')).toBe('warning')
  })

  it('applies correct badge variant for in game state', async () => {
    const wrapper = await mountSuspended(LobbyCard, {
      props: {
        ...defaultProps,
        state: 'inGame'
      }
    })
    
    const badges = wrapper.findAllComponents({ name: 'CircuitBadge' })
    const stateBadge = badges.find(b => b.text().includes('In Game'))
    
    expect(stateBadge?.props('variant')).toBe('success')
  })
})

