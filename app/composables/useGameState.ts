// Game state management composable
export function useGameState(
  ws: { send: (type: string, payload?: unknown) => boolean; onMessage: (handler: MessageHandler) => () => void },
  playerId: Ref<string | null>
) {
  // Game state
  const gamePlayers = ref<Player[]>([])
  const currentGridSize = ref(20)
  const gameState = ref<GameStateValue>('waiting')
  const countdown = ref<number | null>(null)
  const crashedPlayers = ref<string[]>([])
  const winner = ref<{ id: string; color: string } | null>(null)
  const powerUps = ref<PowerUp[]>([])
  const obstacles = ref<string[]>([])
  
  // Current player direction tracking
  const currentDirection = ref<string>('')
  
  // Reactive time for boost timers
  const currentTime = ref(Date.now())
  let timeUpdateInterval: NodeJS.Timeout | null = null
  
  // Current player computed
  const currentPlayer = computed(() => {
    return gamePlayers.value.find(p => p.id === playerId.value)
  })
  
  // Check if current player has any active boosts
  const hasAnyBoost = computed(() => {
    const player = currentPlayer.value
    if (!player) return false
    
    const hasSpeed = player.speedBoostUntil && currentTime.value < player.speedBoostUntil
    return hasSpeed || player.hasShield || player.hasTrailEraser
  })
  
  // Reset game state
  const reset = () => {
    gamePlayers.value = []
    gameState.value = 'waiting'
    countdown.value = null
    crashedPlayers.value = []
    winner.value = null
    powerUps.value = []
    obstacles.value = []
    currentDirection.value = ''
    
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
  }
  
  // Start time update interval for boost timers
  const startTimeUpdates = () => {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval)
    timeUpdateInterval = setInterval(() => {
      currentTime.value = Date.now()
    }, 100)
  }
  
  // Stop time updates
  const stopTimeUpdates = () => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
  }
  
  // Handle WebSocket messages
  const handleMessage: MessageHandler = (data) => {
    switch (data.type) {
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
        break
      }

      case 'gameStateDelta': {
        // Handle delta updates for performance
        const delta = data.payload as {
          isDelta: boolean
          players: Array<{
            id: string
            x: number
            y: number
            direction: 'up' | 'down' | 'left' | 'right' | 'crashed'
            trailDelta: string[]
            speed: number
            speedBoostUntil: number | null
            isBraking: boolean
            hasShield: boolean
            hasTrailEraser: boolean
          }>
          powerUps?: PowerUp[]
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
        break
      }

      case 'countdown':
        countdown.value = data.payload.count
        gameState.value = 'starting'
        break

      case 'playerCrashed': {
        const crashedPlayerId = data.payload.playerId
        const crashedPlayer = gamePlayers.value.find(p => p.id === crashedPlayerId)
        if (crashedPlayer) {
          crashedPlayer.direction = 'crashed'
          crashedPlayers.value.push(crashedPlayerId)
        }
        break
      }

      case 'gameOver':
        console.log('[GameState] Game Over received:', data.payload)
        if (data.payload.draw) {
          winner.value = null
        } else {
          winner.value = {
            id: data.payload.winner,
            color: data.payload.winnerColor
          }
        }
        gameState.value = 'finished'
        countdown.value = null
        stopTimeUpdates()
        break
    }
  }
  
  // Register message handler
  let unregister: (() => void) | null = null
  
  onMounted(() => {
    unregister = ws.onMessage(handleMessage)
  })
  
  onUnmounted(() => {
    if (unregister) unregister()
    stopTimeUpdates()
  })
  
  // Watch game state to manage time updates
  watch(gameState, (newState) => {
    if (newState === 'playing') {
      startTimeUpdates()
    } else {
      stopTimeUpdates()
    }
  })
  
  return {
    // State
    gamePlayers: readonly(gamePlayers),
    currentGridSize: readonly(currentGridSize),
    gameState: readonly(gameState),
    countdown: readonly(countdown),
    crashedPlayers: readonly(crashedPlayers),
    winner: readonly(winner),
    powerUps: readonly(powerUps),
    obstacles: readonly(obstacles),
    currentDirection: readonly(currentDirection),
    currentTime: readonly(currentTime),
    
    // Computed
    currentPlayer,
    hasAnyBoost,
    
    // Actions
    reset,
  }
}

