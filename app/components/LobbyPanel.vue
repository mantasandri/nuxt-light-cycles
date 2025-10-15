<script setup lang="ts">
interface LobbySettings {
  isPrivate: boolean;
  gridSize: number;
  maxPlayers: number;
  allowSpectators: boolean;
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
}

const props = defineProps<{
  lobbyState: LobbyState | null;
  currentPlayerId: string | null;
  isReady: boolean;
}>();

const emit = defineEmits<{
  toggleReady: [];
  updateSettings: [settings: Partial<LobbySettings>];
  leaveLobby: [];
}>();

const isHost = computed(() => {
  return props.currentPlayerId === props.lobbyState?.hostId;
});

const isSpectator = computed(() => {
  return props.lobbyState?.spectators?.some(s => s.id === props.currentPlayerId) || false;
});

const canStart = computed(() => {
  return props.lobbyState?.players.every(p => p.isReady) && 
         props.lobbyState?.players.length > 0;
});

const updateGridSize = (size: number) => {
  if (!isHost.value) return;
  emit('updateSettings', { gridSize: size });
};

const updateMaxPlayers = (max: number) => {
  if (!isHost.value) return;
  emit('updateSettings', { maxPlayers: max });
};

const togglePrivate = () => {
  if (!isHost.value) return;
  emit('updateSettings', { isPrivate: !props.lobbyState?.settings.isPrivate });
};
</script>

<template>
  <div v-if="lobbyState" class="lobby-panel">
    <div class="lobby-header">
      <h2>Lobby: {{ lobbyState.lobbyId }}</h2>
      <span class="lobby-state" :class="lobbyState.state">
        {{ lobbyState.state }}
      </span>
    </div>

    <!-- Settings section (host only) -->
    <div v-if="isHost" class="settings-section">
      <h3>⚙️ Lobby Settings</h3>
      <div class="settings-grid">
        <div class="setting-item">
          <label>Grid Size</label>
          <select 
            :value="lobbyState.settings.gridSize" 
            @change="updateGridSize(Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="30">Small (30x30)</option>
            <option :value="40">Medium (40x40)</option>
            <option :value="50">Large (50x50)</option>
            <option :value="60">XL (60x60)</option>
          </select>
        </div>

        <div class="setting-item">
          <label>Max Players</label>
          <select 
            :value="lobbyState.settings.maxPlayers"
            @change="updateMaxPlayers(Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="2">2 Players</option>
            <option :value="4">4 Players</option>
            <option :value="6">6 Players</option>
            <option :value="8">8 Players</option>
          </select>
        </div>

        <div class="setting-item checkbox">
          <label>
            <input 
              type="checkbox" 
              :checked="lobbyState.settings.isPrivate"
              @change="togglePrivate"
            />
            Private Lobby
          </label>
        </div>
      </div>
    </div>

    <!-- Players list -->
    <div class="players-section">
      <h3>👥 Players ({{ lobbyState.players.length }}/{{ lobbyState.settings.maxPlayers }})</h3>
      <div class="player-list">
        <div 
          v-for="player in lobbyState.players" 
          :key="player.id" 
          class="player-item"
          :class="{ 
            'is-ready': player.isReady,
            'is-you': player.id === currentPlayerId,
            'is-host': player.id === lobbyState.hostId
          }"
        >
          <div class="player-color" :style="{ backgroundColor: player.color }"></div>
          <div class="player-info">
            <span class="player-name">
              {{ player.name }}
              <span v-if="player.id === currentPlayerId" class="you-badge">(You)</span>
              <span v-if="player.id === lobbyState.hostId" class="host-badge">👑</span>
            </span>
          </div>
          <div class="player-status">
            <span v-if="player.isReady" class="ready-badge">✓ Ready</span>
            <span v-else class="not-ready-badge">Waiting...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Spectators list -->
    <div v-if="lobbyState.spectators && lobbyState.spectators.length > 0" class="spectators-section">
      <h3>👁️ Spectators ({{ lobbyState.spectators.length }})</h3>
      <div class="spectator-list">
        <div 
          v-for="spectator in lobbyState.spectators" 
          :key="spectator.id" 
          class="spectator-item"
          :class="{ 'is-you': spectator.id === currentPlayerId }"
        >
          <div class="spectator-color" :style="{ backgroundColor: spectator.color }"></div>
          <div class="spectator-info">
            <span class="spectator-name">
              {{ spectator.name }}
              <span v-if="spectator.id === currentPlayerId" class="you-badge">(You)</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ready button or Countdown -->
    <div class="actions-section">
      <!-- Show countdown if in starting state -->
      <div v-if="lobbyState.state === 'starting' && lobbyState.countdownRemaining !== null" class="countdown-display">
        <div class="countdown-number">{{ lobbyState.countdownRemaining }}</div>
        <p class="countdown-text">Game starting...</p>
      </div>
      
      <!-- Show ready button if in waiting state -->
      <template v-else-if="lobbyState.state === 'waiting'">
        <div v-if="!isSpectator" class="lobby-actions">
          <button 
            @click="emit('toggleReady')"
            class="ready-btn"
            :class="{ 'is-ready': isReady }"
          >
            {{ isReady ? '❌ Cancel' : '✓ Ready Up' }}
          </button>
          
          <button 
            @click="emit('leaveLobby')"
            class="leave-btn"
          >
            🚪 Leave Lobby
          </button>
        </div>

        <div v-else class="lobby-actions">
          <button 
            @click="emit('leaveLobby')"
            class="leave-btn spectator-leave"
          >
            🚪 Stop Spectating
          </button>
        </div>

        <p v-if="canStart" class="start-message">
          🎮 All players ready! Game starting soon...
        </p>
        <p v-else-if="lobbyState.players.length === 1" class="info-message">
          Waiting for more players to join...
        </p>
        <p v-else-if="!isSpectator" class="info-message">
          Waiting for all players to ready up...
        </p>
        <p v-else class="info-message">
          Watching as spectator...
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lobby-panel {
  background: rgba(0, 20, 20, 0.95);
  border: 2px solid #0ff;
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  margin: 20px auto;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
}

.lobby-header h2 {
  color: #0ff;
  margin: 0;
  font-size: 20px;
}

.lobby-state {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 1px;
}

.lobby-state.waiting {
  background: rgba(255, 255, 0, 0.2);
  color: #ff0;
  border: 1px solid #ff0;
}

.lobby-state.starting {
  background: rgba(255, 165, 0, 0.2);
  color: #fa0;
  border: 1px solid #fa0;
  animation: pulse 1s infinite;
}

.lobby-state.inGame {
  background: rgba(0, 255, 0, 0.2);
  color: #0f0;
  border: 1px solid #0f0;
}

.settings-section {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
}

.settings-section h3 {
  color: #0ff;
  margin: 0 0 15px 0;
  font-size: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  color: #0ff;
  font-size: 14px;
  font-weight: 500;
}

.setting-item select {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0ff;
  color: #fff;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
}

.setting-item.checkbox {
  flex-direction: row;
  align-items: center;
}

.setting-item.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setting-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.players-section,
.spectators-section {
  margin-bottom: 20px;
}

.players-section h3,
.spectators-section h3 {
  color: #0ff;
  margin: 0 0 15px 0;
  font-size: 16px;
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.player-item.is-ready {
  background: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.5);
}

.player-item.is-you {
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.player-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid #0ff;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.player-name {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.you-badge {
  color: #0ff;
  font-size: 12px;
  font-weight: 600;
}

.host-badge {
  font-size: 14px;
}

.player-status {
  display: flex;
  align-items: center;
}

.ready-badge {
  color: #0f0;
  font-weight: 600;
  font-size: 14px;
}

.not-ready-badge {
  color: #888;
  font-size: 14px;
}

.spectator-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spectator-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(200, 200, 200, 0.05);
  border: 1px solid rgba(200, 200, 200, 0.2);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.spectator-item.is-you {
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.spectator-color {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid #888;
}

.spectator-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.spectator-name {
  color: #ccc;
  font-size: 15px;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.lobby-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.ready-btn {
  flex: 1;
  padding: 14px;
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ready-btn:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: scale(1.02);
}

.ready-btn.is-ready {
  background: rgba(255, 0, 0, 0.1);
  border-color: #f00;
  color: #f00;
}

.ready-btn.is-ready:hover {
  background: rgba(255, 0, 0, 0.2);
}

.leave-btn {
  padding: 14px 20px;
  background: rgba(255, 100, 100, 0.1);
  border: 2px solid rgba(255, 100, 100, 0.5);
  color: rgba(255, 100, 100, 0.9);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.leave-btn:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: rgba(255, 100, 100, 0.8);
  color: rgba(255, 100, 100, 1);
  transform: scale(1.02);
}

.spectator-leave {
  width: 100%;
}

.start-message {
  color: #0f0;
  font-weight: 600;
  margin: 0;
  animation: pulse 1.5s infinite;
}

.info-message {
  color: #0ff;
  margin: 0;
  opacity: 0.8;
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.countdown-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(255, 165, 0, 0.1);
  border: 2px solid #fa0;
  border-radius: 12px;
  animation: pulse 1s infinite;
}

.countdown-number {
  font-size: 72px;
  font-weight: 900;
  color: #fa0;
  text-shadow: 0 0 20px rgba(255, 165, 0, 0.8);
  line-height: 1;
}

.countdown-text {
  color: #fa0;
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
}
</style>

