<template>
  <div class="replay-player">
    <div class="replay-header">
      <div class="replay-title">
        <div class="title-info">
          <h2>{{ replayData?.metadata.lobbyName }}</h2>
          <div class="replay-meta">
            <span>{{ formatDate(replayData?.metadata.createdAt || 0) }}</span>
            <span>•</span>
            <span>{{ replayData?.metadata.playerCount }} Players</span>
            <span>•</span>
            <span>{{ replayData?.metadata.gridSize }}x{{ replayData?.metadata.gridSize }}</span>
          </div>
        </div>
        <button class="btn-close" @click="$emit('close')">
          ← Back to Replays
        </button>
      </div>
    </div>

    <div class="canvas-container">
      <canvas 
        ref="canvasRef" 
        :width="canvasSize" 
        :height="canvasSize"
        class="game-canvas"
      />
    </div>

    <div class="controls">
      <div class="playback-controls">
        <button 
          class="btn-playback" 
          :disabled="!replayData"
          @click="togglePlayback"
        >
          <span class="icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
        </button>
        
        <button 
          class="btn-restart" 
          :disabled="!replayData"
          @click="restart"
        >
          <span class="icon">⏮️</span>
        </button>

        <div class="progress-container">
          <input 
            v-model="currentTick" 
            type="range" 
            :min="0" 
            :max="maxTick"
            class="progress-bar"
            :disabled="!replayData"
            @input="seekToTick"
          >
          <div class="time-display">
            <span>{{ formatTime(currentTick) }}</span>
            <span>/</span>
            <span>{{ formatTime(maxTick) }}</span>
          </div>
        </div>
      </div>

      <div class="speed-controls">
        <label>Speed:</label>
        <button 
          v-for="speed in [0.5, 1, 1.5, 2, 3]" 
          :key="speed"
          :class="['btn-speed', { active: playbackSpeed === speed }]"
          @click="playbackSpeed = speed"
        >
          {{ speed }}x
        </button>
      </div>
    </div>

    <div v-if="replayData" class="players-info">
      <h3>Players</h3>
      <div class="players-grid">
        <div 
          v-for="player in replayData.initialState.players" 
          :key="player.id"
          class="player-info"
          :class="{ winner: isWinner(player.id) }"
        >
          <div class="player-color" :style="{ background: player.color }"/>
          <span class="player-name">{{ player.name }}</span>
          <span v-if="player.isAI" class="ai-badge">AI</span>
          <span v-if="isWinner(player.id)" class="winner-badge">👑</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const props = defineProps<{
  replayData: ReplayData | null;
}>()

defineEmits<{
  close: [];
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const cellSize = 20 // Size of each grid cell in pixels
const canvasSize = computed(() => {
  if (!props.replayData) return 600 // Default fallback
  return props.replayData.initialState.gridSize * cellSize
})
const isPlaying = ref(false)
const currentTick = ref(0)
const playbackSpeed = ref(1)
const intervalId = ref<number | null>(null)

// Game state reconstruction
const gameState = ref<{
  players: Map<string, {
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
    trail: string[];
    color: string;
    name: string;
    isBraking: boolean;
    speed: number;
  }>;
  powerUps: Array<{ x: number; y: number }>;
  obstacles: Array<{ x: number; y: number }>;
}>({
  players: new Map(),
  powerUps: [],
  obstacles: [],
})

const maxTick = computed(() => props.replayData?.metadata.totalTicks || 0)

const isWinner = (playerId: string) => {
  return props.replayData?.metadata.winner?.playerId === playerId
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (tick: number) => {
  const seconds = Math.floor((tick * (props.replayData?.initialState.settings.tickRate || 200)) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const initializeGameState = () => {
  if (!props.replayData) return

  gameState.value.players.clear()
  gameState.value.powerUps = []
  gameState.value.obstacles = props.replayData.initialState.obstacles

  // Initialize players
  props.replayData.initialState.players.forEach(player => {
    gameState.value.players.set(player.id, {
      x: player.x,
      y: player.y,
      direction: player.direction,
      trail: [],
      color: player.color,
      name: player.name,
      isBraking: false,
      speed: 1,
    })
  })
}

const simulateTick = (tick: number) => {
  if (!props.replayData) return

  // Apply all events for this tick
  const eventsForTick = props.replayData.events.filter(e => e.tick === tick)
  eventsForTick.forEach(event => {
    if (event.type === 'positionSnapshot') {
      // Use position snapshot from server (most accurate)
      const positions = event.payload.positions as Record<string, { x: number; y: number; direction: string; trail: string[] }>
      Object.entries(positions).forEach(([playerId, data]) => {
        const player = gameState.value.players.get(playerId)
        if (player) {
          player.x = data.x
          player.y = data.y
          player.direction = data.direction
          player.trail = data.trail
        }
      })
    } else if (event.type === 'playerCrashed') {
      const player = gameState.value.players.get(event.payload.playerId)
      if (player) {
        player.direction = 'crashed'
      }
    } else if (event.type === 'powerUpSpawned') {
      gameState.value.powerUps.push({ x: event.payload.x, y: event.payload.y, type: event.payload.type || 'speed' })
    } else if (event.type === 'powerUpCollected') {
      const index = event.payload.powerUpIndex
      if (index >= 0 && index < gameState.value.powerUps.length) {
        gameState.value.powerUps.splice(index, 1)
      }
    }
  })
}

const drawGame = () => {
  if (!canvasRef.value || !props.replayData) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const gridSize = props.replayData.initialState.gridSize
  const size = canvasSize.value // Get the computed canvas size

  // Clear canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)

  // Draw grid
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath()
    ctx.moveTo(i * cellSize, 0)
    ctx.lineTo(i * cellSize, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * cellSize)
    ctx.lineTo(size, i * cellSize)
    ctx.stroke()
  }

  // Draw obstacles
  ctx.fillStyle = '#f44'
  gameState.value.obstacles.forEach(obs => {
    ctx.fillRect(obs.x * cellSize, obs.y * cellSize, cellSize, cellSize)
  })

  // Draw power-ups
  gameState.value.powerUps.forEach(powerUp => {
    const x = powerUp.x * cellSize + cellSize / 2
    const y = powerUp.y * cellSize + cellSize / 2
    
    // Different colors for different power-up types
    let color = '#ff0' // speed (yellow)
    if (powerUp.type === 'shield') {
      color = '#0cf' // shield (cyan)
    } else if (powerUp.type === 'trailEraser') {
      color = '#f0f' // trail eraser (magenta)
    }
    
    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, cellSize)
    const rgb = color === '#ff0' ? '255, 255, 0' : color === '#0cf' ? '0, 204, 255' : '255, 0, 255'
    gradient.addColorStop(0, `rgba(${rgb}, 0.4)`)
    gradient.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(powerUp.x * cellSize - cellSize, powerUp.y * cellSize - cellSize, cellSize * 3, cellSize * 3)
    
    // Power-up circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // Draw player trails and players
  gameState.value.players.forEach(player => {
    // Draw trail
    ctx.strokeStyle = player.color
    ctx.lineWidth = cellSize * 0.6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (player.trail.length > 1) {
      ctx.beginPath()
      const firstPos = player.trail[0].split(',').map(Number)
      ctx.moveTo(firstPos[0] * cellSize + cellSize / 2, firstPos[1] * cellSize + cellSize / 2)

      for (let i = 1; i < player.trail.length; i++) {
        const pos = player.trail[i].split(',').map(Number)
        ctx.lineTo(pos[0] * cellSize + cellSize / 2, pos[1] * cellSize + cellSize / 2)
      }
      ctx.stroke()
    }

    // Draw player (unless crashed)
    if (player.direction !== 'crashed') {
      const x = player.x * cellSize + cellSize / 2
      const y = player.y * cellSize + cellSize / 2

      // Glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, cellSize)
      gradient.addColorStop(0, player.color)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(player.x * cellSize - cellSize, player.y * cellSize - cellSize, cellSize * 3, cellSize * 3)

      // Player circle
      ctx.fillStyle = player.color
      ctx.beginPath()
      ctx.arc(x, y, cellSize / 2, 0, Math.PI * 2)
      ctx.fill()

      // Player name
      ctx.fillStyle = '#fff'
      ctx.font = `${cellSize * 0.4}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(player.name, x, y - cellSize)
    }
  })
}

const seekToTick = () => {
  if (!props.replayData) return

  // Reinitialize and replay up to current tick
  initializeGameState()
  
  for (let i = 0; i <= currentTick.value; i++) {
    simulateTick(i)
  }

  drawGame()
}

const togglePlayback = () => {
  isPlaying.value = !isPlaying.value
  
  if (isPlaying.value) {
    startPlayback()
  } else {
    stopPlayback()
  }
}

const startPlayback = () => {
  if (!props.replayData) return

  if (currentTick.value >= maxTick.value) {
    currentTick.value = 0
    initializeGameState()
  }

  const tickInterval = (props.replayData.initialState.settings.tickRate || 200) / playbackSpeed.value

  intervalId.value = window.setInterval(() => {
    if (currentTick.value >= maxTick.value) {
      stopPlayback()
      isPlaying.value = false
      return
    }

    currentTick.value++
    simulateTick(currentTick.value)
    drawGame()
  }, tickInterval)
}

const stopPlayback = () => {
  if (intervalId.value !== null) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
}

const restart = () => {
  stopPlayback()
  isPlaying.value = false
  currentTick.value = 0
  initializeGameState()
  drawGame()
}

watch(() => props.replayData, (newData) => {
  if (newData) {
    restart()
  }
})

watch(playbackSpeed, () => {
  if (isPlaying.value) {
    stopPlayback()
    startPlayback()
  }
})

onMounted(() => {
  if (props.replayData) {
    initializeGameState()
    drawGame()
  }
})

onUnmounted(() => {
  stopPlayback()
})
</script>

<style scoped>
.replay-player {
  background: rgba(0, 17, 34, 0.95);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 16px;
  padding: 2rem;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
}

.replay-header {
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.replay-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.title-info {
  flex: 1;
}

.title-info h2 {
  margin: 0 0 0.5rem 0;
  color: #0ff;
  font-size: 1.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.btn-close {
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid rgba(0, 255, 255, 0.5);
  color: #0ff;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-close:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  transform: translateX(-4px);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.replay-meta {
  display: flex;
  gap: 0.75rem;
  color: rgba(0, 255, 255, 0.7);
  font-size: 0.9rem;
}

.canvas-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.game-canvas {
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  background: #000;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.controls {
  background: rgba(0, 34, 68, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn-playback,
.btn-restart {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #0ff;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-playback:hover:not(:disabled),
.btn-restart:hover:not(:disabled) {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.btn-playback:disabled,
.btn-restart:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.progress-bar::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0ff;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: rgba(0, 255, 255, 0.7);
  font-size: 0.9rem;
  font-family: monospace;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speed-controls label {
  color: rgba(0, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-right: 0.5rem;
}

.btn-speed {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #0ff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.btn-speed:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
}

.btn-speed.active {
  background: rgba(0, 255, 255, 0.3);
  border-color: #0ff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.players-info {
  background: rgba(0, 34, 68, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
}

.players-info h3 {
  margin: 0 0 1rem 0;
  color: #0ff;
  font-size: 1.1rem;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 17, 34, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
}

.player-info.winner {
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.1);
}

.player-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 8px currentColor;
}

.player-name {
  color: #fff;
  flex: 1;
}

.ai-badge,
.winner-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(0, 255, 255, 0.2);
  color: #0ff;
}

.winner-badge {
  font-size: 1rem;
  padding: 0;
  background: none;
}
</style>

