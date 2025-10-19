// server/services/lobby.service.ts
import { createActor } from 'xstate'
import { lobbyMachine, type LobbyContext } from '../machines/lobby.machine'
import { gameMachine } from '../machines/game.machine'
import { DEFAULT_GAME_SETTINGS, DEFAULT_LOBBY_SETTINGS, type GamePlayer, type LobbySettings, type Spectator } from '../types/game.types'

export interface Lobby {
  id: string;
  actor: ReturnType<typeof createActor<typeof lobbyMachine>>;
  gameActor: ReturnType<typeof createActor<typeof gameMachine>> | null;
}

class LobbyService {
  private lobbies: Map<string, Lobby> = new Map()

  /**
   * Create a new lobby
   */
  createLobby(hostId?: string, settings?: Partial<LobbySettings>): Lobby {
    const lobbyId = `lobby-${Math.random().toString(36).slice(2, 8)}`
    
    const actor = createActor(lobbyMachine, {
      input: {
        lobbyId,
        hostId,
        settings: { ...DEFAULT_LOBBY_SETTINGS, ...settings },
      },
    })

    actor.start()

    const lobby: Lobby = {
      id: lobbyId,
      actor,
      gameActor: null,
    }

    this.lobbies.set(lobbyId, lobby)
    
    console.log(`[LobbyService] Created lobby ${lobbyId}`)
    return lobby
  }

  /**
   * Get a lobby by ID
   */
  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId)
  }

  /**
   * Get all active lobbies
   */
  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values())
  }

  /**
   * Find an available public lobby or create a new one
   */
  findOrCreatePublicLobby(): Lobby {
    // Find a public lobby that's waiting and not full
    const availableLobby = Array.from(this.lobbies.values()).find(lobby => {
      const snapshot = lobby.actor.getSnapshot()
      const context = snapshot.context
      
      return (
        !context.settings.isPrivate &&
        snapshot.matches('waiting') &&
        context.players.length < context.settings.maxPlayers
      )
    })

    if (availableLobby) {
      console.log(`[LobbyService] Found available lobby ${availableLobby.id}`)
      return availableLobby
    }

    // No available lobby, create a new one
    console.log('[LobbyService] No available lobby found, creating new one')
    return this.createLobby()
  }

  /**
   * Add a player to a lobby
   */
  addPlayerToLobby(lobbyId: string, player: GamePlayer): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) {
      console.log(`[LobbyService] ERROR: Lobby ${lobbyId} not found`)
      return false
    }

    lobby.actor.send({ type: 'PLAYER_JOIN', player })
    
    return true
  }

  /**
   * Remove a player from a lobby
   */
  removePlayerFromLobby(lobbyId: string, playerId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'PLAYER_LEAVE', playerId })
    
    // Note: Lobby closure is handled by WebSocket handler (_ws.ts)
    // to ensure proper notification of spectators
    
    console.log(`[LobbyService] Player ${playerId} left lobby ${lobbyId}`)
    return true
  }

  /**
   * Add a spectator to a lobby
   */
  addSpectatorToLobby(lobbyId: string, spectator: Spectator): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) {
      console.log(`[LobbyService] ERROR: Lobby ${lobbyId} not found`)
      return false
    }

    lobby.actor.send({ type: 'SPECTATOR_JOIN', spectator })
    console.log(`[LobbyService] Spectator ${spectator.id} joined lobby ${lobbyId}`)
    return true
  }

  /**
   * Remove a spectator from a lobby
   */
  removeSpectatorFromLobby(lobbyId: string, spectatorId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'SPECTATOR_LEAVE', spectatorId })
    console.log(`[LobbyService] Spectator ${spectatorId} left lobby ${lobbyId}`)
    return true
  }

  /**
   * Set player ready state
   */
  setPlayerReady(lobbyId: string, playerId: string, isReady: boolean): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'PLAYER_READY', playerId, isReady })
    console.log(`[LobbyService] Player ${playerId} ready state: ${isReady} in lobby ${lobbyId}`)
    return true
  }

  /**
   * Update lobby settings (host only)
   */
  updateLobbySettings(lobbyId: string, settings: Partial<LobbySettings>): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'UPDATE_SETTINGS', settings })
    console.log(`[LobbyService] Updated settings for lobby ${lobbyId}`, settings)
    return true
  }

  /**
   * Start the game in a lobby
   */
  startGame(lobbyId: string, obstacles: string[]): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    const snapshot = lobby.actor.getSnapshot()
    const context = snapshot.context

    // Send start event to lobby machine
    lobby.actor.send({ type: 'START_GAME' })

    // Create and start game actor
    const gameActor = createActor(gameMachine, {
      input: {
        gameId: `game-${lobbyId}`,
        players: context.players,
        settings: {
          ...DEFAULT_GAME_SETTINGS,
          gridSize: context.settings.gridSize,
          maxPlayers: context.settings.maxPlayers,
        },
        obstacles,
      },
    })

    gameActor.start()
    gameActor.send({ type: 'START' })
    
    lobby.gameActor = gameActor

    console.log(`[LobbyService] Started game in lobby ${lobbyId}`)
    return true
  }

  /**
   * End the game in a lobby
   */
  endGame(lobbyId: string, winner: string | null): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameActor) return false

    // Send game over event to game machine
    lobby.gameActor.send({ type: 'GAME_OVER', winner })
    
    // Send game ended event to lobby machine
    lobby.actor.send({ type: 'GAME_ENDED', winner })

    console.log(`[LobbyService] Ended game in lobby ${lobbyId}, winner: ${winner}`)
    return true
  }

  /**
   * Return lobby to waiting state after game finished
   */
  returnToLobby(lobbyId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'RETURN_TO_LOBBY' })
    console.log(`[LobbyService] Lobby ${lobbyId} returned to waiting`)
    return true
  }

  /**
   * Get the lobby actor (for advanced control)
   */
  getLobbyActor(lobbyId: string) {
    const lobby = this.lobbies.get(lobbyId)
    return lobby?.actor
  }

  /**
   * Close a lobby
   */
  closeLobby(lobbyId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    // Stop actors
    lobby.actor.send({ type: 'CLOSE_LOBBY' })
    lobby.actor.stop()
    
    if (lobby.gameActor) {
      lobby.gameActor.stop()
    }

    this.lobbies.delete(lobbyId)
    console.log(`[LobbyService] Closed lobby ${lobbyId}`)
    return true
  }

  /**
   * Get lobby context (for broadcasting state)
   */
  getLobbyContext(lobbyId: string): LobbyContext | null {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return null

    return lobby.actor.getSnapshot().context
  }

  /**
   * Get game context (for broadcasting game state)
   */
  getGameContext(lobbyId: string) {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby || !lobby.gameActor) return null

    return lobby.gameActor.getSnapshot().context
  }

  /**
   * Check if lobby is in a specific state
   */
  isLobbyInState(lobbyId: string, state: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    return lobby.actor.getSnapshot().matches(state as 'waiting' | 'starting' | 'inGame' | 'finished' | 'closed')
  }

  /**
   * Kick a player from the lobby
   */
  kickPlayer(lobbyId: string, playerId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'KICK_PLAYER', playerId })
    console.log(`[LobbyService] Player ${playerId} kicked from lobby ${lobbyId}`)
    return true
  }

  /**
   * Ban a player from the lobby
   */
  banPlayer(lobbyId: string, playerId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'BAN_PLAYER', playerId })
    console.log(`[LobbyService] Player ${playerId} banned from lobby ${lobbyId}`)
    return true
  }

  /**
   * Add an AI bot to the lobby
   */
  addAIBot(lobbyId: string, bot: GamePlayer): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'ADD_AI_BOT', bot })
    console.log(`[LobbyService] AI bot ${bot.id} added to lobby ${lobbyId}`)
    return true
  }

  /**
   * Remove an AI bot from the lobby
   */
  removeAIBot(lobbyId: string, botId: string): boolean {
    const lobby = this.lobbies.get(lobbyId)
    if (!lobby) return false

    lobby.actor.send({ type: 'REMOVE_AI_BOT', botId })
    console.log(`[LobbyService] AI bot ${botId} removed from lobby ${lobbyId}`)
    return true
  }

  /**
   * Check if a player is banned from a lobby
   */
  isPlayerBanned(lobbyId: string, playerId: string): boolean {
    const lobbyContext = this.getLobbyContext(lobbyId)
    if (!lobbyContext) return false

    return lobbyContext.bannedPlayerIds.includes(playerId)
  }
}

// Export singleton instance
export const lobbyService = new LobbyService()

