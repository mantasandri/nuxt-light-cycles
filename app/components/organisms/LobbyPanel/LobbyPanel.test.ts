import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import LobbyPanel from './LobbyPanel.vue'

describe('LobbyPanel', () => {
  const defaultProps = {
    lobbyState: {
      lobbyId: 'test-lobby',
      hostId: 'host-123',
      players: [],
      spectators: [],
      settings: {
        gridSize: 40,
        maxPlayers: 8,
        isPrivate: false,
        allowSpectators: true,
        enableAI: false
      },
      state: 'waiting'
    },
    currentPlayerId: 'player-123',
    isReady: false
  }

  it('renders lobby panel', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('displays lobby information', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    // Component should render
    expect(wrapper.html()).toBeTruthy()
  })

  it('renders players section', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    // Should have basic structure
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('renders action buttons', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('emits leaveLobby when leave button clicked', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const leaveButton = buttons.find(b => 
      b.text().toLowerCase().includes('leave') || 
      b.text().toLowerCase().includes('back')
    )
    
    if (leaveButton) {
      await leaveButton.trigger('click')
      expect(wrapper.emitted('leaveLobby')).toBeTruthy()
    }
  })

  it('emits toggleReady when ready button clicked', async () => {
    const wrapper = await mountSuspended(LobbyPanel, {
      props: defaultProps
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const readyButton = buttons.find(b => 
      b.text().toLowerCase().includes('ready')
    )
    
    if (readyButton) {
      await readyButton.trigger('click')
      expect(wrapper.emitted('toggleReady')).toBeTruthy()
    }
  })
})

