<script setup lang="ts">
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
const websocket = useWebSocket()
const { ws, playerId, isReconnecting, reconnectAttempts } = websocket

// Game state
const gameStateComposable = useGameState(websocket, playerId)
const { 
  gamePlayers, 
  currentGridSize: gameGridSize, 
  gameState, 
  countdown, 
  winner, 
  powerUps, 
  obstacles,
  currentDirection,
  currentPlayer,
  hasAnyBoost,
  currentTime
} = gameStateComposable

// Lobby state
const lobbyStateComposable = useLobbyState(websocket, playerId)
const { 
  lobbyState, 
  lobbyId, 
  isReady, 
  isSpectator,
  currentGridSize: lobbyGridSize,
  isHost
} = lobbyStateComposable

// Use lobby grid size when in lobby, game grid size when in game
const currentGridSize = computed(() => {
  return gameState.value === 'playing' ? gameGridSize.value : lobbyGridSize.value
})

// Canvas rendering (convert readonly refs to writable for canvas composable)
const canvas = useGameCanvas(
  gamePlayers as Ref<any[]>, 
  powerUps as Ref<any[]>, 
  obstacles as Ref<string[]>, 
  gameGridSize, 
  gameState as Ref<string>, 
  playerId
)
const { canvasRef, drawGame } = canvas

// Game controls
const controls = useGameControls(websocket, gameState, currentDirection)
const { handleDPadDirection, handleDPadBrake } = controls

// YouTube player
const youtube = useYouTubePlayer()
const { isYoutubePlaying, toggleYoutube } = youtube

// Replay system
const currentReplayData = ref<ReplayData | null>(null)

// Lobby browser - using component instance type
const lobbyBrowser = ref<{ updateLobbies: (lobbies: unknown[]) => void } | null>(null)

// Handle player settings save
const handleSavePlayerSettings = (settings: { name: string; color: string; colorHex: string; avatar: string }) => {
  saveSettings(settings)
  showNameDialog.value = false
  
  // Show welcome screen only on first-time setup
  const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome')
  if (!hasSeenWelcome) {
    showWelcome.value = true
  } else {
    websocket.connect(playerSettings.value.userId)
  }
}

const handleWelcomeContinue = () => {
  showWelcome.value = false
  sessionStorage.setItem('hasSeenWelcome', 'true')
  websocket.connect(playerSettings.value.userId)
}

const changePlayerSettings = () => {
  showBrowser.value = false
  showNameDialog.value = true
}

// Lobby actions
const handleJoinLobby = (targetLobbyId: string) => {
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  lobbyStateComposable.joinLobby(targetLobbyId, playerSettings.value.name, playerSettings.value.color)
}

const handleSpectateGame = (targetLobbyId: string) => {
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  lobbyStateComposable.joinLobbyAsSpectator(targetLobbyId, playerSettings.value.name, playerSettings.value.color)
}

const handleCreateLobby = (settings: LobbySettings) => {
  showReplayBrowser.value = false
  showReplayPlayer.value = false
  lobbyStateComposable.createLobby(settings, playerSettings.value.name, playerSettings.value.color)
}

const handlePlayAgain = () => {
  gameStateComposable.reset()
  showLobby.value = true
  lobbyStateComposable.returnToLobby()
}

const handleQuitToLobby = () => {
  lobbyStateComposable.leaveLobby()
  gameStateComposable.reset()
  showLobby.value = false
  showBrowser.value = true
}

// Replay actions
const handleSaveReplay = () => {
  if (!ws.value || !replayAvailable.value) return
  
  savingReplay.value = true
  websocket.send('saveReplay')
}

const handleOpenReplayBrowser = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    console.log('[Replay] No WebSocket connection, establishing one...')
    websocket.connect(playerSettings.value.userId)
    setTimeout(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        console.log('[Replay] Connection established, opening replay browser')
        showReplayBrowser.value = true
      } else {
        console.error('[Replay] Failed to establish WebSocket connection')
        alert('Could not connect to server. Please try again.')
      }
    }, 500)
    return
  }
  
  console.log('[Replay] Opening replay browser')
  showReplayBrowser.value = true
}

const handleWatchReplay = (replayId: string) => {
  websocket.send('loadReplay', { replayId })
}

const handleCloseReplayBrowser = () => {
  showReplayBrowser.value = false
}

const handleCloseReplayPlayer = () => {
  showReplayPlayer.value = false
  currentReplayData.value = null
}

// Handle additional WebSocket messages
websocket.onMessage((data) => {
  switch (data.type) {
    case 'connected':
      if (lobbyBrowser.value) {
        lobbyBrowser.value.updateLobbies(data.payload.lobbies)
      }
      showBrowser.value = true
      break
      
    case 'reconnected':
      if (data.payload.lobbyId) {
        showBrowser.value = false
        showLobby.value = true
      } else {
        showBrowser.value = true
      }
      break
      
    case 'lobbyList':
      if (lobbyBrowser.value) {
        lobbyBrowser.value.updateLobbies(data.payload.lobbies)
      }
      break
      
    case 'lobbyJoined':
      showBrowser.value = false
      showCreateDialog.value = false
      
      if (canvasRef.value) {
        canvasRef.value.width = currentGridSize.value * canvas.cellSize
        canvasRef.value.height = currentGridSize.value * canvas.cellSize
      }
      break
      
    case 'lobbyState':
      if (data.payload.state === 'starting') {
        showLobby.value = true
        
        if (canvasRef.value && currentGridSize.value > 0) {
          canvasRef.value.width = currentGridSize.value * canvas.cellSize
          canvasRef.value.height = currentGridSize.value * canvas.cellSize
          drawGame()
        }
      } else if (data.payload.state === 'inGame') {
        showLobby.value = false
        showReplayBrowser.value = false
        showReplayPlayer.value = false
        
        if (canvasRef.value && currentGridSize.value > 0) {
          canvasRef.value.width = currentGridSize.value * canvas.cellSize
          canvasRef.value.height = currentGridSize.value * canvas.cellSize
        }
      } else if (data.payload.state === 'waiting') {
        showLobby.value = true
      }
      break
      
    case 'countdown':
      showLobby.value = false
      drawGame()
      break
      
    case 'gameState':
    case 'gameStateDelta':
    case 'playerCrashed':
      drawGame()
      break
      
    case 'gameOver':
      showLobby.value = false
      replayAvailable.value = data.payload.replayAvailable || false
      playGameOverSound()
      drawGame()
      break
      
    case 'replaySaved':
      console.log('[Client] Replay saved:', data.payload)
      savingReplay.value = false
      replayAvailable.value = false
      replaySavedMessage.value = data.payload.message || 'Replay saved successfully!'
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
      
    case 'lobbyClosed':
    case 'kicked':
    case 'banned':
      showLobby.value = false
      showBrowser.value = true
      break
  }
})

// Lifecycle
onMounted(() => {
  loadSettings()
  
  if (!isConfigured.value) {
    const color = generateRandomColor()
    showNameDialog.value = true
  } else {
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome')
    if (!hasSeenWelcome) {
      showWelcome.value = true
    } else {
      websocket.connect(playerSettings.value.userId)
    }
  }
})

onUnmounted(() => {
  websocket.disconnect()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-5 box-border relative overflow-hidden font-sans text-green-500 bg-[#111]">
    <!-- Welcome Screen -->
    <WelcomeScreen 
      v-if="showWelcome"
      @continue="handleWelcomeContinue"
    />
    
    <!-- Music controls -->
    <div v-if="!showNameDialog && !showBrowser && !showWelcome" class="fixed top-5 right-[60px] z-[100]">
      <button class="bg-blue-700 text-white border-none px-4 py-2 rounded cursor-pointer text-sm hover:bg-blue-800 transition-colors" @click="toggleYoutube">
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
    <PlayerSettingsDialog
      v-if="showNameDialog"
      :is-configured="isConfigured"
      :initial-name="playerSettings.name"
      :initial-color="playerSettings.color"
      :initial-color-hex="playerSettings.colorHex"
      :initial-avatar="playerSettings.avatar"
      @save="handleSavePlayerSettings"
    />

    <!-- Reconnection overlay -->
    <div v-if="isReconnecting" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[2500]">
      <div class="bg-[rgba(0,20,20,0.95)] border-[3px] border-cyan-400 rounded-xl p-10 text-center shadow-[0_0_30px_rgba(0,255,255,0.5)]">
        <div class="reconnection-spinner"/>
        <p class="text-cyan-400 text-xl my-2.5 font-semibold">Reconnecting to server...</p>
        <p class="text-gray-500 text-sm my-1">Attempt {{ reconnectAttempts }} of 5</p>
      </div>
    </div>

    <!-- Lobby Browser -->
    <div v-if="showBrowser" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[1500] overflow-y-auto">
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
    <div v-if="showReplayBrowser" class="fixed inset-0 w-screen h-screen bg-black/90 flex justify-center items-center z-[1600] p-8">
      <ReplayBrowser
        :ws="ws"
        @watch="handleWatchReplay"
        @close="handleCloseReplayBrowser"
      />
    </div>

    <!-- Replay Player -->
    <div v-if="showReplayPlayer" class="fixed inset-0 w-screen h-screen bg-black/90 flex justify-center items-center z-[1600] p-8">
      <ReplayPlayer
        :replay-data="currentReplayData"
        @close="handleCloseReplayPlayer"
      />
    </div>

    <!-- Lobby Panel (in lobby, waiting) -->
    <div v-if="showLobby && lobbyState && gameState !== 'playing'" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[1500] overflow-y-auto">
      <div class="relative">
        <div v-if="isSpectator" class="absolute -top-[50px] left-1/2 -translate-x-1/2 bg-gray-400/90 text-white px-5 py-2 rounded-full text-sm font-semibold border-2 border-gray-300/80 shadow-[0_0_15px_rgba(150,150,150,0.5)] z-10">
          👁️ Spectating
        </div>
        <LobbyPanel
          :lobby-state="lobbyState as any"
          :current-player-id="playerId"
          :is-ready="isReady"
          @toggle-ready="lobbyStateComposable.toggleReady"
          @update-settings="lobbyStateComposable.updateLobbySettings"
          @leave-lobby="handleQuitToLobby"
          @kick-player="lobbyStateComposable.kickPlayer"
          @ban-player="lobbyStateComposable.banPlayer"
          @add-a-i-bot="lobbyStateComposable.addAIBot"
          @remove-a-i-bot="lobbyStateComposable.removeAIBot"
        />
      </div>
    </div>

    <!-- Countdown overlay -->
    <div v-if="gameState === 'starting' && countdown !== null" class="fixed inset-0 flex items-center justify-center z-[2000] pointer-events-none">
      <div class="flex flex-col items-center gap-2.5 bg-black/90 py-8 px-12 rounded-xl border-[3px] border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.5)]">
        <p class="text-yellow-400 text-2xl m-0">Game starting in</p>
        <div class="countdown-number">{{ countdown }}</div>
      </div>
    </div>

    <!-- Game Over overlay -->
    <div v-if="gameState === 'finished'" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[2000] pointer-events-auto">
      <div class="bg-[rgba(0,20,20,0.95)] border-[3px] border-cyan-400 rounded-xl p-10 shadow-[0_0_30px_rgba(0,255,255,0.5)] text-center">
        <h2 class="text-cyan-400 text-4xl m-0 mb-5 [text-shadow:0_0_15px_rgba(0,255,255,0.8)]">End of line, man!</h2>
        <p class="text-2xl m-0 mb-8 font-semibold">
          <span v-if="winner" :style="{ color: winner?.color || '#0ff' }">
            {{ winner?.id === playerId ? 'You won! 🎉' : `${gamePlayers.find((p: any) => p.id === winner?.id)?.name || 'Unknown Player'} won!` }}
          </span>
          <span v-else>Draw - Everyone crashed!</span>
        </p>
        <div class="flex gap-4 justify-center mt-5">
          <button 
            v-if="replayAvailable && !isSpectator" 
            class="px-7 py-3.5 text-base font-semibold border-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 bg-purple-700/30 text-white border-purple-600/60 hover:bg-purple-700/50 hover:border-purple-600/80 hover:scale-105 hover:shadow-[0_0_20px_rgba(138,43,226,0.4)] disabled:opacity-50 disabled:cursor-not-allowed" 
            :disabled="savingReplay"
            @click="handleSaveReplay"
          >
            {{ savingReplay ? '💾 Saving...' : '💾 Save Replay' }}
          </button>
          <button class="px-7 py-3.5 text-base font-semibold border-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 bg-cyan-400 text-[#001414] border-cyan-400 hover:bg-cyan-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)]" @click="handlePlayAgain">
            🔄 Play Again
          </button>
          <button class="px-7 py-3.5 text-base font-semibold border-2 rounded-lg cursor-pointer transition-all flex items-center gap-2 bg-white/10 text-white border-gray-600 hover:bg-white/20 hover:border-gray-400 hover:scale-105" @click="handleQuitToLobby">
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
      class="fixed top-2.5 right-2.5 w-10 h-10 rounded-lg bg-cyan-400/10 border-2 border-cyan-400 text-cyan-400 cursor-pointer z-[1000] flex items-center justify-center transition-all text-xl hover:bg-cyan-400/20"
      :class="{ 'bg-cyan-400/30 shadow-[0_0_10px_rgba(0,255,255,0.5)]': showDebug }"
      title="Toggle Debug Info"
      @click="showDebug = !showDebug"
    >
      ⚙️
    </button>

    <!-- Debug modal -->
    <Transition name="slide">
      <div v-if="showDebug" class="fixed top-[60px] right-2.5 w-[300px] bg-black/90 border-2 border-cyan-400 rounded-lg p-0 z-[1000] shadow-[0_0_20px_rgba(0,255,255,0.2)]">
        <div class="flex justify-between items-center p-2.5 bg-cyan-400/10 border-b border-cyan-400">
          <h3 class="m-0 text-cyan-400 text-sm font-mono">Debug Info</h3>
          <button class="bg-transparent border-none text-cyan-400 text-xl cursor-pointer px-1 leading-none hover:text-white" @click="showDebug = false">×</button>
        </div>
        <div class="p-2.5 max-h-[400px] overflow-y-auto">
          <pre class="m-0 font-mono text-xs text-cyan-400 whitespace-pre-wrap break-all">{{ JSON.stringify({
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
    <div class="fixed -top-[9999px] -left-[9999px] invisible pointer-events-none">
      <div id="youtubePlayer"/>
    </div>

    <!-- Game canvas (only show when in a lobby or game) -->
    <div v-if="!showNameDialog && !showBrowser && !showWelcome && lobbyId" class="relative my-5 mx-auto flex justify-center items-center shadow-[0_0_20px_rgba(0,255,255,0.3)] rounded overflow-hidden">
      <canvas ref="canvasRef" class="block border-2 border-cyan-400 bg-black [image-rendering:pixelated] [image-rendering:crisp-edges]"/>
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
/* Keep only custom animations and game-specific styles */

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

/* Countdown animation */
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

/* Slide transition for debug panel */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Boost status animations */

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

/* Mobile touch optimization */
@media (max-width: 1024px) {
  .controls {
    display: none;
  }
}
</style>
