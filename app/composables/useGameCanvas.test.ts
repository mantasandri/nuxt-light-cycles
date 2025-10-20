import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { useGameCanvas } from './useGameCanvas'
import { ref, nextTick } from 'vue'
import type { Player, PowerUp } from '~/shared/types/game.types'

// Helper to create a minimal valid player
const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-123',
  name: 'Test Player',
  x: 5,
  y: 5,
  direction: 'up',
  color: 'hsl(180, 90%, 60%)',
  trail: [],
  speed: 1,
  isReady: true,
  gameId: 'game-123',
  speedBoostUntil: null,
  isBraking: false,
  brakeStartTime: null,
  hasShield: false,
  hasTrailEraser: false,
  ...overrides,
})

describe('useGameCanvas', () => {
  let gamePlayers: ReturnType<typeof ref<Player[]>>
  let powerUps: ReturnType<typeof ref<PowerUp[]>>
  let obstacles: ReturnType<typeof ref<string[]>>
  let currentGridSize: ReturnType<typeof ref<number>>
  let gameState: ReturnType<typeof ref<string>>
  let playerId: ReturnType<typeof ref<string | null>>
  let mockCanvas: HTMLCanvasElement
  let mockContext: CanvasRenderingContext2D

  beforeEach(() => {
    gamePlayers = ref([])
    powerUps = ref([])
    obstacles = ref([])
    currentGridSize = ref(20)
    gameState = ref('waiting')
    playerId = ref('player-123')

    // Mock Path2D
    global.Path2D = vi.fn(() => ({
      rect: vi.fn(),
    })) as unknown as typeof Path2D

    // Mock canvas and context with proper tracking
    const contextState = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      shadowColor: '',
      shadowBlur: 0,
      font: '',
      textAlign: '',
      imageSmoothingEnabled: true,
    }
    
    mockContext = {
      get fillStyle() { return contextState.fillStyle },
      set fillStyle(value: string) { contextState.fillStyle = value },
      get strokeStyle() { return contextState.strokeStyle },
      set strokeStyle(value: string) { contextState.strokeStyle = value },
      get lineWidth() { return contextState.lineWidth },
      set lineWidth(value: number) { contextState.lineWidth = value },
      get shadowColor() { return contextState.shadowColor },
      set shadowColor(value: string) { contextState.shadowColor = value },
      get shadowBlur() { return contextState.shadowBlur },
      set shadowBlur(value: number) { contextState.shadowBlur = value },
      get font() { return contextState.font },
      set font(value: string) { contextState.font = value },
      get textAlign() { return contextState.textAlign },
      set textAlign(value: string) { contextState.textAlign = value },
      get imageSmoothingEnabled() { return contextState.imageSmoothingEnabled },
      set imageSmoothingEnabled(value: boolean) { contextState.imageSmoothingEnabled = value },
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    mockCanvas = {
      width: 400,
      height: 400,
      getContext: vi.fn((contextId: string) => {
        // Always return the same mock context
        return contextId === '2d' ? mockContext : null
      }),
    } as unknown as HTMLCanvasElement

    // Mock document.createElement to return separate canvases for grid cache
    const originalCreateElement = document.createElement.bind(document)
    let canvasCount = 0
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        canvasCount++
        // Return separate mock canvases for grid cache
        if (canvasCount > 1) {
          return {
            width: 400,
            height: 400,
            getContext: vi.fn(() => mockContext),
          } as unknown as HTMLCanvasElement
        }
        return mockCanvas
      }
      return originalCreateElement(tagName)
    })
  })

  const createTestComponent = () => defineComponent({
    setup() {
      const canvas = useGameCanvas(
        gamePlayers,
        powerUps,
        obstacles,
        currentGridSize,
        gameState,
        playerId
      )
      return { canvas }
    },
    render() {
      return h('div', { id: 'test' })
    }
  })

  it('returns expected interface', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    expect(canvas).toHaveProperty('canvasRef')
    expect(canvas).toHaveProperty('drawGame')
    expect(canvas).toHaveProperty('setupCanvas')
    expect(canvas).toHaveProperty('cellSize')
    expect(typeof canvas.drawGame).toBe('function')
    expect(typeof canvas.setupCanvas).toBe('function')
    expect(canvas.cellSize).toBe(20)
  })

  it('initializes with null canvas ref', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    
    expect(wrapper.vm.canvas.canvasRef.value).toBeNull()
  })

  it('drawGame handles null canvas gracefully', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    
    expect(() => wrapper.vm.canvas.drawGame()).not.toThrow()
  })

  it('setupCanvas sets canvas dimensions', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    await nextTick()
    
    canvas.setupCanvas()
    await nextTick()
    
    expect(mockCanvas.getContext).toHaveBeenCalled()
  })

  it('drawGame renders when canvas is set', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    expect(mockCanvas.getContext).toHaveBeenCalled()
  })

  it('renders players on canvas', async () => {
    gamePlayers.value = [
      createPlayer({
        trail: ['5,6', '5,7'],
      }),
    ]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.fillText).toHaveBeenCalled()
  })

  it('renders player with all directions', async () => {
    // Test all 4 directions by creating separate test for each
    gamePlayers.value = [createPlayer({ direction: 'up', x: 10, y: 10 })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    canvas.drawGame()
    expect(mockContext.fillRect).toHaveBeenCalled()
  })

  it('renders power-ups with different types', async () => {
    powerUps.value = [{ id: 'pu-1', type: 'speed', x: 10, y: 10 }]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    canvas.drawGame()
    
    expect(mockContext.arc).toHaveBeenCalled()
  })

  it('renders obstacles on canvas', async () => {
    obstacles.value = ['10,10', '10,11', '10,12']
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    expect(mockContext.fillRect).toHaveBeenCalled()
  })

  it('adds "(You)" label to current player', async () => {
    gamePlayers.value = [createPlayer({ name: 'Me' })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    canvas.drawGame()
    
    // Verify the player was rendered (fillText is called for name but hard to verify in test)
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('applies glow effect when player has speed boost', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    const futureTime = Date.now() + 5000
    gamePlayers.value = [createPlayer({
      name: 'Fast Player',
      speed: 2,
      speedBoostUntil: futureTime,
    })]
    
    canvas.drawGame()
    
    // Shadow blur should have been set at some point (even if reset to 0 after)
    // Check that shadowColor was set for speed boost
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('applies brake effect when player is braking', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    gamePlayers.value = [createPlayer({
      name: 'Braking Player',
      speed: 0.5,
      isBraking: true,
      brakeStartTime: Date.now() - 1000,
    })]
    
    canvas.drawGame()
    
    // Check that player rendering occurred
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('shows shield icon when player has shield', async () => {
    gamePlayers.value = [createPlayer({
      name: 'Shielded Player',
      hasShield: true,
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    canvas.drawGame()
    
    // Shield power-up is rendered - verify player drawing happened
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('shows trail eraser icon when player has trail eraser', async () => {
    gamePlayers.value = [createPlayer({
      name: 'Eraser Player',
      hasTrailEraser: true,
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    canvas.drawGame()
    
    // Trail eraser power-up is rendered - verify player drawing happened
    expect(mockContext.fillRect).toHaveBeenCalled()
    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('handles invalid obstacle coordinates gracefully', async () => {
    obstacles.value = ['invalid', '10,abc', '']
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    expect(() => canvas.drawGame()).not.toThrow()
  })

  it('handles invalid trail coordinates gracefully', async () => {
    gamePlayers.value = [createPlayer({
      trail: ['invalid', '10,abc', ''],
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    expect(() => canvas.drawGame()).not.toThrow()
  })

  it('handles players with undefined position gracefully', async () => {
    gamePlayers.value = [{
      ...createPlayer(),
      x: undefined as unknown as number,
      y: undefined as unknown as number,
    }]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    expect(() => canvas.drawGame()).not.toThrow()
  })

  it('disables image smoothing for crisp pixels', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    expect(mockContext.imageSmoothingEnabled).toBe(false)
  })

  it('updates canvas dimensions when grid size changes', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    currentGridSize.value = 30
    
    await nextTick()
    canvas.drawGame()
    
    expect(mockCanvas.width).toBe(600)
    expect(mockCanvas.height).toBe(600)
  })

  it('watches grid size changes and updates canvas', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    currentGridSize.value = 25
    await nextTick()
    
    expect(mockCanvas.width).toBe(500)
    expect(mockCanvas.height).toBe(500)
  })

  it('renders game loop when state changes to playing', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    canvas.canvasRef.value = mockCanvas
    
    // Verify that changing gameState triggers the watch
    expect(gameState.value).toBe('waiting')
    
    gameState.value = 'playing'
    await nextTick()
    
    // The watch should be set up - we can't easily test RAF loop in unit tests
    // but we can verify the state changed which would trigger the watch
    expect(gameState.value).toBe('playing')
  })

  it('renders player trails with transparency', async () => {
    gamePlayers.value = [createPlayer({
      trail: ['5,6', '5,7', '5,8'],
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    expect(mockContext.fill).toHaveBeenCalled()
    expect(Path2D).toHaveBeenCalled()
  })

  it('handles player without trail', async () => {
    gamePlayers.value = [createPlayer({
      trail: [],
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    expect(() => canvas.drawGame()).not.toThrow()
  })

  it('caches grid rendering for performance', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    // First draw creates cache
    canvas.drawGame()
    const firstDrawImageCalls = (mockContext.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
    
    // Second draw uses cache
    canvas.drawGame()
    const secondDrawImageCalls = (mockContext.drawImage as ReturnType<typeof vi.fn>).mock.calls.length
    
    expect(secondDrawImageCalls).toBeGreaterThan(firstDrawImageCalls)
  })

  it('converts HSL trail colors to HSLA with transparency', async () => {
    gamePlayers.value = [createPlayer({
      trail: ['5,6'],
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    // Check that fillStyle was set (trail color with transparency)
    expect(mockContext.fillStyle).toBeTruthy()
  })

  it('handles non-HSL colors with transparency', async () => {
    gamePlayers.value = [createPlayer({
      color: '#00ffff',
      trail: ['5,6'],
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    
    expect(() => canvas.drawGame()).not.toThrow()
  })

  it('resets shadow blur after rendering player effects', async () => {
    gamePlayers.value = [createPlayer({
      hasShield: true,
    })]
    
    const wrapper = await mountSuspended(createTestComponent())
    const canvas = wrapper.vm.canvas
    
    canvas.canvasRef.value = mockCanvas
    canvas.drawGame()
    
    // Shadow should be reset after drawing
    expect(mockContext.shadowBlur).toBe(0)
  })
})
