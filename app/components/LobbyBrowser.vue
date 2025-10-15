<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface LobbyInfo {
  lobbyId: string;
  playerCount: number;
  maxPlayers: number;
  gridSize: number;
  isPrivate: boolean;
  hostName: string;
  state: string;
}

const emit = defineEmits<{
  joinLobby: [lobbyId: string];
  spectateGame: [lobbyId: string];
  createLobby: [];
  changeSettings: [];
  openReplays: [];
}>();

defineProps<{
  playerName: string;
}>();

const lobbies = ref<LobbyInfo[]>([]);
const isLoading = ref(false);
const autoRefresh = ref(true);
const refreshInterval = ref<NodeJS.Timeout | null>(null);

// Mock function - will be replaced with actual WebSocket call
const fetchLobbies = async () => {
  isLoading.value = true;
  
  // TODO: Replace with actual WebSocket message to get lobby list
  // For now, we'll emit this through the parent component
  // The parent will handle the WebSocket communication
  
  isLoading.value = false;
};

const refresh = () => {
  fetchLobbies();
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  refreshInterval.value = setInterval(() => {
    fetchLobbies();
  }, 3000); // Refresh every 3 seconds
};

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
};

onMounted(() => {
  fetchLobbies();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});

// Expose fetchLobbies for parent component
defineExpose({
  updateLobbies: (newLobbies: LobbyInfo[]) => {
    lobbies.value = newLobbies;
  }
});
</script>

<template>
  <div class="lobby-browser">
    <div class="browser-header">
      <div class="header-left">
        <h2 class="lobbies-title">🎮 Available Lobbies</h2>
        <p class="player-info">Playing as: <span class="player-name">{{ playerName }}</span></p>
      </div>
      <div class="header-actions">
        <button @click="emit('changeSettings')" class="settings-btn">
          ⚙️ Change Name/Color
        </button>
      </div>
    </div>

    <div class="browser-controls">
      <button @click="refresh" :disabled="isLoading" class="refresh-btn">
        <span class="refresh-icon" :class="{ spinning: isLoading }">🔄</span>
        Refresh
      </button>
      
      <label class="auto-refresh-toggle">
        <input type="checkbox" v-model="autoRefresh" @change="toggleAutoRefresh" />
        <span>Auto-refresh</span>
      </label>

      <button @click="emit('createLobby')" class="create-btn">
        ➕ Create Lobby
      </button>

      <button @click="emit('openReplays')" class="replays-btn">
        🎬 My Replays
      </button>
    </div>

    <div class="lobbies-list">
      <div v-if="lobbies.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>No lobbies available</p>
        <p class="empty-hint">Create a new lobby to get started!</p>
      </div>

      <div 
        v-for="lobby in lobbies" 
        :key="lobby.lobbyId"
        class="lobby-card"
        :class="{ 
          'is-full': lobby.playerCount >= lobby.maxPlayers,
          'is-in-game': lobby.state !== 'waiting'
        }"
      >
        <div class="lobby-main">
          <div class="lobby-info">
            <h3 class="lobby-title">
              {{ lobby.isPrivate ? '🔒' : '🌐' }}
              {{ lobby.hostName }}'s Lobby
            </h3>
            <div class="lobby-details">
              <span class="detail-badge">
                👥 {{ lobby.playerCount }}/{{ lobby.maxPlayers }}
              </span>
              <span class="detail-badge">
                📏 {{ lobby.gridSize }}x{{ lobby.gridSize }}
              </span>
              <span class="detail-badge state" :class="lobby.state">
                {{ lobby.state === 'waiting' ? '⏳ Waiting' : '🎮 In Game' }}
              </span>
            </div>
          </div>
          
          <div class="lobby-actions">
            <button 
              @click="emit('joinLobby', lobby.lobbyId)"
              class="join-btn"
              :disabled="lobby.playerCount >= lobby.maxPlayers || lobby.state !== 'waiting'"
            >
              {{ lobby.playerCount >= lobby.maxPlayers ? 'Full' : 
                 lobby.state !== 'waiting' ? 'In Progress' : '▶ Join' }}
            </button>
            <button 
              @click="emit('spectateGame', lobby.lobbyId)"
              class="spectate-btn"
              :title="lobby.state === 'waiting' ? 'Spectate lobby' : 'Spectate game'"
            >
              👁️ Watch
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-browser {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(0, 255, 255, 0.3);
}

.header-left h2 {
  color: #0ff;
  margin: 0 0 10px 0;
  font-size: 28px;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.player-info {
  color: #888;
  margin: 0;
  font-size: 14px;
}

.player-name {
  color: #0ff;
  font-weight: 600;
}

.settings-btn {
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: translateY(-2px);
}

.browser-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.refresh-btn {
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(0, 255, 255, 0.2);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.3s;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0ff;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.auto-refresh-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.create-btn,
.replays-btn {
  background: #0ff;
  border: none;
  color: #001414;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.create-btn {
  margin-left: auto;
}

.replays-btn {
  background: rgba(255, 100, 255, 0.8);
  color: #fff;
}

.create-btn:hover,
.replays-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.4);
}

.replays-btn:hover {
  box-shadow: 0 4px 12px rgba(255, 100, 255, 0.4);
}

.lobbies-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state p {
  margin: 10px 0;
  font-size: 18px;
}

.empty-hint {
  color: #0ff;
  font-size: 14px;
}

.lobby-card {
  background: rgba(0, 20, 20, 0.6);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 10px;
  padding: 20px;
  transition: all 0.3s;
}

.lobby-card:hover:not(.is-full):not(.is-in-game) {
  border-color: #0ff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.lobby-card.is-full,
.lobby-card.is-in-game {
  opacity: 0.6;
  border-color: rgba(0, 255, 255, 0.2);
}

.lobby-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.lobby-info {
  flex: 1;
}

.lobby-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.lobby-title {
  color: #0ff;
  margin: 0 0 10px 0;
  font-size: 20px;
}

.lobbies-title {
  margin: 0 20px 10px 0 !important;
  font-size: 28px;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.lobby-details {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-badge {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #0ff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.detail-badge.state.waiting {
  background: rgba(255, 255, 0, 0.1);
  border-color: rgba(255, 255, 0, 0.3);
  color: #ff0;
}

.detail-badge.state.inGame {
  background: rgba(0, 255, 0, 0.1);
  border-color: rgba(0, 255, 0, 0.3);
  color: #0f0;
}

.join-btn {
  background: rgba(0, 255, 255, 0.2);
  border: 2px solid #0ff;
  color: #0ff;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
  min-width: 90px;
}

.join-btn:hover:not(:disabled) {
  background: #0ff;
  color: #001414;
  transform: scale(1.05);
}

.join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(100, 100, 100, 0.2);
  border-color: #666;
  color: #666;
}

.spectate-btn {
  background: rgba(150, 150, 150, 0.15);
  border: 2px solid rgba(150, 150, 150, 0.5);
  color: rgba(200, 200, 200, 0.9);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.spectate-btn:hover {
  background: rgba(150, 150, 150, 0.25);
  border-color: rgba(200, 200, 200, 0.8);
  color: #fff;
  transform: scale(1.05);
}
</style>



