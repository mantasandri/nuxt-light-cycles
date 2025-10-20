import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import PlayerCard from './PlayerCard.vue'

describe('PlayerCard', () => {
  const defaultProps = {
    playerId: 'player-1',
    name: 'TestPlayer',
    color: '#00FFFF'
  }

  it('renders player name', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: defaultProps
    })
    
    expect(wrapper.text()).toContain('TestPlayer')
  })

  it('renders player color box', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: defaultProps
    })
    
    const colorBox = wrapper.find('div[style*="background-color"]')
    expect(colorBox.attributes('style')).toContain('#00FFFF')
  })

  it('shows "You" indicator when isYou is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isYou: true
      }
    })
    
    expect(wrapper.text()).toContain('You')
  })

  it('shows host crown when isHost is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isHost: true
      }
    })
    
    expect(wrapper.text()).toContain('👑')
  })

  it('shows AI indicator when isAIBot is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isAIBot: true
      }
    })
    
    expect(wrapper.text()).toContain('🤖 AI')
  })

  it('shows ready badge when isReady is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isReady: true
      }
    })
    
    expect(wrapper.text()).toContain('Ready')
  })

  it('shows waiting badge when isReady is false', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isReady: false
      }
    })
    
    expect(wrapper.text()).toContain('Waiting...')
  })

  it('does not show ready status for spectators', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isSpectator: true
      }
    })
    
    expect(wrapper.text()).not.toContain('Ready')
    expect(wrapper.text()).not.toContain('Waiting')
  })

  it('renders with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const
    
    for (const size of sizes) {
      const wrapper = await mountSuspended(PlayerCard, {
        props: {
          ...defaultProps,
          size
        }
      })
      
      expect(wrapper.find('div').exists()).toBe(true)
    }
  })

  it('shows host controls when showHostControls is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        showHostControls: true
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('does not show host controls for yourself', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        showHostControls: true,
        isYou: true
      }
    })
    
    expect(wrapper.text()).not.toContain('👢')
    expect(wrapper.text()).not.toContain('🚫')
  })

  it('shows kick and ban buttons for regular players with host controls', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        showHostControls: true
      }
    })
    
    expect(wrapper.text()).toContain('👢')
    expect(wrapper.text()).toContain('🚫')
  })

  it('shows remove button for AI bots with host controls', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isAIBot: true,
        showHostControls: true
      }
    })
    
    expect(wrapper.text()).toContain('❌')
  })

  it('emits kick event when kick button clicked', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        showHostControls: true
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const kickButton = buttons.find(b => b.text().includes('👢'))
    
    await kickButton?.trigger('click')
    
    expect(wrapper.emitted('kick')).toBeTruthy()
    expect(wrapper.emitted('kick')?.[0]).toEqual(['player-1'])
  })

  it('emits ban event when ban button clicked', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        showHostControls: true
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const banButton = buttons.find(b => b.text().includes('🚫'))
    
    await banButton?.trigger('click')
    
    expect(wrapper.emitted('ban')).toBeTruthy()
    expect(wrapper.emitted('ban')?.[0]).toEqual(['player-1'])
  })

  it('emits removeBot event when remove button clicked for AI', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isAIBot: true,
        showHostControls: true
      }
    })
    
    const buttons = wrapper.findAllComponents({ name: 'CircuitButton' })
    const removeButton = buttons.find(b => b.text().includes('❌'))
    
    await removeButton?.trigger('click')
    
    expect(wrapper.emitted('removeBot')).toBeTruthy()
    expect(wrapper.emitted('removeBot')?.[0]).toEqual(['player-1'])
  })

  it('applies spectator styling when isSpectator is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isSpectator: true
      }
    })
    
    const mainDiv = wrapper.find('div')
    expect(mainDiv.classes()).toContain('opacity-80')
  })

  it('applies ready styling when isReady is true', async () => {
    const wrapper = await mountSuspended(PlayerCard, {
      props: {
        ...defaultProps,
        isReady: true
      }
    })
    
    const mainDiv = wrapper.find('div')
    expect(mainDiv.classes()).toContain('bg-green-400/[0.08]')
  })
})

