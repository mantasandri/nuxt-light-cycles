import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import ReplayPlayer from './ReplayPlayer.vue'

describe('ReplayPlayer', () => {
  const mockReplayData = {
    metadata: {
      lobbyName: 'Test Lobby',
      createdAt: Date.now(),
      playerCount: 4,
      gridSize: 40,
      duration: 120000,
      winner: 'Player1'
    },
    initialState: {
      settings: {
        tickRate: 200,
        gridSize: 40,
        maxPlayers: 4
      },
      players: []
    },
    frames: []
  }

  it('renders replay player', async () => {
    const wrapper = await mountSuspended(ReplayPlayer, {
      props: { replayData: mockReplayData }
    })
    
    expect(wrapper.find('.replay-player').exists()).toBe(true)
  })

  it('renders close button', async () => {
    const wrapper = await mountSuspended(ReplayPlayer, {
      props: { replayData: mockReplayData }
    })
    
    expect(wrapper.text()).toContain('Back to Replays')
  })

  it('emits close when close button clicked', async () => {
    const wrapper = await mountSuspended(ReplayPlayer, {
      props: { replayData: mockReplayData }
    })
    
    const closeButton = wrapper.find('.btn-close')
    await closeButton.trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders canvas element', async () => {
    const wrapper = await mountSuspended(ReplayPlayer, {
      props: { replayData: mockReplayData }
    })
    
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('renders playback controls', async () => {
    const wrapper = await mountSuspended(ReplayPlayer, {
      props: { replayData: mockReplayData }
    })
    
    // Should have controls section
    expect(wrapper.find('.controls').exists()).toBe(true)
  })
})

