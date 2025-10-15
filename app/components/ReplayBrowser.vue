<template>
  <div class="replay-browser">
    <div class="header">
      <h2>My Replays</h2>
      <div class="header-actions">
        <button @click="refreshReplays" class="btn-refresh">
          <span class="icon">🔄</span> Refresh
        </button>
        <button @click="$emit('close')" class="btn-close">
          <span class="icon">✖️</span> Close
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading replays...</p>
    </div>

    <div v-else-if="replays.length === 0" class="empty-state">
      <div class="icon">🎮</div>
      <h3>No Replays Yet</h3>
      <p>Play a game and save the replay to watch it later!</p>
    </div>

    <div v-else class="replays-grid">
      <div 
        v-for="replay in replays" 
        :key="replay.replayId"
        class="replay-card"
      >
        <div class="replay-header">
          <h3>{{ replay.metadata.lobbyName }}</h3>
          <span class="grid-size">{{ replay.metadata.gridSize }}x{{ replay.metadata.gridSize }}</span>
        </div>

        <div class="replay-info">
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">{{ formatDate(replay.metadata.createdAt) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(replay.metadata.duration) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Players:</span>
            <span class="value">{{ replay.metadata.playerCount }}</span>
          </div>
          <div v-if="replay.metadata.winner" class="info-row winner">
            <span class="label">Winner:</span>
            <span 
              class="value winner-name" 
              :style="{ color: replay.metadata.winner.color }"
            >
              {{ replay.metadata.winner.name }}
            </span>
          </div>
          <div v-else class="info-row">
            <span class="label">Result:</span>
            <span class="value">Draw</span>
          </div>
        </div>

        <div class="replay-actions">
          <button 
            @click="$emit('watch', replay.replayId)" 
            class="btn-watch"
          >
            <span class="icon">▶️</span> Watch
          </button>
          <button 
            @click="deleteReplay(replay.replayId)" 
            class="btn-delete"
            :disabled="deleting === replay.replayId"
          >
            <span class="icon">🗑️</span>
            {{ deleting === replay.replayId ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface ReplayMetadata {
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
}

interface Replay {
  replayId: string;
  metadata: ReplayMetadata;
}

const props = defineProps<{
  ws: WebSocket | null;
}>();

const emit = defineEmits<{
  watch: [replayId: string];
  close: [];
}>();

const replays = ref<Replay[]>([]);
const loading = ref(true);
const deleting = ref<string | null>(null);

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const refreshReplays = () => {
  if (!props.ws) {
    console.error('[ReplayBrowser] No WebSocket connection');
    return;
  }
  
  if (props.ws.readyState !== WebSocket.OPEN) {
    console.error('[ReplayBrowser] WebSocket not open, state:', props.ws.readyState);
    loading.value = false;
    return;
  }
  
  console.log('[ReplayBrowser] Requesting user replays, WebSocket state:', props.ws.readyState);
  loading.value = true;
  props.ws.send(JSON.stringify({
    type: 'getUserReplays',
  }));
};

const deleteReplay = (replayId: string) => {
  if (!props.ws || deleting.value) return;
  
  deleting.value = replayId;
  props.ws.send(JSON.stringify({
    type: 'deleteReplay',
    payload: { replayId },
  }));
};

const handleMessage = (event: MessageEvent) => {
  try {
    const message = JSON.parse(event.data);
    
    // Only handle replay-related messages
    if (message.type === 'userReplays') {
      console.log('[ReplayBrowser] Received userReplays with', message.payload.replays?.length || 0, 'replays');
      replays.value = message.payload.replays || [];
      loading.value = false;
    } else if (message.type === 'replayDeleted') {
      console.log('[ReplayBrowser] Replay deleted:', message.payload.replayId);
      replays.value = replays.value.filter(r => r.replayId !== message.payload.replayId);
      deleting.value = null;
    } else if (message.type === 'error' && loading.value) {
      // Only handle errors if we're currently loading (might be our error)
      console.error('[ReplayBrowser] Error from server:', message.payload.message);
      loading.value = false;
    }
    // Ignore all other message types (they're for the parent component)
  } catch (error) {
    console.error('[ReplayBrowser] Error parsing message:', error);
  }
};

onMounted(() => {
  console.log('[ReplayBrowser] Component mounted, setting up listener');
  if (props.ws) {
    props.ws.addEventListener('message', handleMessage);
    refreshReplays();
  } else {
    console.error('[ReplayBrowser] No WebSocket connection provided');
  }
});

onUnmounted(() => {
  console.log('[ReplayBrowser] Component unmounting, cleaning up listener');
  if (props.ws) {
    props.ws.removeEventListener('message', handleMessage);
  }
});
</script>

<style scoped>
.replay-browser {
  background: rgba(0, 17, 34, 0.95);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 16px;
  padding: 2rem;
  max-width: 1200px;
  max-height: 80vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.header h2 {
  margin: 0;
  font-size: 2rem;
  color: #0ff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-refresh,
.btn-close {
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #0ff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-refresh:hover,
.btn-close:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.btn-close {
  background: rgba(255, 100, 100, 0.1);
  border-color: rgba(255, 100, 100, 0.3);
  color: #ff6464;
}

.btn-close:hover {
  background: rgba(255, 100, 100, 0.2);
  border-color: #ff6464;
  box-shadow: 0 0 15px rgba(255, 100, 100, 0.3);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #0ff;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.3);
  border-top-color: #0ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: rgba(0, 255, 255, 0.7);
}

.empty-state .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #0ff;
  margin-bottom: 0.5rem;
}

.replays-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.replay-card {
  background: rgba(0, 34, 68, 0.6);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.replay-card:hover {
  border-color: #0ff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.replay-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.replay-header h3 {
  margin: 0;
  color: #0ff;
  font-size: 1.25rem;
  flex: 1;
}

.grid-size {
  background: rgba(0, 255, 255, 0.1);
  color: #0ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
}

.replay-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.info-row .label {
  color: rgba(0, 255, 255, 0.7);
}

.info-row .value {
  color: #fff;
}

.info-row.winner .winner-name {
  font-weight: bold;
  text-shadow: 0 0 5px currentColor;
}

.replay-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.btn-watch,
.btn-delete {
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  border: 1px solid;
}

.btn-watch {
  background: rgba(0, 255, 100, 0.1);
  border-color: rgba(0, 255, 100, 0.3);
  color: #0f8;
}

.btn-watch:hover {
  background: rgba(0, 255, 100, 0.2);
  border-color: #0f8;
  box-shadow: 0 0 15px rgba(0, 255, 100, 0.3);
}

.btn-delete {
  background: rgba(255, 68, 68, 0.1);
  border-color: rgba(255, 68, 68, 0.3);
  color: #f44;
}

.btn-delete:hover:not(:disabled) {
  background: rgba(255, 68, 68, 0.2);
  border-color: #f44;
  box-shadow: 0 0 15px rgba(255, 68, 68, 0.3);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  display: inline-block;
}

/* Scrollbar styling */
.replay-browser::-webkit-scrollbar {
  width: 8px;
}

.replay-browser::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.replay-browser::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 4px;
}

.replay-browser::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}
</style>

