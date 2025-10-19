/**
 * Broadcasting utilities with state dependencies
 * Requires explicit imports per Nuxt conventions
 */

import { lobbyService } from '../services/lobby.service'

interface Peer {
  send: (data: string) => void;
  close: () => void;
  data?: PeerData;
}

interface GameMessage {
  type: string;
  payload: unknown;
}

interface PeerData {
  playerId: string;
  lobbyId: string | null;
  isSpectator: boolean;
  reconnectToken?: string;
  userId?: string;
}

/**
 * Broadcast to a specific peer
 */
export const sendToPeer = (
  playerId: string,
  message: GameMessage,
  connectedPeers: Map<string, Peer>
) => {
  const peer = connectedPeers.get(playerId)
  if (peer) {
    peer.send(JSON.stringify(message))
  }
}

/**
 * Get list of all lobbies for browser
 */
export const getLobbyList = () => {
  const lobbies = lobbyService.getAllLobbies()
  return lobbies.map(lobby => {
    const snapshot = lobby.actor.getSnapshot()
    const context = snapshot.context
    const hostPlayer = context.players.find(p => p.id === context.hostId)
    
    return {
      lobbyId: context.lobbyId,
      playerCount: context.players.length,
      maxPlayers: context.settings.maxPlayers,
      gridSize: context.settings.gridSize,
      isPrivate: context.settings.isPrivate,
      hostName: hostPlayer?.name || 'Unknown',
      state: snapshot.value,
    }
  })
}

/**
 * Broadcast lobby list to all players who are browsing (not in a lobby)
 */
export const broadcastLobbyList = (connectedPeers: Map<string, Peer>) => {
  const lobbyList = getLobbyList()
  
  // Send to all connected players who are NOT in a lobby
  for (const [playerId, peer] of connectedPeers) {
    const peerData = (peer as Peer & { data?: PeerData }).data
    if (!peerData?.lobbyId) {
      // Player is browsing, send them the updated list
      sendToPeer(playerId, {
        type: 'lobbyList',
        payload: {
          lobbies: lobbyList
        },
      }, connectedPeers)
    }
  }
}

/**
 * Broadcast message to all players in a specific lobby
 */
export const broadcastToLobby = (
  lobbyId: string,
  message: GameMessage,
  connectedPeers: Map<string, Peer>
) => {
  const messageStr = JSON.stringify(message)
  for (const [_, peer] of connectedPeers) {
    const peerData = (peer as Peer & { data?: PeerData }).data
    if (peerData?.lobbyId === lobbyId) {
      peer.send(messageStr)
    }
  }
}

/**
 * Broadcast lobby state (players, settings, etc.)
 */
export const broadcastLobbyState = (
  lobbyId: string,
  connectedPeers: Map<string, Peer>
) => {
  const context = lobbyService.getLobbyContext(lobbyId)
  if (!context) {
    console.log(`[broadcastLobbyState] No context found for lobby ${lobbyId}`)
    return
  }

  const lobby = lobbyService.getLobby(lobbyId)
  if (!lobby) {
    console.log(`[broadcastLobbyState] No lobby found for ${lobbyId}`)
    return
  }

  const snapshot = lobby.actor.getSnapshot()
  
  // Calculate countdown remaining time if in starting state
  let countdownRemaining = null
  if (snapshot.value === 'starting' && context.countdownStartedAt) {
    const elapsed = Date.now() - context.countdownStartedAt
    countdownRemaining = Math.max(0, Math.ceil((5000 - elapsed) / 1000)) // 5 seconds countdown
  }
  
  const payload = {
    lobbyId: context.lobbyId,
    state: snapshot.value,
    players: context.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isReady: p.isReady,
    })),
    spectators: context.spectators.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })),
    settings: context.settings,
    hostId: context.hostId,
    countdownRemaining,
    roundNumber: context.roundNumber,
  }
  
  broadcastToLobby(lobbyId, {
    type: 'lobbyState',
    payload,
  }, connectedPeers)
}

/**
 * Broadcast full game state (positions, trails, power-ups, etc.)
 */
export const broadcastGameState = (
  lobbyId: string,
  connectedPeers: Map<string, Peer>
) => {
  const gameContext = lobbyService.getGameContext(lobbyId)
  if (!gameContext) {
    return
  }
  
  broadcastToLobby(lobbyId, {
    type: 'gameState',
    payload: {
      players: gameContext.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        direction: p.direction,
        color: p.color,
        trail: p.trail,
        isReady: p.isReady,
        speed: p.speed,
        speedBoostUntil: p.speedBoostUntil,
        isBraking: p.isBraking,
        hasShield: p.hasShield,
        hasTrailEraser: p.hasTrailEraser,
      })),
      powerUps: gameContext.powerUps,
      obstacles: gameContext.obstacles,
      gridSize: gameContext.settings.gridSize,
      gameState: 'playing',
    },
  }, connectedPeers)
}

