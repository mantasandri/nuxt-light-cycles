// server/routes/_ws.ts
import { lobbyService } from '../services/lobby.service'
import type { ReplayRecorder } from '../services/replay.service'
import { sendToPeer, getLobbyList, broadcastLobbyList, broadcastLobbyState } from '../lib/broadcast'
import { handleMessage } from '../lib/message-handlers'

interface Peer {
  send: (data: string) => void;
  close: () => void;
  data?: PeerData;
}

interface Message {
  toString: () => string;
}

interface PeerData {
  playerId: string;
  lobbyId: string | null;
  isSpectator: boolean;
  reconnectToken?: string;
  userId?: string;
}

// Map to store connected peers
const connectedPeers = new Map<string, Peer>()

// Map to store reconnection tokens -> peer data for session recovery
const reconnectionSessions = new Map<string, { 
  playerId: string; 
  lobbyId: string | null; 
  isSpectator: boolean; 
  lastSeen: number 
}>()

// Game loop intervals per lobby
const gameIntervals = new Map<string, NodeJS.Timeout>()
const countdownIntervals = new Map<string, NodeJS.Timeout>()

// Replay recorders per lobby
const replayRecorders = new Map<string, ReplayRecorder>()

/**
 * WebSocket Handler
 */
export default defineWebSocketHandler({
  open: async (peer: Peer) => {
    const playerId = `player-${Math.random().toString(36).slice(2, 8)}`
    const reconnectToken = `token-${Math.random().toString(36).slice(2, 16)}`
    
    // Store peer connection (not in a lobby yet - browsing state)
    connectedPeers.set(playerId, peer);
    (peer as Peer & { data?: PeerData }).data = { 
      playerId, 
      lobbyId: null, 
      isSpectator: false,
      reconnectToken
    }

    console.log(`[WebSocket] Player ${playerId} connected (browsing)`)
    
    // Send initial connection info with lobby list
    peer.send(JSON.stringify({
      type: 'connected',
      payload: {
        playerId,
        reconnectToken,
        lobbies: getLobbyList(),
      },
    }))
  },

  message: async (peer: Peer, message: Message) => {
    const peerData = (peer as Peer & { data?: PeerData }).data
    if (!peerData?.playerId) return

    const data = JSON.parse(message.toString())
    
    // Delegate to message handlers
    await handleMessage(peer, data, {
      connectedPeers,
      gameIntervals,
      countdownIntervals,
      replayRecorders,
      reconnectionSessions,
    })
  },

  close: async (peer: Peer) => {
    const peerData = (peer as Peer & { data?: PeerData }).data
    if (!peerData?.playerId) return

    const { playerId, lobbyId, isSpectator, reconnectToken } = peerData
    
    console.log(`[WebSocket] Player ${playerId} disconnected`)
    
    // Save session for reconnection (60 second window)
    if (reconnectToken) {
      reconnectionSessions.set(reconnectToken, {
        playerId,
        lobbyId,
        isSpectator: isSpectator || false,
        lastSeen: Date.now()
      })
      
      // Clean up old sessions (over 2 minutes old)
      for (const [token, session] of reconnectionSessions.entries()) {
        if (Date.now() - session.lastSeen > 120000) {
          reconnectionSessions.delete(token)
        }
      }
    }
    
    connectedPeers.delete(playerId)
    
    // If player was in a lobby, remove them
    if (lobbyId) {
      if (isSpectator) {
        lobbyService.removeSpectatorFromLobby(lobbyId, playerId)
      } else {
        lobbyService.removePlayerFromLobby(lobbyId, playerId)
      }

      const context = lobbyService.getLobbyContext(lobbyId)
      if (context) {
        // Check if only AI players remain
        const humanPlayers = context.players.filter(p => !p.id.startsWith('ai-'))
        
        // If no human players remain (only AI + spectators, or empty), close the lobby
        if (humanPlayers.length === 0) {
          console.log(`[WebSocket] No human players left in lobby ${lobbyId}, closing...`)
          
          // Notify all spectators that lobby is closing
          if (context.spectators.length > 0) {
            for (const spectator of context.spectators) {
              const spectatorPeer = connectedPeers.get(spectator.id)
              if (spectatorPeer) {
                const spectatorPeerData = (spectatorPeer as Peer & { data?: PeerData }).data
                if (spectatorPeerData) {
                  spectatorPeerData.lobbyId = null
                  spectatorPeerData.isSpectator = false
                }
                
                sendToPeer(spectator.id, {
                  type: 'lobbyClosed',
                  payload: { 
                    message: 'All players have disconnected. Returning to lobby browser...' 
                  },
                }, connectedPeers)
                
                // Send them back to lobby browser
                sendToPeer(spectator.id, {
                  type: 'connected',
                  payload: {
                    playerId: spectator.id,
                    reconnectToken: spectatorPeerData?.reconnectToken || '',
                    lobbies: getLobbyList(),
                  },
                }, connectedPeers)
              }
            }
          }
          
          // Stop game interval if running
          const interval = gameIntervals.get(lobbyId)
          if (interval) {
            clearInterval(interval)
            gameIntervals.delete(lobbyId)
          }
          
          // Clean up replay recorder if exists (lobby closing, replay not saved)
          if (replayRecorders.has(lobbyId)) {
            console.log(`[Replay] Cleaning up unsaved recorder for lobby ${lobbyId} (player disconnect)`)
            replayRecorders.delete(lobbyId)
          }
          
          lobbyService.closeLobby(lobbyId)
          // Broadcast updated lobby list to all browsing players
          broadcastLobbyList(connectedPeers)
        } else {
          // Human players remain, broadcast updated lobby state
          broadcastLobbyState(lobbyId, connectedPeers)
        }
      }
    }
  },
})
