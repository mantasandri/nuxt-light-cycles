<script setup lang="ts">
const emit = defineEmits<{
  joinLobby: [lobbyId: string];
  spectateGame: [lobbyId: string];
  createLobby: [];
  changeSettings: [];
  openReplays: [];
}>()

defineProps<{
  playerName: string;
}>()

const lobbies = ref<LobbyInfo[]>([])
const isLoading = ref(false)
const autoRefresh = ref(true)
const refreshInterval = ref<NodeJS.Timeout | null>(null)

// Mock function - will be replaced with actual WebSocket call
const fetchLobbies = async () => {
  isLoading.value = true
  
  // TODO: Replace with actual WebSocket message to get lobby list
  // For now, we'll emit this through the parent component
  // The parent will handle the WebSocket communication
  
  isLoading.value = false
}

const refresh = () => {
  fetchLobbies()
}

// Watch autoRefresh and toggle accordingly
watch(autoRefresh, (value) => {
  if (value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  refreshInterval.value = setInterval(() => {
    fetchLobbies()
  }, 3000) // Refresh every 3 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

onMounted(() => {
  fetchLobbies()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Expose fetchLobbies for parent component
defineExpose({
  updateLobbies: (newLobbies: LobbyInfo[]) => {
    lobbies.value = newLobbies
  }
})
</script>

<template>
  <div class="max-w-[900px] mx-auto p-5">
    <div class="flex justify-between items-start mb-8 pb-5 border-b-2 border-cyan-400/30 max-md:flex-col max-md:gap-4">
      <div>
        <h2 class="text-cyan-400 m-0 mb-2.5 text-[28px] [text-shadow:0_0_10px_rgba(0,255,255,0.5)]">
          🎮 Available Lobbies
        </h2>
        <p class="text-gray-500 m-0 text-sm">
          Playing as: <span class="text-cyan-400 font-semibold">{{ playerName }}</span>
        </p>
      </div>
      <div>
        <CircuitButton
          variant="secondary"
          size="sm"
          icon="⚙️"
          @click="emit('changeSettings')"
        >
          Change Name/Color
        </CircuitButton>
      </div>
    </div>

    <div class="flex gap-4 mb-5 items-center flex-wrap max-md:flex-col max-md:items-stretch">
      <CircuitButton
        variant="secondary"
        size="sm"
        icon="🔄"
        :disabled="isLoading"
        @click="refresh"
      >
        Refresh
      </CircuitButton>
      
      <CircuitCheckbox
        v-model="autoRefresh"
        variant="inline"
        label="Auto-refresh"
      />

      <div class="flex-1 min-w-[20px] max-md:hidden" />

      <CircuitButton
        variant="primary"
        size="sm"
        icon="➕"
        @click="emit('createLobby')"
      >
        Create Lobby
      </CircuitButton>

      <CircuitButton
        variant="secondary"
        size="sm"
        icon="🎬"
        @click="emit('openReplays')"
      >
        My Replays
      </CircuitButton>
    </div>

    <div class="flex flex-col gap-4">
      <EmptyState
        v-if="lobbies.length === 0"
        icon="🎯"
        title="No lobbies available"
        message="Create a new lobby to get started!"
        action-label="Create Lobby"
        @action="emit('createLobby')"
      />

      <LobbyCard
        v-for="lobby in lobbies"
        :key="lobby.lobbyId"
        v-bind="lobby"
        @join="emit('joinLobby', $event)"
        @spectate="emit('spectateGame', $event)"
      />
    </div>
  </div>
</template>

