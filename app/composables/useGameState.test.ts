import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useGameState } from './useGameState'
import { ref } from 'vue'

describe('useGameState', () => {
  let mockWs: {
    send: ReturnType<typeof vi.fn>
    onMessage: ReturnType<typeof vi.fn>
  }
  let playerId: ReturnType<typeof ref<string | null>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockWs = {
      send: vi.fn().mockReturnValue(true),
      onMessage: vi.fn(() => () => {}),
    }
    playerId = ref('player-123')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default game state', () => {
    const game = useGameState(mockWs, playerId)
    
    expect(game.gamePlayers.value).toEqual([])
    expect(game.currentGridSize.value).toBe(20)
    expect(game.gameState.value).toBe('waiting')
    expect(game.countdown.value).toBeNull()
    expect(game.crashedPlayers.value).toEqual([])
    expect(game.winner.value).toBeNull()
    expect(game.powerUps.value).toEqual([])
    expect(game.obstacles.value).toEqual([])
    expect(game.currentDirection.value).toBe('')
  })

  it('returns expected interface', () => {
    const game = useGameState(mockWs, playerId)
    
    expect(game).toHaveProperty('gamePlayers')
    expect(game).toHaveProperty('currentGridSize')
    expect(game).toHaveProperty('gameState')
    expect(game).toHaveProperty('countdown')
    expect(game).toHaveProperty('crashedPlayers')
    expect(game).toHaveProperty('winner')
    expect(game).toHaveProperty('powerUps')
    expect(game).toHaveProperty('obstacles')
    expect(game).toHaveProperty('currentDirection')
    expect(game).toHaveProperty('currentTime')
    expect(game).toHaveProperty('currentPlayer')
    expect(game).toHaveProperty('hasAnyBoost')
    expect(game).toHaveProperty('reset')
  })

  describe('computed properties', () => {
    it('currentPlayer returns undefined when no players match', () => {
      const game = useGameState(mockWs, playerId)
      
      expect(game.currentPlayer.value).toBeUndefined()
    })

    it('hasAnyBoost returns false when no current player', () => {
      const game = useGameState(mockWs, playerId)
      
      expect(game.hasAnyBoost.value).toBe(false)
    })
  })

  describe('reset', () => {
    it('resets all game state', () => {
      const game = useGameState(mockWs, playerId)
      
      game.reset()
      
      expect(game.gamePlayers.value).toEqual([])
      expect(game.gameState.value).toBe('waiting')
      expect(game.countdown.value).toBeNull()
      expect(game.crashedPlayers.value).toEqual([])
      expect(game.winner.value).toBeNull()
      expect(game.powerUps.value).toEqual([])
      expect(game.obstacles.value).toEqual([])
      expect(game.currentDirection.value).toBe('')
    })

    it('can be called multiple times', () => {
      const game = useGameState(mockWs, playerId)
      
      expect(() => {
        game.reset()
        game.reset()
        game.reset()
      }).not.toThrow()
    })
  })

  describe('readonly properties', () => {
    it('exposes readonly refs', () => {
      const game = useGameState(mockWs, playerId)
      
      // These should all be readonly (Vue warns but doesn't throw in production)
      expect(game.gamePlayers).toBeDefined()
      expect(game.gameState).toBeDefined()
      expect(game.currentGridSize).toBeDefined()
    })
  })
})
