<script setup lang="ts">
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

<template>
  <div class="bg-[rgba(0,17,34,0.95)] border-2 border-cyan-400/30 rounded-2xl max-w-[1200px] max-h-[80vh] flex flex-col backdrop-blur-[10px] shadow-[0_8px_32px_rgba(0,255,255,0.2)]">
    <DialogHeader
      title="My Replays"
      @close="emit('close')"
    />

    <div class="px-8 py-4 border-b border-cyan-400/20">
      <CircuitButton
        variant="secondary"
        size="sm"
        icon="🔄"
        :disabled="loading"
        @click="refreshReplays"
      >
        Refresh
      </CircuitButton>
    </div>

    <div class="p-8 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-black/30 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-cyan-400/30 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-cyan-400/50">
      <div v-if="loading" class="flex flex-col items-center justify-center p-12 text-cyan-400">
        <div class="w-10 h-10 border-[3px] border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
        <p>Loading replays...</p>
      </div>

      <EmptyState
        v-else-if="replays.length === 0"
        icon="🎮"
        title="No Replays Yet"
        message="Play a game and save the replay to watch it later!"
      />

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        <div 
          v-for="replay in replays" 
          :key="replay.replayId"
          class="bg-[rgba(0,34,68,0.6)] border border-cyan-400/30 rounded-xl p-6 transition-all duration-300 flex flex-col gap-4 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:-translate-y-0.5"
        >
          <div class="flex justify-between items-start gap-4 pb-3 border-b border-cyan-400/20">
            <h3 class="m-0 text-cyan-400 text-xl flex-1 leading-snug">{{ replay.metadata.lobbyName }}</h3>
            <CircuitBadge variant="info" size="sm">
              {{ replay.metadata.gridSize }}x{{ replay.metadata.gridSize }}
            </CircuitBadge>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span class="text-cyan-400/70">Date:</span>
              <span class="text-white">{{ formatDate(replay.metadata.createdAt) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyan-400/70">Duration:</span>
              <span class="text-white">{{ formatDuration(replay.metadata.duration) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-cyan-400/70">Players:</span>
              <span class="text-white">{{ replay.metadata.playerCount }}</span>
            </div>
            <div v-if="replay.metadata.winner" class="flex justify-between text-sm">
              <span class="text-cyan-400/70">Winner:</span>
              <span 
                class="font-bold shadow-[0_0_5px_currentColor]" 
                :style="{ color: replay.metadata.winner.color }"
              >
                {{ replay.metadata.winner.name }}
              </span>
            </div>
            <div v-else class="flex justify-between text-sm">
              <span class="text-cyan-400/70">Result:</span>
              <span class="text-white">Draw</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mt-2">
            <CircuitButton
              variant="success"
              size="sm"
              icon="▶️"
              @click="emit('watch', replay.replayId)"
            >
              Watch
            </CircuitButton>
            <CircuitButton
              variant="danger"
              size="sm"
              icon="🗑️"
              :disabled="deleting === replay.replayId"
              @click="deleteReplay(replay.replayId)"
            >
              {{ deleting === replay.replayId ? 'Deleting...' : 'Delete' }}
            </CircuitButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

