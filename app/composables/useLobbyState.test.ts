import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLobbyState } from './useLobbyState'
import { ref } from 'vue'

describe('useLobbyState', () => {
  let mockWs: {
    send: ReturnType<typeof vi.fn>
    onMessage: ReturnType<typeof vi.fn>
  }
  let playerId: ReturnType<typeof ref<string | null>>

  beforeEach(() => {
    mockWs = {
      send: vi.fn().mockReturnValue(true),
      onMessage: vi.fn(() => () => {}),
    }
    playerId = ref('player-123')
    
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with null lobby state', () => {
    const lobby = useLobbyState(mockWs, playerId)
    
    expect(lobby.lobbyState.value).toBeNull()
    expect(lobby.lobbyId.value).toBeNull()
    expect(lobby.isReady.value).toBe(false)
    expect(lobby.isSpectator.value).toBe(false)
    expect(lobby.currentGridSize.value).toBe(20)
  })

  it('returns expected interface', () => {
    const lobby = useLobbyState(mockWs, playerId)
    
    expect(lobby).toHaveProperty('lobbyState')
    expect(lobby).toHaveProperty('lobbyId')
    expect(lobby).toHaveProperty('isReady')
    expect(lobby).toHaveProperty('isSpectator')
    expect(lobby).toHaveProperty('currentGridSize')
    expect(lobby).toHaveProperty('isHost')
    expect(lobby).toHaveProperty('joinLobby')
    expect(lobby).toHaveProperty('joinLobbyAsSpectator')
    expect(lobby).toHaveProperty('createLobby')
    expect(lobby).toHaveProperty('toggleReady')
    expect(lobby).toHaveProperty('updateLobbySettings')
    expect(lobby).toHaveProperty('kickPlayer')
    expect(lobby).toHaveProperty('banPlayer')
    expect(lobby).toHaveProperty('addAIBot')
    expect(lobby).toHaveProperty('removeAIBot')
    expect(lobby).toHaveProperty('leaveLobby')
    expect(lobby).toHaveProperty('returnToLobby')
    expect(lobby).toHaveProperty('reset')
  })

  describe('computed properties', () => {
    it('isHost returns false when lobbyState is null', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      expect(lobby.isHost.value).toBe(false)
    })
  })

  describe('actions', () => {
    it('joinLobby sends correct message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.joinLobby('lobby-123', 'Player One', 'hsl(180, 90%, 60%)')
      
      expect(mockWs.send).toHaveBeenCalledWith('joinLobby', {
        lobbyId: 'lobby-123',
        playerName: 'Player One',
        playerColor: 'hsl(180, 90%, 60%)',
      })
    })

    it('joinLobbyAsSpectator sends correct message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.joinLobbyAsSpectator('lobby-456', 'Spectator', 'hsl(0, 90%, 60%)')
      
      expect(mockWs.send).toHaveBeenCalledWith('joinLobbyAsSpectator', {
        lobbyId: 'lobby-456',
        playerName: 'Spectator',
        playerColor: 'hsl(0, 90%, 60%)',
      })
    })

    it('createLobby sends correct message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      const settings = {
        name: 'Test Lobby',
        maxPlayers: 4,
        gridSize: 30,
        tickRate: 100,
        powerUpsEnabled: true,
      }
      
      lobby.createLobby(settings, 'Host Player', 'hsl(120, 90%, 60%)')
      
      expect(mockWs.send).toHaveBeenCalledWith('createLobby', {
        settings,
        playerName: 'Host Player',
        playerColor: 'hsl(120, 90%, 60%)',
      })
    })

    it('toggleReady sends ready message with toggled state', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.toggleReady()
      
      expect(mockWs.send).toHaveBeenCalledWith('ready', { ready: true })
      expect(lobby.isReady.value).toBe(true)
      
      lobby.toggleReady()
      
      expect(mockWs.send).toHaveBeenCalledWith('ready', { ready: false })
      expect(lobby.isReady.value).toBe(false)
    })

    it('toggleReady does nothing when playerId is null', () => {
      playerId.value = null
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.toggleReady()
      
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('updateLobbySettings sends settings update', () => {
      const lobby = useLobbyState(mockWs, playerId)
      const settings = { gridSize: 40, tickRate: 80 }
      
      lobby.updateLobbySettings(settings)
      
      expect(mockWs.send).toHaveBeenCalledWith('updateSettings', { settings })
    })

    it('kickPlayer sends kick message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.kickPlayer('player-789')
      
      expect(mockWs.send).toHaveBeenCalledWith('kickPlayer', { targetPlayerId: 'player-789' })
    })

    it('banPlayer sends ban message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.banPlayer('player-999')
      
      expect(mockWs.send).toHaveBeenCalledWith('banPlayer', { targetPlayerId: 'player-999' })
    })

    it('addAIBot sends addAIBot message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.addAIBot()
      
      expect(mockWs.send).toHaveBeenCalledWith('addAIBot', {})
    })

    it('removeAIBot sends removeAIBot message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.removeAIBot('bot-123')
      
      expect(mockWs.send).toHaveBeenCalledWith('removeAIBot', { botId: 'bot-123' })
    })

    it('leaveLobby sends leave message and resets state', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.leaveLobby()
      
      expect(mockWs.send).toHaveBeenCalledWith('leaveLobby', {})
      expect(lobby.lobbyId.value).toBeNull()
      expect(lobby.lobbyState.value).toBeNull()
      expect(lobby.isReady.value).toBe(false)
      expect(lobby.isSpectator.value).toBe(false)
    })

    it('returnToLobby sends returnToLobby message', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.returnToLobby()
      
      expect(mockWs.send).toHaveBeenCalledWith('returnToLobby', {})
    })

    it('reset clears all lobby state', () => {
      const lobby = useLobbyState(mockWs, playerId)
      
      lobby.reset()
      
      expect(lobby.lobbyState.value).toBeNull()
      expect(lobby.lobbyId.value).toBeNull()
      expect(lobby.isReady.value).toBe(false)
      expect(lobby.isSpectator.value).toBe(false)
    })
  })
})
