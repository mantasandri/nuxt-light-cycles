/**
 * WebSocket message handlers
 * Requires explicit imports per Nuxt conventions
 */

import { lobbyService } from '../services/lobby.service'
import { ReplayService, type ReplayRecorder } from '../services/replay.service'
import type { GamePlayer } from '../types/game.types'
import { sendToPeer, getLobbyList, broadcastLobbyList, broadcastLobbyState, broadcastToLobby } from './broadcast'
import { startCountdownInterval } from './game-loop'

interface Peer {
  send: (data: string) => void;
  close: () => void;
  data?: PeerData;
}

interface PeerData {
  playerId: string;
  lobbyId: string | null;
  isSpectator: boolean;
  reconnectToken?: string;
  userId?: string;
}

interface GameMessage {
  type: string;
  payload: Record<string, unknown>;
}

interface MessageHandlerContext {
  connectedPeers: Map<string, Peer>;
  gameIntervals: Map<string, NodeJS.Timeout>;
  countdownIntervals: Map<string, NodeJS.Timeout>;
  replayRecorders: Map<string, ReplayRecorder>;
  reconnectionSessions: Map<string, { playerId: string; lobbyId: string | null; isSpectator: boolean; lastSeen: number }>;
}

/**
 * Main message handler that routes to specific handlers
 */
export const handleMessage = async (
  peer: Peer,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId, lobbyId } = peerData

  // Handle reconnection
  if (data.type === 'reconnect') {
    return handleReconnect(peer, data, context)
  }

  // Handle setUserId
  if (data.type === 'setUserId') {
    return handleSetUserId(peer, data)
  }

  // Handle lobby browsing actions (no lobby required)
  if (data.type === 'getLobbyList') {
    return handleGetLobbyList(playerId, context.connectedPeers)
  }

  if (data.type === 'createLobby') {
    return handleCreateLobby(peer, data, context)
  }

  if (data.type === 'joinLobby') {
    return handleJoinLobby(peer, data, context)
  }

  if (data.type === 'joinLobbyAsSpectator') {
    return handleJoinLobbyAsSpectator(peer, data, context)
  }

  if (data.type === 'leaveLobby') {
    return handleLeaveLobby(peer, context)
  }

  // Handle replay actions (don't require lobby)
  if (data.type === 'getUserReplays') {
    return handleGetUserReplays(peer, context)
  }

  if (data.type === 'loadReplay') {
    return handleLoadReplay(peer, data, context.connectedPeers)
  }

  if (data.type === 'deleteReplay') {
    return handleDeleteReplay(peer, data, context.connectedPeers)
  }

  // All other actions require being in a lobby
  if (!lobbyId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Not in a lobby' },
    }, context.connectedPeers)
    return
  }

  const lobby = lobbyService.getLobby(lobbyId)
  if (!lobby) return

  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Route to lobby-specific handlers
  switch (data.type) {
    case 'setName':
      return handleSetName(playerId, lobbyId, data, context)
    case 'ready':
      return handleReady(playerId, lobbyId, data, context)
    case 'move':
      return handleMove(playerId, lobbyId, data, context)
    case 'brake':
      return handleBrake(playerId, lobbyId, data, context)
    case 'updateSettings':
      return handleUpdateSettings(playerId, lobbyId, data, context)
    case 'kickPlayer':
      return handleKickPlayer(playerId, lobbyId, data, context)
    case 'banPlayer':
      return handleBanPlayer(playerId, lobbyId, data, context)
    case 'addAIBot':
      return handleAddAIBot(playerId, lobbyId, data, context)
    case 'removeAIBot':
      return handleRemoveAIBot(playerId, lobbyId, data, context)
    case 'returnToLobby':
      return handleReturnToLobby(lobbyId, context)
    case 'saveReplay':
      return handleSaveReplay(peer, lobbyId, context)
  }
}

/**
 * Handle reconnection
 */
const handleReconnect = (
  peer: Peer,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId } = peerData
  const token = data.payload.reconnectToken
  const session = context.reconnectionSessions.get(token)
  
  if (session && Date.now() - session.lastSeen < 60000) { // 1 minute window
    console.log(`[WebSocket] Player ${playerId} reconnecting with token ${token}`);
    
    // Restore session
    (peer as Peer & { data?: PeerData }).data = {
      playerId: session.playerId,
      lobbyId: session.lobbyId,
      isSpectator: session.isSpectator,
      reconnectToken: token
    }
    
    // Update peer reference
    context.connectedPeers.set(session.playerId, peer)
    
    // Send reconnect success
    sendToPeer(session.playerId, {
      type: 'reconnected',
      payload: {
        playerId: session.playerId,
        lobbyId: session.lobbyId,
        isSpectator: session.isSpectator
      },
    }, context.connectedPeers)
    
    // If they were in a lobby, send current lobby state
    if (session.lobbyId) {
      broadcastLobbyState(session.lobbyId, context.connectedPeers)
    }
  } else {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Reconnection session expired or invalid' },
    }, context.connectedPeers)
  }
}

/**
 * Handle setUserId
 */
const handleSetUserId = (peer: Peer, data: GameMessage) => {
  const userId = data.payload.userId
  if (userId && typeof userId === 'string') {
    const currentPeerData = (peer as Peer & { data?: PeerData }).data
    if (currentPeerData) {
      currentPeerData.userId = userId
      console.log(`[UserID] Set persistent userId for player ${currentPeerData.playerId}: ${userId}`)
    }
  }
}

/**
 * Handle getLobbyList
 */
const handleGetLobbyList = (playerId: string, connectedPeers: Map<string, Peer>) => {
  sendToPeer(playerId, {
    type: 'lobbyList',
    payload: { lobbies: getLobbyList() },
  }, connectedPeers)
}

/**
 * Handle createLobby
 */
const handleCreateLobby = (
  peer: Peer,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const playerId = peerData.playerId
  const settings = data.payload.settings
  const playerName = data.payload.playerName
  const playerColor = data.payload.playerColor
  
  // Create new lobby
  const lobby = lobbyService.createLobby(playerId, settings)
  const newLobbyId = lobby.id
  
  // Update peer data
  const peerDataForUpdate = (peer as Peer & { data?: PeerData }).data
  if (peerDataForUpdate) {
    peerDataForUpdate.lobbyId = newLobbyId
    peerDataForUpdate.isSpectator = false
  }
  
  // Get safe starting position
  const lobbyContext = lobbyService.getLobbyContext(newLobbyId)
  const pos = getSafePosition(
    settings.gridSize,
    [],
    []
  )
  
  // Create player object
  const newPlayer: GamePlayer = {
    id: playerId,
    name: playerName || `Player ${playerId.slice(-4)}`,
    x: pos.x,
    y: pos.y,
    direction: pos.direction,
    color: playerColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
    trail: [],
    isReady: false,
    speed: 1,
    speedBoostUntil: null,
    isBraking: false,
    brakeStartTime: null,
    gameId: newLobbyId,
    hasShield: false,
    hasTrailEraser: false,
  }
  
  // Add player to lobby
  lobbyService.addPlayerToLobby(newLobbyId, newPlayer)
  
  // Add AI players if requested
  if (settings.enableAI && settings.aiPlayerCount > 0) {
    for (let i = 0; i < settings.aiPlayerCount; i++) {
      const aiPos = getSafePosition(
        settings.gridSize,
        lobbyContext?.players || [],
        []
      )
      const aiPlayer: GamePlayer = {
        id: `ai-${Math.random().toString(36).slice(2, 8)}`,
        name: `AI Bot ${i + 1}`,
        x: aiPos.x,
        y: aiPos.y,
        direction: aiPos.direction,
        color: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
        trail: [],
        isReady: true, // AI always ready
        speed: 1,
        speedBoostUntil: null,
        isBraking: false,
        brakeStartTime: null,
        gameId: newLobbyId,
        hasShield: false,
        hasTrailEraser: false,
      }
      lobbyService.addPlayerToLobby(newLobbyId, aiPlayer)
    }
  }
  
  const updatedContext = lobbyService.getLobbyContext(newLobbyId)
  
  console.log(`[WebSocket] Lobby ${newLobbyId} created with ${updatedContext?.players.length} players (including AI)`)
  
  // Send success response
  sendToPeer(playerId, {
    type: 'lobbyJoined',
    payload: {
      lobbyId: newLobbyId,
      player: newPlayer,
      gridSize: updatedContext?.settings.gridSize || 40,
    },
  }, context.connectedPeers)
  
  // Broadcast updated lobby state to the creator
  broadcastLobbyState(newLobbyId, context.connectedPeers)
  
  // Broadcast updated lobby list to all browsing players
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle joinLobby
 */
const handleJoinLobby = (
  peer: Peer,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const playerId = peerData.playerId
  const targetLobbyId = data.payload.lobbyId
  const playerName = data.payload.playerName
  const playerColor = data.payload.playerColor
  
  const lobby = lobbyService.getLobby(targetLobbyId)
  if (!lobby) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Lobby not found' },
    }, context.connectedPeers)
    return
  }

  // Check if player is banned from this lobby
  if (lobbyService.isPlayerBanned(targetLobbyId, playerId)) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'You have been banned from this lobby' },
    }, context.connectedPeers)
    return
  }
  
  // Update peer data
  const peerDataUpdate = (peer as Peer & { data?: PeerData }).data
  if (peerDataUpdate) {
    peerDataUpdate.lobbyId = targetLobbyId
    peerDataUpdate.isSpectator = false
  }
  
  // Get safe starting position
  const lobbyContext = lobbyService.getLobbyContext(targetLobbyId)
  const pos = getSafePosition(
    lobbyContext?.settings.gridSize || 40,
    lobbyContext?.players || [],
    lobbyService.getGameContext(targetLobbyId)?.obstacles || []
  )
  
  // Create player object
  const newPlayer: GamePlayer = {
    id: playerId,
    name: playerName || `Player ${playerId.slice(-4)}`,
    x: pos.x,
    y: pos.y,
    direction: pos.direction,
    color: playerColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
    trail: [],
    isReady: false,
    speed: 1,
    speedBoostUntil: null,
    isBraking: false,
    brakeStartTime: null,
    gameId: targetLobbyId,
    hasShield: false,
    hasTrailEraser: false,
  }
  
  // Add player to lobby
  lobbyService.addPlayerToLobby(targetLobbyId, newPlayer)
  
  const updatedContext = lobbyService.getLobbyContext(targetLobbyId)
  
  // Send success response
  sendToPeer(playerId, {
    type: 'lobbyJoined',
    payload: {
      lobbyId: targetLobbyId,
      player: newPlayer,
      gridSize: updatedContext?.settings.gridSize || 40,
      isSpectator: false,
    },
  }, context.connectedPeers)
  
  // Broadcast updated lobby state
  broadcastLobbyState(targetLobbyId, context.connectedPeers)
  
  // Broadcast updated lobby list to all browsing players
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle joinLobbyAsSpectator
 */
const handleJoinLobbyAsSpectator = (
  peer: Peer,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const playerId = peerData.playerId
  const targetLobbyId = data.payload.lobbyId
  const spectatorName = data.payload.playerName
  const spectatorColor = data.payload.playerColor
  
  const lobby = lobbyService.getLobby(targetLobbyId)
  if (!lobby) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Lobby not found' },
    }, context.connectedPeers)
    return
  }

  const lobbyContext = lobbyService.getLobbyContext(targetLobbyId)
  if (!lobbyContext?.settings.allowSpectators) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Spectators not allowed in this lobby' },
    }, context.connectedPeers)
    return
  }
  
  // Update peer data
  const peerDataUpdate = (peer as Peer & { data?: PeerData }).data
  if (peerDataUpdate) {
    peerDataUpdate.lobbyId = targetLobbyId
    peerDataUpdate.isSpectator = true
  }
  
  // Create spectator object
  const newSpectator = {
    id: playerId,
    name: spectatorName || `Spectator ${playerId.slice(-4)}`,
    color: spectatorColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
    joinedAt: Date.now(),
  }
  
  // Add spectator to lobby
  lobbyService.addSpectatorToLobby(targetLobbyId, newSpectator)
  
  // Send success response
  sendToPeer(playerId, {
    type: 'lobbyJoined',
    payload: {
      lobbyId: targetLobbyId,
      spectator: newSpectator,
      gridSize: lobbyContext?.settings.gridSize || 40,
      isSpectator: true,
    },
  }, context.connectedPeers)
  
  // Broadcast updated lobby state
  broadcastLobbyState(targetLobbyId, context.connectedPeers)
  
  // Broadcast updated lobby list to all browsing players
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle leaveLobby
 */
const handleLeaveLobby = (
  peer: Peer,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId || !peerData.lobbyId) return

  const { playerId, lobbyId } = peerData
  
  // Remove player or spectator from lobby
  if (peerData.isSpectator) {
    lobbyService.removeSpectatorFromLobby(lobbyId, playerId)
  } else {
    lobbyService.removePlayerFromLobby(lobbyId, playerId)
  }
  
  // Update peer data to remove lobby association
  peerData.lobbyId = null
  peerData.isSpectator = false
  
  // Check if only AI players remain
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  let lobbyClosed = false
  if (lobbyContext) {
    const humanPlayers = lobbyContext.players.filter(p => !p.id.startsWith('ai-'))
    
    // If no human players remain (only AI + spectators, or empty), close the lobby
    if (humanPlayers.length === 0) {
      console.log(`[WebSocket] No human players left in lobby ${lobbyId}, closing...`)
      
      // Notify all spectators that lobby is closing
      if (lobbyContext.spectators.length > 0) {
        for (const spectator of lobbyContext.spectators) {
          const spectatorPeer = context.connectedPeers.get(spectator.id)
          if (spectatorPeer) {
            const spectatorPeerData = (spectatorPeer as Peer & { data?: PeerData }).data
            if (spectatorPeerData) {
              spectatorPeerData.lobbyId = null
              spectatorPeerData.isSpectator = false
            }
            
            sendToPeer(spectator.id, {
              type: 'lobbyClosed',
              payload: { 
                message: 'All players have left. Returning to lobby browser...' 
              },
            }, context.connectedPeers)
            
            // Send them back to lobby browser
            sendToPeer(spectator.id, {
              type: 'connected',
              payload: {
                playerId: spectator.id,
                reconnectToken: spectatorPeerData?.reconnectToken || '',
                lobbies: getLobbyList(),
              },
            }, context.connectedPeers)
          }
        }
      }
      
      // Stop game interval if running
      const interval = context.gameIntervals.get(lobbyId)
      if (interval) {
        clearInterval(interval)
        context.gameIntervals.delete(lobbyId)
      }
      
      // Clean up replay recorder if exists (lobby closing, replay not saved)
      if (context.replayRecorders.has(lobbyId)) {
        console.log(`[Replay] Cleaning up unsaved recorder for lobby ${lobbyId}`)
        context.replayRecorders.delete(lobbyId)
      }
      
      lobbyService.closeLobby(lobbyId)
      lobbyClosed = true
    } else {
      // Human players remain, broadcast updated lobby state
      broadcastLobbyState(lobbyId, context.connectedPeers)
      // Also broadcast lobby list (player count changed)
      broadcastLobbyList(context.connectedPeers)
    }
  }
  
  // Send lobby list back to the player who left
  const lobbyList = getLobbyList()
  const reconnectToken = peerData.reconnectToken || ''
  sendToPeer(playerId, {
    type: 'connected',
    payload: {
      playerId,
      reconnectToken,
      lobbies: lobbyList
    },
  }, context.connectedPeers)
  
  // If lobby closed, broadcast to all other browsing players
  if (lobbyClosed) {
    broadcastLobbyList(context.connectedPeers)
  }
}

/**
 * Handle getUserReplays
 */
const handleGetUserReplays = async (
  peer: Peer,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId } = peerData
  const userId = peerData.userId || playerId
  
  try {
    console.log(`[WebSocket] getUserReplays - playerId: ${playerId}, peerData.userId: ${peerData.userId}, using: ${userId}`)
    const replays = await ReplayService.getUserReplays(userId)
    console.log(`[WebSocket] Found ${replays.length} replays for user ${userId}`)
    sendToPeer(playerId, {
      type: 'userReplays',
      payload: { replays },
    }, context.connectedPeers)
    console.log(`[WebSocket] Sent userReplays response to ${playerId}`)
  } catch (error) {
    console.error(`[WebSocket] Failed to get replays for user ${userId}:`, error)
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Failed to load replays' },
    }, context.connectedPeers)
  }
}

/**
 * Handle loadReplay
 */
const handleLoadReplay = async (peer: Peer, data: GameMessage, connectedPeers: Map<string, Peer>) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId } = peerData
  const replayId = data.payload.replayId
  
  try {
    const replayData = await ReplayService.loadReplay(replayId)
    if (!replayData) {
      sendToPeer(playerId, {
        type: 'error',
        payload: { message: 'Replay not found' },
      }, connectedPeers)
      return
    }

    sendToPeer(playerId, {
      type: 'replayData',
      payload: { replay: replayData },
    }, connectedPeers)
  } catch (error) {
    console.error(`[WebSocket] Failed to load replay ${replayId}:`, error)
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Failed to load replay' },
    }, connectedPeers)
  }
}

/**
 * Handle deleteReplay
 */
const handleDeleteReplay = async (peer: Peer, data: GameMessage, connectedPeers: Map<string, Peer>) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId } = peerData
  const replayId = data.payload.replayId
  const userId = peerData.userId || playerId
  
  try {
    console.log(`[WebSocket] deleteReplay ${replayId} for userId: ${userId}`)
    await ReplayService.removeReplayFromUser(userId, replayId)
    sendToPeer(playerId, {
      type: 'replayDeleted',
      payload: { replayId, message: 'Replay deleted successfully' },
    }, connectedPeers)
  } catch (error) {
    console.error(`[WebSocket] Failed to delete replay ${replayId}:`, error)
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Failed to delete replay' },
    }, connectedPeers)
  }
}

/**
 * Handle setName
 */
const handleSetName = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  const player = lobbyContext.players.find(p => p.id === playerId)
  if (!player) return

  player.name = data.payload.name.slice(0, 20)

  // Check color similarity
  const isTooSimilar = lobbyContext.players.some(p =>
    p.id !== playerId && isColorTooSimilar(p.color, data.payload.color)
  )

  if (isTooSimilar) {
    let newColor: string
    do {
      const hue = Math.floor(Math.random() * 360)
      newColor = `hsl(${hue}, 90%, 60%)`
    } while (lobbyContext.players.some(p =>
      p.id !== playerId && isColorTooSimilar(p.color, newColor)
    ))
    player.color = newColor
  } else {
    player.color = data.payload.color
  }

  broadcastLobbyState(lobbyId, context.connectedPeers)
}

/**
 * Handle ready
 */
const handleReady = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobby = lobbyService.getLobby(lobbyId)
  if (!lobby) return

  lobbyService.setPlayerReady(lobbyId, playerId, data.payload.ready)
  
  // Check if transitioned to starting state (XState does this automatically)
  const snapshot = lobby.actor.getSnapshot()
  if (snapshot.value === 'starting') {
    startCountdownInterval(lobbyId, context.connectedPeers, context.countdownIntervals, context.replayRecorders, context.gameIntervals)
    // Broadcast lobby list (state changed from waiting to starting)
    broadcastLobbyList(context.connectedPeers)
  } else {
    broadcastLobbyState(lobbyId, context.connectedPeers)
  }
}

/**
 * Handle move
 */
const handleMove = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobby = lobbyService.getLobby(lobbyId)
  if (!lobby?.gameActor) return
  
  const gameSnapshot = lobby.gameActor.getSnapshot()
  if (gameSnapshot.matches('playing')) {
    const gameContext = gameSnapshot.context
    const player = gameContext.players.find(p => p.id === playerId)
    
    // Check if player is pressing same direction (activate trail eraser)
    if (player && player.hasTrailEraser && player.lastDirection === data.payload.direction) {
      // Fire trail eraser!
      lobby.gameActor.send({
        type: 'USE_TRAIL_ERASER',
        playerId,
      })
      
      // Record trail eraser use
      const recorder = context.replayRecorders.get(lobbyId)
      if (recorder) {
        recorder.recordAction({
          playerId,
          action: 'useTrailEraser',
          payload: {},
        })
      }
      
      broadcastToLobby(lobbyId, {
        type: 'trailEraserUsed',
        payload: { playerId },
      }, context.connectedPeers)
    } else {
      // Normal move
      lobby.gameActor.send({
        type: 'PLAYER_MOVE',
        playerId,
        direction: data.payload.direction,
      })
      
      // Record player move action
      const recorder = context.replayRecorders.get(lobbyId)
      if (recorder) {
        recorder.recordAction({
          playerId,
          action: 'move',
          payload: { direction: data.payload.direction },
        })
      }
    }
  }
}

/**
 * Handle brake
 */
const handleBrake = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobby = lobbyService.getLobby(lobbyId)
  if (!lobby?.gameActor) return
  
  lobby.gameActor.send({
    type: 'PLAYER_BRAKE',
    playerId,
    braking: data.payload.braking,
  })
  
  // Record brake action
  const recorder = context.replayRecorders.get(lobbyId)
  if (recorder) {
    recorder.recordAction({
      playerId,
      action: 'brake',
      payload: { braking: data.payload.braking },
    })
  }
}

/**
 * Handle updateSettings
 */
const handleUpdateSettings = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Only host can update settings
  if (lobbyContext.hostId === playerId) {
    lobbyService.updateLobbySettings(lobbyId, data.payload.settings)
    broadcastLobbyState(lobbyId, context.connectedPeers)
  }
}

/**
 * Handle returnToLobby
 */
const handleReturnToLobby = (
  lobbyId: string,
  context: MessageHandlerContext
) => {
  // Transition from finished state back to waiting
  lobbyService.returnToLobby(lobbyId)
  
  // Clean up the old replay recorder (if not saved, it's lost)
  if (context.replayRecorders.has(lobbyId)) {
    console.log(`[Replay] Cleaning up recorder for lobby ${lobbyId} (returning to lobby for new game)`)
    context.replayRecorders.delete(lobbyId)
  }
  
  // Auto-ready AI players
  const updatedContext = lobbyService.getLobbyContext(lobbyId)
  if (updatedContext) {
    updatedContext.players.forEach(p => {
      if (p.id.startsWith('ai-')) {
        lobbyService.setPlayerReady(lobbyId, p.id, true)
      }
    })
  }
  
  // Broadcast updated lobby state
  broadcastLobbyState(lobbyId, context.connectedPeers)
  
  // Broadcast updated lobby list (state changed from finished to waiting)
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle saveReplay
 */
const handleSaveReplay = async (
  peer: Peer,
  lobbyId: string,
  context: MessageHandlerContext
) => {
  const peerData = (peer as Peer & { data?: PeerData }).data
  if (!peerData?.playerId) return

  const { playerId } = peerData
  const recorder = context.replayRecorders.get(lobbyId)
  const userId = peerData.userId || playerId
  
  console.log(`[WebSocket] saveReplay request for lobby ${lobbyId}, recorder exists:`, !!recorder)
  console.log(`[WebSocket] Using userId: ${userId} (persistent: ${!!peerData.userId})`)
  
  if (!recorder) {
    console.log(`[WebSocket] No recorder found for lobby ${lobbyId}`)
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'No replay available for this game' },
    }, context.connectedPeers)
    return
  }

  try {
    console.log(`[WebSocket] Recorder status - actions: ${recorder['actions']?.length || 0}, events: ${recorder['events']?.length || 0}`)
    
    // Extract winner info from the gameOver event that was already recorded
    const events = (recorder as any).events as Array<{ type: string; payload: any }>
    const gameOverEvent = events.find(e => e.type === 'gameOver')
    
    let winner: { playerId: string; name: string; color: string } | null = null
    
    if (gameOverEvent && gameOverEvent.payload.winner && !gameOverEvent.payload.draw) {
      // Get player info from lobby context
      const lobbyCtx = lobbyService.getLobbyContext(lobbyId)
      const winnerPlayer = lobbyCtx?.players.find(p => p.id === gameOverEvent.payload.winner)
      
      if (winnerPlayer) {
        winner = {
          playerId: winnerPlayer.id,
          name: winnerPlayer.name,
          color: winnerPlayer.color,
        }
      }
    }

    console.log(`[WebSocket] Attempting to save replay for userId ${userId}, winner:`, winner?.name || 'draw')
    const replayId = await recorder.saveReplay(userId, winner)
    console.log(`[WebSocket] Replay saved successfully with ID: ${replayId}`)
    
    sendToPeer(playerId, {
      type: 'replaySaved',
      payload: { replayId, message: 'Replay saved successfully!' },
    }, context.connectedPeers)
    
    // Clean up recorder
    context.replayRecorders.delete(lobbyId)
  } catch (error) {
    console.error(`[WebSocket] Failed to save replay for lobby ${lobbyId}:`, error)
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Failed to save replay' },
    }, context.connectedPeers)
  }
}

/**
 * Handle kickPlayer
 */
const handleKickPlayer = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Only host can kick players
  if (lobbyContext.hostId !== playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Only the host can kick players' },
    }, context.connectedPeers)
    return
  }

  const targetPlayerId = data.payload.targetPlayerId
  
  // Can't kick yourself
  if (targetPlayerId === playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'You cannot kick yourself' },
    }, context.connectedPeers)
    return
  }

  // Can't kick AI bots (use removeAIBot instead)
  if (targetPlayerId.startsWith('ai-')) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Use the AI controls to remove bots' },
    }, context.connectedPeers)
    return
  }

  // Notify the kicked player
  sendToPeer(targetPlayerId, {
    type: 'kicked',
    payload: { message: 'You have been kicked from the lobby' },
  }, context.connectedPeers)

  // Remove from lobby
  lobbyService.kickPlayer(lobbyId, targetPlayerId)
  
  // Update their peer data
  const targetPeer = context.connectedPeers.get(targetPlayerId)
  if (targetPeer) {
    const targetPeerData = (targetPeer as Peer & { data?: PeerData }).data
    if (targetPeerData) {
      targetPeerData.lobbyId = null
      targetPeerData.isSpectator = false
    }
    
    // Send them back to lobby browser
    sendToPeer(targetPlayerId, {
      type: 'connected',
      payload: {
        playerId: targetPlayerId,
        reconnectToken: targetPeerData?.reconnectToken || '',
        lobbies: getLobbyList(),
      },
    }, context.connectedPeers)
  }

  // Broadcast updated lobby state
  broadcastLobbyState(lobbyId, context.connectedPeers)
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle banPlayer
 */
const handleBanPlayer = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Only host can ban players
  if (lobbyContext.hostId !== playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Only the host can ban players' },
    }, context.connectedPeers)
    return
  }

  const targetPlayerId = data.payload.targetPlayerId
  
  // Can't ban yourself
  if (targetPlayerId === playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'You cannot ban yourself' },
    }, context.connectedPeers)
    return
  }

  // Can't ban AI bots
  if (targetPlayerId.startsWith('ai-')) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'AI bots cannot be banned' },
    }, context.connectedPeers)
    return
  }

  // Notify the banned player
  sendToPeer(targetPlayerId, {
    type: 'banned',
    payload: { message: 'You have been banned from the lobby' },
  }, context.connectedPeers)

  // Ban and remove from lobby
  lobbyService.banPlayer(lobbyId, targetPlayerId)
  
  // Update their peer data
  const targetPeer = context.connectedPeers.get(targetPlayerId)
  if (targetPeer) {
    const targetPeerData = (targetPeer as Peer & { data?: PeerData }).data
    if (targetPeerData) {
      targetPeerData.lobbyId = null
      targetPeerData.isSpectator = false
    }
    
    // Send them back to lobby browser
    sendToPeer(targetPlayerId, {
      type: 'connected',
      payload: {
        playerId: targetPlayerId,
        reconnectToken: targetPeerData?.reconnectToken || '',
        lobbies: getLobbyList(),
      },
    }, context.connectedPeers)
  }

  // Broadcast updated lobby state
  broadcastLobbyState(lobbyId, context.connectedPeers)
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle addAIBot
 */
const handleAddAIBot = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Only host can add AI bots
  if (lobbyContext.hostId !== playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Only the host can add AI bots' },
    }, context.connectedPeers)
    return
  }

  // Check if lobby is full
  if (lobbyContext.players.length >= lobbyContext.settings.maxPlayers) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Lobby is full' },
    }, context.connectedPeers)
    return
  }

  // Get safe starting position
  const pos = getSafePosition(
    lobbyContext.settings.gridSize,
    lobbyContext.players,
    []
  )

  // Count existing AI bots to get next number
  const aiCount = lobbyContext.players.filter(p => p.id.startsWith('ai-')).length

  // Create AI bot
  const aiBot: GamePlayer = {
    id: `ai-${Math.random().toString(36).slice(2, 8)}`,
    name: `AI Bot ${aiCount + 1}`,
    x: pos.x,
    y: pos.y,
    direction: pos.direction,
    color: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
    trail: [],
    isReady: true, // AI always ready
    speed: 1,
    speedBoostUntil: null,
    isBraking: false,
    brakeStartTime: null,
    gameId: lobbyId,
    hasShield: false,
    hasTrailEraser: false,
  }

  lobbyService.addAIBot(lobbyId, aiBot)

  // Broadcast updated lobby state
  broadcastLobbyState(lobbyId, context.connectedPeers)
  broadcastLobbyList(context.connectedPeers)
}

/**
 * Handle removeAIBot
 */
const handleRemoveAIBot = (
  playerId: string,
  lobbyId: string,
  data: GameMessage,
  context: MessageHandlerContext
) => {
  const lobbyContext = lobbyService.getLobbyContext(lobbyId)
  if (!lobbyContext) return

  // Only host can remove AI bots
  if (lobbyContext.hostId !== playerId) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Only the host can remove AI bots' },
    }, context.connectedPeers)
    return
  }

  const botId = data.payload.botId

  // Verify it's an AI bot
  if (!botId.startsWith('ai-')) {
    sendToPeer(playerId, {
      type: 'error',
      payload: { message: 'Can only remove AI bots' },
    }, context.connectedPeers)
    return
  }

  lobbyService.removeAIBot(lobbyId, botId)

  // Broadcast updated lobby state
  broadcastLobbyState(lobbyId, context.connectedPeers)
  broadcastLobbyList(context.connectedPeers)
}

