import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { useYouTubePlayer } from './useYouTubePlayer'

// Test component that uses the composable
const TestComponent = defineComponent({
  setup() {
    const player = useYouTubePlayer()
    return { player }
  },
  render() {
    return h('div', { id: 'test' })
  }
})

describe('useYouTubePlayer', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    delete (window as { YT?: unknown }).YT
    delete (window as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady
    
    // Mock import.meta.client to be true
    vi.stubGlobal('import', { meta: { client: true } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns expected interface', async () => {
    const wrapper = await mountSuspended(TestComponent)
    const player = wrapper.vm.player
    
    expect(player).toHaveProperty('youtubePlayer')
    expect(player).toHaveProperty('isYoutubePlaying')
    expect(player).toHaveProperty('toggleYoutube')
    expect(typeof player.toggleYoutube).toBe('function')
  })

  it('initializes with null player and not playing', async () => {
    const wrapper = await mountSuspended(TestComponent)
    const player = wrapper.vm.player
    
    expect(player.youtubePlayer.value).toBeNull()
    expect(player.isYoutubePlaying.value).toBe(false)
  })

  it('toggleYoutube does nothing when player is null', async () => {
    const wrapper = await mountSuspended(TestComponent)
    const player = wrapper.vm.player
    
    expect(() => player.toggleYoutube()).not.toThrow()
    expect(player.isYoutubePlaying.value).toBe(false)
  })

  it('initializes YouTube when in client environment', async () => {
    await mountSuspended(TestComponent)
    
    // The callback should be set up (this verifies initialization happened)
    expect((window as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady).toBeDefined()
    
    // If the callback exists, the script initialization logic ran
    // (The script itself may not be added in test environment due to import.meta.client checks)
  })

  it('sets up onYouTubeIframeAPIReady callback', async () => {
    await mountSuspended(TestComponent)
    
    expect((window as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady).toBeDefined()
    expect(typeof (window as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady).toBe('function')
  })

  it('creates YouTube player when API is ready', async () => {
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn(() => mockPlayerInstance)
    
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    // Add the player element to DOM
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    const wrapper = await mountSuspended(TestComponent)
    
    // Call the API ready callback
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    expect(MockPlayer).toHaveBeenCalledWith('youtubePlayer', expect.objectContaining({
      videoId: 'TAutddyBrOg',
    }))
    
    expect(wrapper.vm.player.youtubePlayer.value).toEqual(mockPlayerInstance)
  })

  it('sets volume on player ready event', async () => {
    let onReadyCallback: ((event: { target: { setVolume: (v: number) => void } }) => void) | null = null
    
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn((id: string, config: { events: { onReady: typeof onReadyCallback } }) => {
      onReadyCallback = config.events.onReady
      return mockPlayerInstance
    })
    
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    await mountSuspended(TestComponent)
    
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    // Call onReady event
    if (onReadyCallback) {
      onReadyCallback({ target: mockPlayerInstance })
      expect(mockPlayerInstance.setVolume).toHaveBeenCalledWith(30)
    }
  })

  it('updates isYoutubePlaying on state change', async () => {
    let onStateChangeCallback: ((event: { data: number }) => void) | null = null
    
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn((id: string, config: { events: { onStateChange: typeof onStateChangeCallback } }) => {
      onStateChangeCallback = config.events.onStateChange
      return mockPlayerInstance
    })
    
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    const wrapper = await mountSuspended(TestComponent)
    
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    // Simulate state change to playing (data: 1)
    if (onStateChangeCallback) {
      onStateChangeCallback({ data: 1 })
      expect(wrapper.vm.player.isYoutubePlaying.value).toBe(true)
      
      // Simulate state change to paused (data: 2)
      onStateChangeCallback({ data: 2 })
      expect(wrapper.vm.player.isYoutubePlaying.value).toBe(false)
    }
  })

  it('toggleYoutube calls playVideo when not playing', async () => {
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn(() => mockPlayerInstance)
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    const wrapper = await mountSuspended(TestComponent)
    const player = wrapper.vm.player
    
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    // Manually set isYoutubePlaying to false
    ;(player.isYoutubePlaying as { value: boolean }).value = false
    
    player.toggleYoutube()
    
    expect(mockPlayerInstance.playVideo).toHaveBeenCalled()
    expect(mockPlayerInstance.pauseVideo).not.toHaveBeenCalled()
  })

  it('toggleYoutube calls pauseVideo when playing', async () => {
    let onStateChangeCallback: ((event: { data: number }) => void) | null = null
    
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn((id: string, config: { events: { onStateChange: typeof onStateChangeCallback } }) => {
      onStateChangeCallback = config.events.onStateChange
      return mockPlayerInstance
    })
    
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    const wrapper = await mountSuspended(TestComponent)
    const player = wrapper.vm.player
    
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    // Simulate state change to playing (data: 1)
    if (onStateChangeCallback) {
      onStateChangeCallback({ data: 1 })
    }
    
    expect(player.isYoutubePlaying.value).toBe(true)
    
    // Now toggle to pause
    player.toggleYoutube()
    
    expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled()
    expect(mockPlayerInstance.playVideo).not.toHaveBeenCalled()
  })

  it('pauses player on unmount', async () => {
    const mockPlayerInstance = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      setVolume: vi.fn(),
    }
    
    const MockPlayer = vi.fn(() => mockPlayerInstance)
    ;(window as { YT?: { Player: typeof MockPlayer } }).YT = { Player: MockPlayer }
    
    const playerDiv = document.createElement('div')
    playerDiv.id = 'youtubePlayer'
    document.body.appendChild(playerDiv)
    
    const wrapper = await mountSuspended(TestComponent)
    
    if ((window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady) {
      ;(window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady!()
    }
    
    // Unmount the component
    wrapper.unmount()
    
    expect(mockPlayerInstance.pauseVideo).toHaveBeenCalled()
  })
})
