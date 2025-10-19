<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerSettings, AVATAR_OPTIONS } from '~/composables/usePlayerSettings'
// Note: All components are auto-imported by Nuxt
// LobbyPanel, LobbyBrowser, CreateLobbyDialog, ReplayBrowser, ReplayPlayer, VirtualDPad, WelcomeScreen

interface PowerUp {
  x: number;
  y: number;
  type: 'speed' | 'shield' | 'trailEraser';
}

interface Player {
  id: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
  color: string;
  trail: string[];
  isReady: boolean;
  name: string;
  speed: number;
  speedBoostUntil: number | null;
  isBraking: boolean;
  brakeStartTime: number | null;
  gameId: string;
  hasShield: boolean;
  hasTrailEraser: boolean;
}

interface LobbySettings {
  isPrivate: boolean;
  gridSize: number;
  maxPlayers: number;
  allowSpectators: boolean;
  enableAI?: boolean;
  aiPlayerCount?: number;
}

interface LobbyState {
  lobbyId: string;
  state: string;
  players: Array<{
    id: string;
    name: string;
    color: string;
    isReady: boolean;
  }>;
  spectators?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  settings: LobbySettings;
  hostId: string | null;
  countdownRemaining: number | null;
  roundNumber: number;
}

// Lobby info interface (used for type checking)
interface _LobbyInfo {
  lobbyId: string;
  playerCount: number;
  maxPlayers: number;
  gridSize: number;
  isPrivate: boolean;
  hostName: string;
  state: string;
}

// Player settings
const { settings: playerSettings, isConfigured, loadSettings, saveSettings } = usePlayerSettings()

// Game audio
const { playGameOverSound } = useGameAudio()

// UI State
const showWelcome = ref(false)
const showNameDialog = ref(false)
const showBrowser = ref(false)
const showLobby = ref(false)
const showCreateDialog = ref(false)
const showDebug = ref(false)
const showReplayBrowser = ref(false)
const showReplayPlayer = ref(false)
const replayAvailable = ref(false)
const savingReplay = ref(false)
const replaySavedMessage = ref<string | null>(null)

// WebSocket
const ws = ref<WebSocket | null>(null)
const playerId = ref<string | null>(null)
const lobbyId = ref<string | null>(null)
const reconnectToken = ref<string | null>(null)
const isSpectator = ref(false)
const isReconnecting = ref(false)
const reconnectAttempts = ref(0)

// Game state
const gamePlayers = ref<Player[]>([])
const currentGridSize = ref(20)
const gameState = ref<'waiting' | 'starting' | 'playing' | 'finished'>('waiting')
const countdown = ref<number | null>(null)
const isReady = ref(false)
const lobbyState = ref<LobbyState | null>(null)
const crashedPlayers = ref<string[]>([])
const winner = ref<{ id: string; color: string } | null>(null)
const powerUps = ref<PowerUp[]>([])
const obstacles = ref<string[]>([])

// Canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
const cellSize = 20

// Performance optimizations - canvas caching
let gridCanvas: HTMLCanvasElement | null = null
let gridCtx: CanvasRenderingContext2D | null = null
let cachedGridSize = 0

// Current player (for boost status display)
const currentPlayer = computed(() => {
  return gamePlayers.value.find(p => p.id === playerId.value)
})

// Reactive time for boost timers (updates every 100ms when playing)
const currentTime = ref(Date.now())
let timeUpdateInterval: NodeJS.Timeout | null = null

const hasAnyBoost = computed(() => {
  const player = currentPlayer.value
  if (!player) return false
  
  const hasSpeed = player.speedBoostUntil && currentTime.value < player.speedBoostUntil
  return hasSpeed || player.hasShield || player.hasTrailEraser
})

// Controls
const isBraking = ref(false)
const currentDirection = ref<string>('')

// Lobby browser - using component instance type
const lobbyBrowser = ref<{ updateLobbies: (lobbies: unknown[]) => void } | null>(null)

// Replay system
interface ReplayData {
  metadata: {
    replayId: string;
    lobbyName: string;
    createdAt: number;
    duration: number;
    totalTicks: number;
    winner: {
      playerId: string;
      name: string;
      color: string;
    } | null;
    playerCount: number;
    gridSize: number;
  };
  initialState: {
    gridSize: number;
    players: Array<{
      id: string;
      name: string;
      color: string;
      avatar: string;
      x: number;
      y: number;
      direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
      isAI: boolean;
    }>;
    obstacles: Array<{ x: number; y: number }>;
    settings: {
      maxPlayers: number;
      tickRate: number;
      maxPowerUps: number;
    };
  };
  actions: Array<{
    tick: number;
    playerId: string;
    action: 'move' | 'brake';
    payload: unknown;
    timestamp: number;
  }>;
  events: Array<{
    tick: number;
    type: string;
    payload: unknown;
    timestamp: number;
  }>;
}

const currentReplayData = ref<ReplayData | null>(null)

// Temporary name/color for dialog
const tempName = ref('')
const tempColor = ref('hsl(180, 90%, 60%)')
const tempColorHex = ref('#00ffff')
const tempAvatar = ref('recognizer')

// YouTube player
interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
}

interface YouTubeEvent {
  target: YouTubePlayer;
  data: number;
}

const youtubePlayer = ref<YouTubePlayer | null>(null)
const isYoutubePlaying = ref(false)

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const hexToHSL = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  
  const r = parseInt(result[1] || '0', 16) / 255
  const g = parseInt(result[2] || '0', 16) / 255
  const b = parseInt(result[3] || '0', 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

const generateRandomColor = () => {
  const hue = Math.floor(Math.random() * 360)
  const saturation = Math.floor(Math.random() * 20) + 80
  const lightness = Math.floor(Math.random() * 20) + 50
  const hsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  const hex = hslToHex(hue, saturation, lightness)
  return { hsl, hex }
}

const savePlayerSettings = () => {
  if (!tempName.value.trim()) return
  
  saveSettings({
    name: tempName.value.trim(),
    color: tempColor.value,
    colorHex: tempColorHex.value,
    avatar: tempAvatar.value,
  })
  
  showNameDialog.value = false
  
  // Show welcome screen only on first-time setup
  const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome')
  if (!hasSeenWelcome) {
    showWelcome.value = true
  } else {
    connectWebSocket()
  }
}

const handleWelcomeContinue = () => {
  showWelcome.value = false
  sessionStorage.setItem('hasSeenWelcome', 'true')
  connectWebSocket()
}

const changePlayerSettings = () => {
  showBrowser.value = false
  showNameDialog.value = true
  tempName.value = playerSettings.value.name || ''
  tempColor.value = playerSettings.value.color || 'hsl(180, 90%, 60%)'
  tempColorHex.value = playerSettings.value.colorHex || '#00ffff'
  tempAvatar.value = playerSettings.value.avatar || 'recognizer'
}

const handleColorSquareClick = () => {
  if (typeof window !== 'undefined') {
    const input = window.document.querySelector('.hidden-color-input') as HTMLInputElement
    input?.click()
  }
}

const connectWebSocket = () => {
  if (ws.value) {
    ws.value.close()
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/_ws`
  const socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    console.log('WebSocket connected')
    ws.value = socket
    
    // Try to reconnect if we have a token
    if (reconnectToken.value && isReconnecting.value) {
      console.log('[Reconnection] Attempting to restore session...')
      socket.send(JSON.stringify({
        type: 'reconnect',
        payload: { reconnectToken: reconnectToken.value },
      }))
    }
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      // Uncomment for debugging: console.log('Received:', data.type);

      switch (data.type) {
        case 'connected': {
          playerId.value = data.payload.playerId
          reconnectToken.value = data.payload.reconnectToken
          isReconnecting.value = false
          reconnectAttempts.value = 0
          
          // Send persistent userId to server immediately after connection
          const userId = playerSettings.value.userId
          if (userId && socket.readyState === WebSocket.OPEN) {
            console.log('[UserID] Sending persistent userId to server:', userId)
            socket.send(JSON.stringify({
              type: 'setUserId',
              payload: { userId },
            }))
          }
          
          // Save reconnection token to localStorage
          if (reconnectToken.value) {
            localStorage.setItem('reconnectToken', reconnectToken.value)
          }
          
          if (lobbyBrowser.value) {
            lobbyBrowser.value.updateLobbies(data.payload.lobbies)
          }
          showBrowser.value = true
          break
        }

        case 'reconnected': {
          console.log('[Reconnection] Successfully restored session')
          playerId.value = data.payload.playerId
          lobbyId.value = data.payload.lobbyId
          isSpectator.value = data.payload.isSpectator
          isReconnecting.value = false
          reconnectAttempts.value = 0
          
          // Show appropriate UI based on state
          if (lobbyId.value) {
            showBrowser.value = false
            showLobby.value = true
          } else {
            showBrowser.value = true
          }
          break
        }

        case 'lobbyList': {
          if (lobbyBrowser.value) {
            lobbyBrowser.value.updateLobbies(data.payload.lobbies)
          }
          break
        }

        case 'lobbyJoined': {
          lobbyId.value = data.payload.lobbyId
          currentGridSize.value = data.payload.gridSize
          isSpectator.value = data.payload.isSpectator || false
          showBrowser.value = false
          showCreateDialog.value = false
          
          if (canvasRef.value) {
            canvasRef.value.width = currentGridSize.value * cellSize
            canvasRef.value.height = currentGridSize.value * cellSize
            if (ctx) {
              ctx.imageSmoothingEnabled = false
            }
          }
          break
        }

        case 'lobbyState': {
          lobbyState.value = data.payload
          
          if (data.payload.state === 'starting') {
            gameState.value = 'starting'
            showLobby.value = true // Keep lobby visible to show countdown
            
            // Initialize canvas if not already done
            if (canvasRef.value && currentGridSize.value > 0) {
              canvasRef.value.width = currentGridSize.value * cellSize
              canvasRef.value.height = currentGridSize.value * cellSize
              if (ctx) {
                ctx.imageSmoothingEnabled = false
              }
              // Draw empty game board during countdown
              drawGame()
            }
          } else if (data.payload.state === 'inGame') {
            gameState.value = 'playing'
            showLobby.value = false
            
            // Close any replay overlays when game starts
            showReplayBrowser.value = false
            showReplayPlayer.value = false
            
            // Start time update interval for boost timers
            if (timeUpdateInterval) clearInterval(timeUpdateInterval)
            timeUpdateInterval = setInterval(() => {
              currentTime.value = Date.now()
            }, 100)
            
            // Make sure canvas is properly sized when game starts
            if (canvasRef.value && currentGridSize.value > 0) {
              canvasRef.value.width = currentGridSize.value * cellSize
              canvasRef.value.height = currentGridSize.value * cellSize
              if (ctx) {
                ctx.imageSmoothingEnabled = false
              }
              
              // Pre-generate grid cache to avoid first-frame delay
              createGridCache(currentGridSize.value)
              
              // Don't call drawGame() here - wait for first gameState message with player data
            }
          } else if (data.payload.state === 'waiting') {
            gameState.value = 'waiting'
            showLobby.value = true
            
            // Stop time update interval when not playing
            if (timeUpdateInterval) {
              clearInterval(timeUpdateInterval)
              timeUpdateInterval = null
            }
          }
          
          // Update ready state
          const currentPlayerInLobby = data.payload.players.find((p: { id: string }) => p.id === playerId.value)
          if (currentPlayerInLobby) {
            isReady.value = currentPlayerInLobby.isReady
          }
          break
        }

        case 'gameState': {
          const state = data.payload
          
          gameState.value = state.gameState
          currentGridSize.value = state.gridSize
          powerUps.value = state.powerUps
          obstacles.value = state.obstacles
          
          gamePlayers.value = state.players.map((p: Player) => {
            const isNewlyCrashed = p.direction === 'crashed' && !crashedPlayers.value.includes(p.id)
            if (isNewlyCrashed) {
              crashedPlayers.value.push(p.id)
            }

            if (p.id === playerId.value) {
              currentDirection.value = p.direction
            }

            return { 
              ...p, 
              trail: p.trail || [],
              hasShield: p.hasShield || false,
              hasTrailEraser: p.hasTrailEraser || false,
            }
          })

          drawGame()
          break
        }

        case 'gameStateDelta': {
          // Handle delta updates for performance
          const delta = data.payload as {
            isDelta: boolean;
            players: Array<{
              id: string;
              x: number;
              y: number;
              direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
              trailDelta: string[];
              speed: number;
              speedBoostUntil: number | null;
              isBraking: boolean;
              hasShield: boolean;
              hasTrailEraser: boolean;
            }>;
            powerUps?: PowerUp[];
          }
          
          // Update player positions and append trail deltas
          gamePlayers.value = gamePlayers.value.map(player => {
            const deltaPlayer = delta.players.find(p => p.id === player.id)
            if (!deltaPlayer) return player
            
            const isNewlyCrashed = deltaPlayer.direction === 'crashed' && !crashedPlayers.value.includes(player.id)
            if (isNewlyCrashed) {
              crashedPlayers.value.push(player.id)
            }

            if (player.id === playerId.value) {
              currentDirection.value = deltaPlayer.direction
            }

            // Append new trail segments to existing trail
            const updatedTrail = [...player.trail, ...(deltaPlayer.trailDelta || [])]
            
            return {
              ...player,
              x: deltaPlayer.x,
              y: deltaPlayer.y,
              direction: deltaPlayer.direction,
              trail: updatedTrail,
              speed: deltaPlayer.speed,
              speedBoostUntil: deltaPlayer.speedBoostUntil,
              isBraking: deltaPlayer.isBraking,
              hasShield: deltaPlayer.hasShield || false,
              hasTrailEraser: deltaPlayer.hasTrailEraser || false,
            }
          })

          // Update power-ups if included in delta
          if (delta.powerUps) {
            powerUps.value = delta.powerUps
          }

          drawGame()
          break
        }

        case 'countdown':
          countdown.value = data.payload.count
          gameState.value = 'starting'
          showLobby.value = false
          drawGame()
          break

        case 'playerCrashed': {
          const crashedPlayerId = data.payload.playerId
          const crashedPlayer = gamePlayers.value.find(p => p.id === crashedPlayerId)
          if (crashedPlayer) {
            crashedPlayer.direction = 'crashed'
            crashedPlayers.value.push(crashedPlayerId)
          }
          drawGame()
          break
        }

        case 'gameOver':
          console.log('[Client] Game Over received:', data.payload)
          if (data.payload.draw) {
            winner.value = null
          } else {
            winner.value = {
              id: data.payload.winner,
              color: data.payload.winnerColor
            }
          }
          gameState.value = 'finished'
          isReady.value = false
          countdown.value = null
          showLobby.value = false // Hide lobby panel so game over screen shows
          replayAvailable.value = data.payload.replayAvailable || false
          console.log('[Client] Game state set to finished')
          console.log('[Client] Replay available:', replayAvailable.value)
          console.log('[Client] Is spectator:', isSpectator.value)
          console.log('[Client] Winner:', winner.value)
          
          // Play game over sound
          playGameOverSound()
          
          drawGame()
          break

        case 'replaySaved':
          console.log('[Client] Replay saved:', data.payload)
          savingReplay.value = false
          replayAvailable.value = false
          // Show success message
          replaySavedMessage.value = data.payload.message || 'Replay saved successfully!'
          // Auto-hide after 3 seconds
          setTimeout(() => {
            replaySavedMessage.value = null
          }, 3000)
          break

        case 'replayData':
          console.log('[Client] Replay data received')
          currentReplayData.value = data.payload.replay
          showReplayBrowser.value = false
          showReplayPlayer.value = true
          break

        case 'lobbyClosed': {
          console.log('[Lobby] Lobby closed:', data.payload.message)
          
          // Reset state
          lobbyId.value = null
          isSpectator.value = false
          lobbyState.value = null
          gameState.value = 'waiting'
          showLobby.value = false
          showBrowser.value = true
          
          // Show notification to user
          alert(data.payload.message || 'Lobby has been closed.')
          break
        }

        case 'kicked': {
          console.log('[Lobby] You have been kicked:', data.payload.message)
          
          // Reset state
          lobbyId.value = null
          isSpectator.value = false
          lobbyState.value = null
          gameState.value = 'waiting'
          showLobby.value = false
          showBrowser.value = true
          isReady.value = false
          
          // Show notification to user
          alert(data.payload.message || 'You have been kicked from the lobby.')
          break
        }

        case 'banned': {
          console.log('[Lobby] You have been banned:', data.payload.message)
          
          // Reset state
          lobbyId.value = null
          isSpectator.value = false
          lobbyState.value = null
          gameState.value = 'waiting'
          showLobby.value = false
          showBrowser.value = true
          isReady.value = false
          
          // Show notification to user
          alert(data.payload.message || 'You have been banned from the lobby.')
          break
        }

        case 'error':
          console.error('Server error:', data.payload.message)
          break
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  }

  socket.onclose = () => {
    console.log('WebSocket disconnected')
    ws.value = null
    
    // Attempt reconnection
    if (reconnectToken.value && reconnectAttempts.value < 5) {
      isReconnecting.value = true
      reconnectAttempts.value++
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value - 1), 10000)
      console.log(`[Reconnection] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.value}/5)`)
      setTimeout(connectWebSocket, delay)
    } else {
      // Failed to reconnect or no token, start fresh
      gameState.value = 'waiting'
      showBrowser.value = false
      lobbyId.value = null
      isSpectator.value = false
      isReconnecting.value = false
      reconnectAttempts.value = 0
      setTimeout(connectWebSocket, 3000)
    }
  }

  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
}

// Request lobby list (for future use with manual refresh)
const _requestLobbyList = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  ws.value.send(JSON.stringify({
    type: 'getLobbyList',
    payload: {},
  }))
}

const handleJoinLobby = (targetLobbyId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  // Close replay browser when joining a lobby
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  
  ws.value.send(JSON.stringify({
    type: 'joinLobby',
    payload: {
      lobbyId: targetLobbyId,
      playerName: playerSettings.value.name,
      playerColor: playerSettings.value.color,
    },
  }))
}

const handleSpectateGame = (targetLobbyId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  // Close replay browser when spectating
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  
  ws.value.send(JSON.stringify({
    type: 'joinLobbyAsSpectator',
    payload: {
      lobbyId: targetLobbyId,
      playerName: playerSettings.value.name,
      playerColor: playerSettings.value.color,
    },
  }))
}

const handleCreateLobby = (settings: LobbySettings) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  // Close replay browser when creating a lobby
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  
  ws.value.send(JSON.stringify({
    type: 'createLobby',
    payload: {
      settings,
      playerName: playerSettings.value.name,
      playerColor: playerSettings.value.color,
    },
  }))
}

const toggleReady = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !playerId.value) return

  const newReadyState = !isReady.value
  isReady.value = newReadyState
  
  ws.value.send(JSON.stringify({
    type: 'ready',
    payload: { ready: newReadyState }
  }))
}

const updateLobbySettings = (settings: Partial<LobbySettings>) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

  ws.value.send(JSON.stringify({
    type: 'updateSettings',
    payload: { settings }
  }))
}

const kickPlayer = (targetPlayerId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

  ws.value.send(JSON.stringify({
    type: 'kickPlayer',
    payload: { targetPlayerId }
  }))
}

const banPlayer = (targetPlayerId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

  ws.value.send(JSON.stringify({
    type: 'banPlayer',
    payload: { targetPlayerId }
  }))
}

const addAIBot = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

  ws.value.send(JSON.stringify({
    type: 'addAIBot',
    payload: {}
  }))
}

const removeAIBot = (botId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

  ws.value.send(JSON.stringify({
    type: 'removeAIBot',
    payload: { botId }
  }))
}

const handlePlayAgain = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  // Reset game state
  gameState.value = 'waiting'
  winner.value = null
  crashedPlayers.value = []
  gamePlayers.value = []
  isReady.value = false
  countdown.value = null
  
  // Show lobby panel again
  showLobby.value = true
  
  // Tell server to return lobby to waiting state (will auto-ready AI)
  ws.value.send(JSON.stringify({
    type: 'returnToLobby',
    payload: {}
  }))
}

const handleSaveReplay = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !replayAvailable.value) return
  
  savingReplay.value = true
  ws.value.send(JSON.stringify({
    type: 'saveReplay',
  }))
}

const handleOpenReplayBrowser = () => {
  // Ensure WebSocket connection is established
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    console.log('[Replay] No WebSocket connection, establishing one...')
    connectWebSocket()
    // Wait a bit for connection to establish, then open replay browser
    setTimeout(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        console.log('[Replay] Connection established, opening replay browser')
        showReplayBrowser.value = true
        // ReplayBrowser component will request replays on mount
      } else {
        console.error('[Replay] Failed to establish WebSocket connection')
        alert('Could not connect to server. Please try again.')
      }
    }, 500)
    return
  }
  
  console.log('[Replay] Opening replay browser')
  showReplayBrowser.value = true
  // ReplayBrowser component will request replays on mount
}

const handleWatchReplay = (replayId: string) => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  ws.value.send(JSON.stringify({
    type: 'loadReplay',
    payload: { replayId },
  }))
}

const handleCloseReplayBrowser = () => {
  showReplayBrowser.value = false
}

const handleCloseReplayPlayer = () => {
  showReplayPlayer.value = false
  currentReplayData.value = null
}

const handleQuitToLobby = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  
  // Send leave lobby message
  ws.value.send(JSON.stringify({
    type: 'leaveLobby',
    payload: {}
  }))
  
  // Reset all state
  gameState.value = 'waiting'
  winner.value = null
  crashedPlayers.value = []
  gamePlayers.value = []
  isReady.value = false
  countdown.value = null
  lobbyId.value = null
  lobbyState.value = null
  
  // Show lobby browser
  showLobby.value = false
  showBrowser.value = true
}

// Handle virtual D-pad direction input (for mobile)
const handleDPadDirection = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (gameState.value !== 'playing') return

  const isOpposite = (
    (currentDirection.value === 'up' && direction === 'down') ||
    (currentDirection.value === 'down' && direction === 'up') ||
    (currentDirection.value === 'left' && direction === 'right') ||
    (currentDirection.value === 'right' && direction === 'left')
  )

  if (isOpposite) {
    // Don't allow opposite direction, but don't brake either
    return
  } else {
    currentDirection.value = direction
    ws.value?.send(JSON.stringify({
      type: 'move',
      payload: { direction }
    }))
  }
}

// Handle virtual D-pad brake input (for mobile)
const handleDPadBrake = (braking: boolean) => {
  if (gameState.value !== 'playing') return

  isBraking.value = braking
  ws.value?.send(JSON.stringify({
    type: 'brake',
    payload: { braking }
  }))
}

const setupKeyboardListeners = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState.value !== 'playing') return

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
    }

    let newDirection = ''
    switch (e.key) {
      case 'ArrowUp': newDirection = 'up'; break
      case 'ArrowDown': newDirection = 'down'; break
      case 'ArrowLeft': newDirection = 'left'; break
      case 'ArrowRight': newDirection = 'right'; break
    }

    if (newDirection) {
      const isOpposite = (
        (currentDirection.value === 'up' && newDirection === 'down') ||
        (currentDirection.value === 'down' && newDirection === 'up') ||
        (currentDirection.value === 'left' && newDirection === 'right') ||
        (currentDirection.value === 'right' && newDirection === 'left')
      )

      if (isOpposite) {
        isBraking.value = true
        ws.value?.send(JSON.stringify({
          type: 'brake',
          payload: { braking: true }
        }))
      } else {
        currentDirection.value = newDirection
        ws.value?.send(JSON.stringify({
          type: 'move',
          payload: { direction: newDirection }
        }))
      }
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (gameState.value !== 'playing') return

    let direction = ''
    switch (e.key) {
      case 'ArrowUp': direction = 'up'; break
      case 'ArrowDown': direction = 'down'; break
      case 'ArrowLeft': direction = 'left'; break
      case 'ArrowRight': direction = 'right'; break
    }

    if (direction && isBraking.value) {
      const isOpposite = (
        (currentDirection.value === 'up' && direction === 'down') ||
        (currentDirection.value === 'down' && direction === 'up') ||
        (currentDirection.value === 'left' && direction === 'right') ||
        (currentDirection.value === 'right' && direction === 'left')
      )

      if (isOpposite) {
        isBraking.value = false
        ws.value?.send(JSON.stringify({
          type: 'brake',
          payload: { braking: false }
        }))
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  }
}

const getTrailColor = (color: string | undefined) => {
  if (!color) return '#ffffff66'
  
  if (color.startsWith('hsl')) {
    const matches = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (matches && matches.length >= 4) {
      const h = parseInt(matches[1] || '0')
      const s = parseInt(matches[2] || '0')
      const l = parseInt(matches[3] || '0')
      if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
        return `hsla(${h}, ${s}%, ${Math.min(l + 20, 90)}%, 0.4)`
      }
    }
  }
  return `${color}66`
}

// Create or update cached grid canvas
const createGridCache = (gridSize: number) => {
  const size = gridSize * cellSize
  
  // Create offscreen canvas if needed
  if (!gridCanvas) {
    gridCanvas = document.createElement('canvas')
    gridCtx = gridCanvas.getContext('2d', { alpha: false })
  }
  
  if (!gridCtx) return
  
  // Resize if needed
  if (gridCanvas.width !== size || gridCanvas.height !== size) {
    gridCanvas.width = size
    gridCanvas.height = size
  }
  
  // Draw grid to offscreen canvas
  gridCtx.fillStyle = '#000'
  gridCtx.fillRect(0, 0, size, size)
  
  gridCtx.strokeStyle = '#333'
  gridCtx.lineWidth = 0.5
  
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellSize
    gridCtx.beginPath()
    gridCtx.moveTo(pos, 0)
    gridCtx.lineTo(pos, size)
    gridCtx.stroke()
    
    gridCtx.beginPath()
    gridCtx.moveTo(0, pos)
    gridCtx.lineTo(size, pos)
    gridCtx.stroke()
  }
  
  cachedGridSize = gridSize
}

const drawGame = () => {
  const canvasEl = canvasRef.value
  
  if (!canvasEl) {
    console.error('[drawGame] No canvas element')
    return
  }
  
  // ALWAYS get a fresh context - hydration issue workaround
  ctx = canvasEl.getContext('2d', { 
    alpha: false,
    willReadFrequently: false 
  })
  if (!ctx) {
    console.error('[drawGame] Failed to get canvas context')
    return
  }
  ctx.imageSmoothingEnabled = false

  // Only update canvas dimensions if they actually changed
  const size = currentGridSize.value * cellSize
  if (canvasEl.width !== size || canvasEl.height !== size) {
    canvasEl.width = size
    canvasEl.height = size
    // Re-apply context settings after resize
    if (ctx) {
      ctx.imageSmoothingEnabled = false
    }
  }
  
  // Draw cached grid background (performance optimization)
  if (gridCanvas && cachedGridSize === currentGridSize.value) {
    // Use cached grid
    ctx.drawImage(gridCanvas, 0, 0)
  } else {
    // Cache not ready or size changed - regenerate
    if (cachedGridSize !== currentGridSize.value) {
      createGridCache(currentGridSize.value)
    }
    if (gridCanvas) {
      ctx.drawImage(gridCanvas, 0, 0)
    } else {
      // Extreme fallback
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    }
  }
  
  // Null check for context (safety)
  if (!ctx) return

  // Draw obstacles first (static)
  ctx.fillStyle = '#444'
  obstacles.value.forEach(pos => {
    const coords = pos.split(',').map(Number)
    if (coords.length === 2 && !coords.some(isNaN) && coords[0] !== undefined && coords[1] !== undefined) {
      ctx.fillRect(coords[0] * cellSize, coords[1] * cellSize, cellSize, cellSize)
    }
  })

  // Draw trails using Path2D for better performance
  gamePlayers.value.forEach(player => {
    if (player.trail.length === 0) return
    
    const trailColor = getTrailColor(player.color)
    ctx.fillStyle = trailColor
    
    // Use Path2D to batch all trail segments
    const trailPath = new Path2D()
    player.trail.forEach(pos => {
      const coords = pos.split(',').map(Number)
      if (coords.length === 2 && !coords.some(isNaN) && coords[0] !== undefined && coords[1] !== undefined) {
        trailPath.rect(coords[0] * cellSize, coords[1] * cellSize, cellSize, cellSize)
      }
    })
    
    // Single fill operation for entire trail
    ctx.fill(trailPath)

    // Visual effects for player state
    if (player.speedBoostUntil && Date.now() < player.speedBoostUntil) {
      ctx.shadowColor = '#ffff00'
      ctx.shadowBlur = 20
    }

    if (player.isBraking && player.brakeStartTime) {
      const brakeDuration = (Date.now() - player.brakeStartTime) / 1000
      const brakeIntensity = Math.min(1, brakeDuration * 0.2)
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 15 + (10 * brakeIntensity)
    }
    
    if (player.hasShield) {
      ctx.shadowColor = '#00ccff'
      ctx.shadowBlur = 25
    }
    
    if (player.hasTrailEraser) {
      ctx.shadowColor = '#ff00ff'
      ctx.shadowBlur = 20
    }

    if (typeof player.x === 'number' && typeof player.y === 'number' && player.color) {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x * cellSize, player.y * cellSize, cellSize, cellSize)

      const center = {
        x: player.x * cellSize + cellSize / 2,
        y: player.y * cellSize + cellSize / 2
      }
      
      ctx.fillStyle = '#000'
      ctx.beginPath()
      switch (player.direction) {
        case 'up':
          ctx.moveTo(center.x, center.y - cellSize / 3)
          ctx.lineTo(center.x - cellSize / 4, center.y)
          ctx.lineTo(center.x + cellSize / 4, center.y)
          break
        case 'down':
          ctx.moveTo(center.x, center.y + cellSize / 3)
          ctx.lineTo(center.x - cellSize / 4, center.y)
          ctx.lineTo(center.x + cellSize / 4, center.y)
          break
        case 'left':
          ctx.moveTo(center.x - cellSize / 3, center.y)
          ctx.lineTo(center.x, center.y - cellSize / 4)
          ctx.lineTo(center.x, center.y + cellSize / 4)
          break
        case 'right':
          ctx.moveTo(center.x + cellSize / 3, center.y)
          ctx.lineTo(center.x, center.y - cellSize / 4)
          ctx.lineTo(center.x, center.y + cellSize / 4)
          break
      }
      ctx.closePath()
      ctx.fill()

      ctx.shadowBlur = 0

      if (player.name) {
        ctx.fillStyle = '#fff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        const nameText = player.name + (player.id === playerId.value ? ' (You)' : '')
        ctx.fillText(
          nameText,
          player.x * cellSize + cellSize / 2,
          player.y * cellSize - 5
        )
        
        // Draw power-up indicators next to name
        const nameWidth = ctx.measureText(nameText).width
        let iconOffset = nameWidth / 2 + 8
        
        if (player.hasShield) {
          ctx.fillStyle = '#00ccff'
          ctx.font = 'bold 10px sans-serif'
          ctx.fillText('🛡', player.x * cellSize + cellSize / 2 + iconOffset, player.y * cellSize - 5)
          iconOffset += 12
        }
        
        if (player.hasTrailEraser) {
          ctx.fillStyle = '#ff00ff'
          ctx.font = 'bold 10px sans-serif'
          ctx.fillText('✨', player.x * cellSize + cellSize / 2 + iconOffset, player.y * cellSize - 5)
        }
      }
    }
  })

  // Draw power-ups
  powerUps.value.forEach(powerUp => {
    if (typeof powerUp.x === 'number' && typeof powerUp.y === 'number') {
      const x = powerUp.x * cellSize
      const y = powerUp.y * cellSize
      const centerX = x + cellSize / 2
      const centerY = y + cellSize / 2

      // Different colors and icons for different power-up types
      if (powerUp.type === 'speed') {
        // Yellow lightning bolt
        ctx.shadowColor = '#ffff00'
        ctx.shadowBlur = 15
        ctx.fillStyle = '#ffff00'
        ctx.beginPath()
        ctx.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.moveTo(centerX, y + cellSize/4)
        ctx.lineTo(x + cellSize/3, centerY)
        ctx.lineTo(centerX, centerY)
        ctx.lineTo(x + cellSize/3, y + 3*cellSize/4)
        ctx.lineTo(x + 2*cellSize/3, centerY)
        ctx.lineTo(centerX, centerY)
        ctx.lineTo(x + 2*cellSize/3, y + cellSize/4)
        ctx.closePath()
        ctx.fill()
      } else if (powerUp.type === 'shield') {
        // Blue shield
        ctx.shadowColor = '#00ccff'
        ctx.shadowBlur = 15
        ctx.fillStyle = '#00ccff'
        ctx.beginPath()
        ctx.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.fillStyle = '#000'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        
        // Shield shape
        ctx.beginPath()
        ctx.moveTo(centerX, y + cellSize/4)
        ctx.lineTo(x + 2*cellSize/3, y + cellSize/3)
        ctx.lineTo(x + 2*cellSize/3, centerY + cellSize/8)
        ctx.lineTo(centerX, y + 3*cellSize/4)
        ctx.lineTo(x + cellSize/3, centerY + cellSize/8)
        ctx.lineTo(x + cellSize/3, y + cellSize/3)
        ctx.closePath()
        ctx.stroke()
      } else if (powerUp.type === 'trailEraser') {
        // Purple eraser
        ctx.shadowColor = '#ff00ff'
        ctx.shadowBlur = 15
        ctx.fillStyle = '#ff00ff'
        ctx.beginPath()
        ctx.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.fillStyle = '#000'
        
        // Eraser icon (X shape)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x + cellSize/3, y + cellSize/3)
        ctx.lineTo(x + 2*cellSize/3, y + 2*cellSize/3)
        ctx.moveTo(x + 2*cellSize/3, y + cellSize/3)
        ctx.lineTo(x + cellSize/3, y + 2*cellSize/3)
        ctx.stroke()
      }
    }
  })
  
  // Request next frame for continuous rendering
  if (gameState.value === 'playing') {
    requestAnimationFrame(drawGame)
  }
}

const toggleYoutube = () => {
  if (!youtubePlayer.value) return
  
  if (isYoutubePlaying.value) {
    youtubePlayer.value.pauseVideo()
  } else {
    youtubePlayer.value.playVideo()
  }
}

// Lifecycle hooks - properly separated
let keyboardCleanup: (() => void) | null = null

onMounted(() => {
  // Load player settings
  loadSettings()
  
  if (!isConfigured.value) {
    // Generate random color for first-time users
    const color = generateRandomColor()
    tempColor.value = color.hsl
    tempColorHex.value = color.hex
    showNameDialog.value = true
  } else {
    // Use saved settings
    tempName.value = playerSettings.value.name || ''
    tempColor.value = playerSettings.value.color || 'hsl(180, 90%, 60%)'
    tempColorHex.value = playerSettings.value.colorHex || '#00ffff'
    
    // Check if we should show welcome screen (only once per session for returning users)
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome')
    if (!hasSeenWelcome) {
      showWelcome.value = true
    } else {
      connectWebSocket()
    }
  }

  // Setup keyboard listeners
  keyboardCleanup = setupKeyboardListeners()

  // Initialize canvas
  nextTick(() => {
    if (canvasRef.value) {
      // Always set a minimum size
      const size = currentGridSize.value > 0 ? currentGridSize.value * cellSize : 800
      canvasRef.value.width = size
      canvasRef.value.height = size
      ctx = canvasRef.value.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
      }
    }
  })

  // Initialize YouTube
  if (import.meta.client) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    if (firstScriptTag?.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    (window as { onYouTubeIframeAPIReady?: () => void; YT?: { Player: new (id: string, config: unknown) => YouTubePlayer } }).onYouTubeIframeAPIReady = () => {
    const YT = (window as { YT?: { Player: new (id: string, config: unknown) => YouTubePlayer } }).YT
    if (!YT) return
    youtubePlayer.value = new YT.Player('youtubePlayer', {
      videoId: 'TAutddyBrOg',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        showinfo: 0,
        loop: 1,
        playlist: 'TAutddyBrOg',
        start: 20
      },
      events: {
        onReady: (event: YouTubeEvent) => {
          event.target.setVolume(30)
        },
        onStateChange: (event: YouTubeEvent) => {
          isYoutubePlaying.value = event.data === 1
        }
      }
    })
    }
  }
})

onUnmounted(() => {
  if (keyboardCleanup) {
    keyboardCleanup()
  }
  ws.value?.close()
  if (youtubePlayer.value) {
    youtubePlayer.value.pauseVideo()
  }
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})
</script>

<template>
  <div class="game-container">
    <!-- Welcome Screen -->
    <WelcomeScreen 
      v-if="showWelcome"
      @continue="handleWelcomeContinue"
    />
    
    <!-- Music controls -->
    <div v-if="!showNameDialog && !showBrowser && !showWelcome" class="music-controls">
      <button class="music-btn" @click="toggleYoutube">
        {{ isYoutubePlaying ? '🔇 Mute' : '🔊 Play Music' }}
      </button>
    </div>

    <!-- Controls info -->
    <div v-if="!showNameDialog && !showBrowser && !showWelcome && gameState === 'playing'" class="controls">
      <p>Game Controls</p>
      <div class="key-controls">
        <div class="key">↑</div>
        <div class="key-row">
          <div class="key">←</div>
          <div class="key">↓</div>
          <div class="key">→</div>
        </div>
      </div>
      <p class="instruction">Use Arrow Keys to move</p>
      <p class="instruction">Press opposite direction to brake</p>
      <p class="instruction">Collect ⚡ for speed boost</p>
      
      <!-- Boost Status Display (Below controls) -->
      <div v-if="currentPlayer" class="boost-status-inline">
        <div class="boost-title">Active Boosts</div>
        <div style="font-size: 10px; color: #666; margin: 5px 0;">
          (Speed: {{ currentPlayer.speedBoostUntil ? 'YES' : 'NO' }}, Shield: {{ currentPlayer.hasShield ? 'YES' : 'NO' }}, Eraser: {{ currentPlayer.hasTrailEraser ? 'YES' : 'NO' }})
        </div>
        <div class="boost-items">
          <!-- Speed Boost -->
          <div 
            v-if="currentPlayer.speedBoostUntil && currentPlayer.speedBoostUntil > currentTime" 
            class="boost-item speed"
          >
            <span class="boost-icon">⚡</span>
            <span class="boost-name">Speed Boost</span>
            <span class="boost-timer">{{ Math.ceil((currentPlayer.speedBoostUntil - currentTime) / 1000) }}s</span>
          </div>
          
          <!-- Shield -->
          <div v-if="currentPlayer.hasShield" class="boost-item shield">
            <span class="boost-icon">🛡</span>
            <span class="boost-name">Shield</span>
            <span class="boost-status-text">Active</span>
          </div>
          
          <!-- Trail Eraser -->
          <div v-if="currentPlayer.hasTrailEraser" class="boost-item eraser">
            <span class="boost-icon">✨</span>
            <span class="boost-name">Trail Eraser</span>
            <span class="boost-hint">Press same direction</span>
          </div>
          
          <!-- No boosts message -->
          <div v-if="!hasAnyBoost" class="no-boosts">
            No active boosts - collect power-ups!
          </div>
        </div>
      </div>
    </div>

    <!-- Name/Color Dialog -->
    <div v-if="showNameDialog" class="name-dialog">
      <div class="name-dialog-content">
        <h2>{{ isConfigured ? 'Update Settings' : 'Welcome to Circuit Breaker!' }}</h2>
        <div class="input-group">
          <label for="playerName">Your Name:</label>
          <input 
            id="playerName"
            v-model="tempName" 
            placeholder="Enter your name"
            maxlength="20"
            class="name-input"
            @keyup.enter="savePlayerSettings"
          >
        </div>
        
        <div class="input-group">
          <label>Your Avatar:</label>
          <div class="avatar-picker">
            <div 
              v-for="avatar in AVATAR_OPTIONS" 
              :key="avatar.id"
              class="avatar-option"
              :class="{ 'selected': tempAvatar === avatar.id }"
              :title="avatar.label"
              @click="tempAvatar = avatar.id"
            >
              <div class="avatar-icon" v-html="avatar.svg"/>
            </div>
          </div>
        </div>
        
        <div class="input-group">
          <label>Your Color:</label>
          <div class="color-picker">
            <input 
              v-model="tempColorHex" 
              type="color"
              class="hidden-color-input"
              @input="tempColor = hexToHSL(tempColorHex) || tempColor"
            >
            <div 
              class="color-square" 
              :style="{ backgroundColor: tempColor }"
              @click="handleColorSquareClick"
            />
            <button
class="random-color-btn" @click="() => {
              const color = generateRandomColor();
              tempColor = color.hsl;
              tempColorHex = color.hex;
            }">
              🎲 Random Color
            </button>
          </div>
        </div>
        <button class="start-btn" @click="savePlayerSettings">
          {{ isConfigured ? 'Save & Continue' : 'Continue' }}
        </button>
      </div>
    </div>

    <!-- Reconnection overlay -->
    <div v-if="isReconnecting" class="reconnection-overlay">
      <div class="reconnection-box">
        <div class="reconnection-spinner"/>
        <p class="reconnection-text">Reconnecting to server...</p>
        <p class="reconnection-attempt">Attempt {{ reconnectAttempts }} of 5</p>
      </div>
    </div>

    <!-- Lobby Browser -->
    <div v-if="showBrowser" class="lobby-browser-overlay">
      <LobbyBrowser
        ref="lobbyBrowser"
        :player-name="playerSettings.name"
        @join-lobby="handleJoinLobby"
        @spectate-game="handleSpectateGame"
        @create-lobby="showCreateDialog = true"
        @change-settings="changePlayerSettings"
        @open-replays="handleOpenReplayBrowser"
      />
    </div>

    <!-- Create Lobby Dialog -->
    <CreateLobbyDialog
      v-if="showCreateDialog"
      @create="handleCreateLobby"
      @cancel="showCreateDialog = false"
    />

    <!-- Replay Browser -->
    <div v-if="showReplayBrowser" class="replay-browser-overlay">
      <ReplayBrowser
        :ws="ws"
        @watch="handleWatchReplay"
        @close="handleCloseReplayBrowser"
      />
    </div>

    <!-- Replay Player -->
    <div v-if="showReplayPlayer" class="replay-player-overlay">
      <ReplayPlayer
        :replay-data="currentReplayData"
        @close="handleCloseReplayPlayer"
      />
    </div>

    <!-- Lobby Panel (in lobby, waiting) -->
    <div v-if="showLobby && lobbyState && gameState !== 'playing'" class="lobby-overlay">
      <div class="lobby-panel-container">
        <div v-if="isSpectator" class="spectator-badge">
          👁️ Spectating
        </div>
        <LobbyPanel
          :lobby-state="lobbyState"
          :current-player-id="playerId"
          :is-ready="isReady"
          @toggle-ready="toggleReady"
          @update-settings="updateLobbySettings"
          @leave-lobby="handleQuitToLobby"
          @kick-player="kickPlayer"
          @ban-player="banPlayer"
          @add-a-i-bot="addAIBot"
          @remove-a-i-bot="removeAIBot"
        />
      </div>
    </div>

    <!-- Countdown overlay -->
    <div v-if="gameState === 'starting' && countdown !== null" class="countdown-overlay">
      <div class="countdown">
        <p class="starting">Game starting in</p>
        <div class="countdown-number">{{ countdown }}</div>
      </div>
    </div>

    <!-- Game Over overlay -->
    <div v-if="gameState === 'finished'" class="game-over-overlay">
      <div class="game-over-box">
        <h2 class="game-over-title">End of line, man!</h2>
        <p class="game-over-message">
          <span v-if="winner" :style="{ color: winner?.color || '#0ff' }">
            {{ winner?.id === playerId ? 'You won! 🎉' : `${gamePlayers.find(p => p.id === winner?.id)?.name || 'Unknown Player'} won!` }}
          </span>
          <span v-else>Draw - Everyone crashed!</span>
        </p>
        <div class="game-over-actions">
          <button 
            v-if="replayAvailable && !isSpectator" 
            class="game-over-btn save-replay-btn" 
            :disabled="savingReplay"
            @click="handleSaveReplay"
          >
            {{ savingReplay ? '💾 Saving...' : '💾 Save Replay' }}
          </button>
          <button class="game-over-btn replay-btn" @click="handlePlayAgain">
            🔄 Play Again
          </button>
          <button class="game-over-btn quit-btn" @click="handleQuitToLobby">
            🚪 Back to Lobby Browser
          </button>
        </div>
      </div>
    </div>

    <!-- Replay Saved Notification -->
    <Transition name="fade">
      <div v-if="replaySavedMessage" class="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] bg-cyan-950/95 border-2 border-cyan-400 rounded-xl px-8 py-4 shadow-[0_0_30px_rgba(0,255,255,0.5)] backdrop-blur-sm">
        <div class="flex items-center gap-4">
          <span class="text-4xl">✅</span>
          <div>
            <p class="text-cyan-400 text-lg font-semibold m-0 [text-shadow:0_0_10px_rgba(0,255,255,0.5)]">
              {{ replaySavedMessage }}
            </p>
            <p class="text-gray-400 text-sm m-0 mt-1">
              View it in My Replays
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Debug toggle -->
    <button 
      v-if="!showNameDialog && !showBrowser && !showWelcome"
      class="debug-toggle" 
      :class="{ 'is-active': showDebug }"
      title="Toggle Debug Info"
      @click="showDebug = !showDebug"
    >
      ⚙️
    </button>

    <!-- Debug modal -->
    <Transition name="slide">
      <div v-if="showDebug" class="debug-modal">
        <div class="debug-header">
          <h3>Debug Info</h3>
          <button class="close-btn" @click="showDebug = false">×</button>
        </div>
        <div class="debug-content">
          <pre>{{ JSON.stringify({
            playerId,
            lobbyId,
            lobbyState: lobbyState?.state,
            gameState,
            countdown,
            isReady,
            showWelcome,
            showLobby,
            showBrowser,
            showNameDialog,
            canvasVisible: !showNameDialog && !showBrowser && !showWelcome
          }, null, 2) }}</pre>
        </div>
      </div>
    </Transition>

    <!-- Hidden YouTube player -->
    <div class="hidden-youtube">
      <div id="youtubePlayer"/>
    </div>

    <!-- Game canvas (only show when in a lobby or game) -->
    <div v-if="!showNameDialog && !showBrowser && !showWelcome && lobbyId" class="game-board">
      <canvas ref="canvasRef" style="border: 2px solid #0ff; background-color: #000;"/>
    </div>

    <!-- Virtual D-Pad (mobile controls) -->
    <VirtualDPad
      :is-visible="gameState === 'playing' && !isSpectator"
      @direction="handleDPadDirection"
      @brake="handleDPadBrake"
    />
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  color: #0f0;
  background-color: #111;
}

.lobby-browser-overlay,
.lobby-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  overflow-y: auto;
}

.lobby-panel-container {
  position: relative;
}

.spectator-badge {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(150, 150, 150, 0.9);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid rgba(200, 200, 200, 0.8);
  box-shadow: 0 0 15px rgba(150, 150, 150, 0.5);
  z-index: 10;
}

.reconnection-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
}

.reconnection-box {
  background: rgba(0, 20, 20, 0.95);
  border: 3px solid #0ff;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
}

.reconnection-spinner {
  width: 60px;
  height: 60px;
  border: 5px solid rgba(0, 255, 255, 0.2);
  border-top-color: #0ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.reconnection-text {
  color: #0ff;
  font-size: 20px;
  margin: 10px 0;
  font-weight: 600;
}

.reconnection-attempt {
  color: #888;
  font-size: 14px;
  margin: 5px 0;
}

.countdown-overlay,
.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  pointer-events: none;
}

.game-over-overlay {
  background: rgba(0, 0, 0, 0.85);
  pointer-events: all;
}

.game-over-box {
  background: rgba(0, 20, 20, 0.95);
  border: 3px solid #0ff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
  text-align: center;
}

.game-over-title {
  color: #0ff;
  font-size: 36px;
  margin: 0 0 20px 0;
  text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
}

.game-over-message {
  font-size: 24px;
  margin: 0 0 30px 0;
  font-weight: 600;
}

.game-over-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.game-over-btn {
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.replay-btn {
  background: #0ff;
  color: #001414;
  border-color: #0ff;
}

.replay-btn:hover {
  background: #00cccc;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.save-replay-btn {
  background: rgba(138, 43, 226, 0.3);
  color: #fff;
  border-color: rgba(138, 43, 226, 0.6);
}

.save-replay-btn:hover:not(:disabled) {
  background: rgba(138, 43, 226, 0.5);
  border-color: rgba(138, 43, 226, 0.8);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
}

.save-replay-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quit-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: #666;
}

.quit-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #999;
  transform: scale(1.05);
}

.controls {
  margin-top: 20px;
  text-align: center;
  color: #0ff;
  border: 2px solid #0ff;
  padding: 15px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  position: fixed;
  top: 70px;
  right: 60px;
  z-index: 100;
  min-width: 200px;
}

.controls p {
  margin: 8px 0;
  font-size: 14px;
}

.controls .instruction {
  color: #fff;
  opacity: 0.8;
  font-size: 12px;
  margin: 4px 0;
}

.key-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  margin: 10px 0;
}

.key-row {
  display: flex;
  gap: 5px;
}

.key {
  width: 40px;
  height: 40px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #0ff;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.9);
  padding: 30px 50px;
  border-radius: 12px;
  border: 3px solid #0ff;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
}

.starting {
  color: #ff0;
  font-size: 24px;
  margin: 0;
}

.countdown-number {
  font-size: 96px;
  font-weight: bold;
  color: #0ff;
  text-shadow: 0 0 30px #0ff;
  animation: countdownPulse 1s ease-in-out infinite;
}

@keyframes countdownPulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.music-controls {
  position: fixed;
  top: 20px;
  right: 60px;
  z-index: 100;
}

.music-btn {
  background: #0066cc;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.music-btn:hover {
  background: #0052a3;
}

.debug-toggle {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 20px;
}

.debug-toggle:hover {
  background: rgba(0, 255, 255, 0.2);
}

.debug-toggle.is-active {
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.debug-modal {
  position: fixed;
  top: 60px;
  right: 10px;
  width: 300px;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #0ff;
  border-radius: 8px;
  padding: 0;
  z-index: 1000;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(0, 255, 255, 0.1);
  border-bottom: 1px solid #0ff;
}

.debug-header h3 {
  margin: 0;
  color: #0ff;
  font-size: 14px;
  font-family: monospace;
}

.close-btn {
  background: transparent;
  border: none;
  color: #0ff;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.debug-content {
  padding: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.debug-content pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  color: #0ff;
  white-space: pre-wrap;
  word-break: break-all;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.hidden-youtube {
  position: fixed;
  top: -9999px;
  left: -9999px;
  visibility: hidden;
  pointer-events: none;
}

.game-board {
  position: relative;
  margin: 20px auto;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.boost-status-inline {
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid #0ff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.boost-title {
  color: #0ff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.boost-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.boost-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid;
}

.boost-item.speed {
  border-left-color: #ffff00;
  animation: pulse-yellow 1.5s ease-in-out infinite;
}

.boost-item.shield {
  border-left-color: #00ccff;
  animation: pulse-cyan 1.5s ease-in-out infinite;
}

.boost-item.eraser {
  border-left-color: #ff00ff;
  animation: pulse-magenta 1.5s ease-in-out infinite;
}

@keyframes pulse-yellow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 0, 0.3); }
  50% { box-shadow: 0 0 15px rgba(255, 255, 0, 0.6); }
}

@keyframes pulse-cyan {
  0%, 100% { box-shadow: 0 0 5px rgba(0, 204, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(0, 204, 255, 0.6); }
}

@keyframes pulse-magenta {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 0, 255, 0.3); }
  50% { box-shadow: 0 0 15px rgba(255, 0, 255, 0.6); }
}

.boost-icon {
  font-size: 18px;
  line-height: 1;
}

.boost-name {
  color: #fff;
  font-size: 13px;
  flex: 1;
  font-weight: bold;
}

.boost-timer {
  color: #ffff00;
  font-size: 12px;
  font-weight: bold;
}

.boost-status-text {
  color: #00ff00;
  font-size: 11px;
  font-weight: bold;
}

.boost-hint {
  color: #999;
  font-size: 10px;
  font-style: italic;
}

.no-boosts {
  color: #666;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  font-style: italic;
}

canvas {
  display: block;
  border: 2px solid #0ff;
  background-color: #000;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.name-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.name-dialog-content {
  background: rgba(0, 20, 20, 0.95);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid #0ff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
              inset 0 0 30px rgba(0, 255, 255, 0.1);
  min-width: 400px;
}

.name-dialog h2 {
  color: #0ff;
  margin: 0 0 30px;
  font-size: 28px;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.input-group {
  margin: 25px 0;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 12px;
  color: #0ff;
  font-size: 18px;
  font-weight: 500;
}

.name-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #0ff;
  background: rgba(0, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
  font-size: 18px;
  transition: all 0.3s ease;
}

.name-input:focus {
  outline: none;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  background: rgba(0, 255, 255, 0.15);
}

.avatar-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.avatar-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-option:hover {
  border-color: rgba(0, 255, 255, 0.6);
  background: rgba(0, 255, 255, 0.1);
  transform: scale(1.05);
}

.avatar-option.selected {
  border-color: #0ff;
  background: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

.avatar-icon {
  width: 32px;
  height: 32px;
  color: #0ff;
}

.avatar-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}

.avatar-option:hover .avatar-icon {
  color: #0ff;
}

.avatar-option.selected .avatar-icon {
  color: #0ff;
  filter: drop-shadow(0 0 4px #0ff);
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
  position: relative;
}

.color-square {
  width: 60px;
  height: 60px;
  border: 2px solid #0ff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-square:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
}

.random-color-btn {
  width: 100%;
  padding: 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.random-color-btn:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: scale(1.02);
}

.start-btn {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  background: #0ff;
  border: none;
  border-radius: 8px;
  color: #001414;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.hidden-color-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}

/* Replay overlays */
.replay-browser-overlay,
.replay-player-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1600; /* Higher than lobby-browser-overlay (1500) */
  padding: 2rem;
}

/* Mobile-friendly enhancements */
@media (max-width: 1024px) {
  /* Prevent text selection during touch */
  .game-container {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    touch-action: none; /* Prevent pull-to-refresh and other gestures */
  }

  /* Hide keyboard controls hint on mobile */
  .controls {
    display: none;
  }

  /* Adjust canvas for mobile screens */
  .game-board {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 10px;
  }

  .game-board canvas {
    max-width: 100%;
    max-height: calc(100vh - 100px);
    width: auto !important;
    height: auto !important;
    object-fit: contain;
  }

  /* Make lobby browser more mobile-friendly */
  .lobby-browser-overlay {
    padding: 1rem;
  }

  /* Adjust dialog sizes for mobile */
  .name-dialog-content {
    max-width: 90%;
    padding: 1.5rem;
  }

  /* Make buttons more touch-friendly */
  button {
    min-height: 44px; /* iOS recommended touch target size */
  }
}

/* Extra small screens */
@media (max-width: 480px) {
  .name-dialog-content {
    padding: 1rem;
  }

  .game-over-overlay {
    padding: 1rem;
  }

  .game-over-box {
    padding: 1.5rem;
    max-width: 90%;
  }
}

/* Fade transition for notification */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
