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
  kickPlayer: [playerId: string];
  banPlayer: [playerId: string];
  addAIBot: [];
  removeAIBot: [botId: string];
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

const aiBotsCount = computed(() => {
  return props.lobbyState?.players.filter(p => p.id.startsWith('ai-')).length || 0;
});

const canAddMoreBots = computed(() => {
  if (!props.lobbyState) return false;
  return props.lobbyState.players.length < props.lobbyState.settings.maxPlayers;
});

const gridSizeOptions = [
  { value: 30, label: 'Small (30x30)' },
  { value: 40, label: 'Medium (40x40)' },
  { value: 50, label: 'Large (50x50)' },
  { value: 60, label: 'XL (60x60)' },
];

const maxPlayersOptions = [
  { value: 2, label: '2 Players' },
  { value: 4, label: '4 Players' },
  { value: 6, label: '6 Players' },
  { value: 8, label: '8 Players' },
];

const updateGridSize = (size: number) => {
  if (!isHost.value) return;
  emit('updateSettings', { gridSize: size });
};

const updateMaxPlayers = (max: number) => {
  if (!isHost.value) return;
  emit('updateSettings', { maxPlayers: max });
};

const togglePrivate = (value: boolean) => {
  if (!isHost.value) return;
  emit('updateSettings', { isPrivate: value });
};
</script>

<template>
  <div v-if="lobbyState" class="bg-cyan-950/95 border-2 border-cyan-400 rounded-xl p-5 max-w-[600px] my-5 mx-auto shadow-[0_0_20px_rgba(0,255,255,0.3)]">
    <div class="flex justify-between items-center mb-5 pb-4 border-b border-cyan-400/30">
      <h2 class="text-cyan-400 m-0 text-xl">Lobby: {{ lobbyState.lobbyId }}</h2>
      <span
        :class="[
          'px-3 py-1 rounded text-xs uppercase font-semibold tracking-wider',
          lobbyState.state === 'waiting' && 'bg-yellow-400/20 text-yellow-400 border border-yellow-400',
          lobbyState.state === 'starting' && 'bg-orange-400/20 text-orange-400 border border-orange-400 animate-[pulse_1s_infinite]',
          lobbyState.state === 'inGame' && 'bg-green-400/20 text-green-400 border border-green-400'
        ]"
      >
        {{ lobbyState.state }}
      </span>
    </div>

    <!-- Settings section (host only) -->
    <div v-if="isHost" class="mb-5 p-4 bg-cyan-400/5 border border-cyan-400/20 rounded-lg">
      <h3 class="text-cyan-400 m-0 mb-4 text-base">⚙️ Lobby Settings</h3>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <FormField
          :model-value="lobbyState.settings.gridSize"
          label="Grid Size"
          type="select"
          :options="gridSizeOptions"
          @update:model-value="updateGridSize"
        />

        <FormField
          :model-value="lobbyState.settings.maxPlayers"
          label="Max Players"
          type="select"
          :options="maxPlayersOptions"
          @update:model-value="updateMaxPlayers"
        />

        <div class="flex items-center pt-5">
          <CircuitCheckbox
            :model-value="lobbyState.settings.isPrivate"
            label="Private Lobby"
            @update:model-value="togglePrivate"
          />
        </div>
      </div>
    </div>

    <!-- AI Bot Controls (host only) -->
    <div v-if="isHost && lobbyState.state === 'waiting'" class="mb-5 p-4 bg-purple-400/5 border border-purple-400/20 rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-purple-400 m-0 text-base">🤖 AI Bot Controls</h3>
        <span class="text-purple-400 text-sm">{{ aiBotsCount }} bot{{ aiBotsCount !== 1 ? 's' : '' }}</span>
      </div>
      <CircuitButton
        variant="primary"
        size="sm"
        :disabled="!canAddMoreBots"
        @click="emit('addAIBot')"
      >
        ➕ Add AI Bot
      </CircuitButton>
      <p v-if="!canAddMoreBots" class="text-purple-400/60 text-xs mt-2 mb-0">
        Lobby is full ({{ lobbyState.players.length }}/{{ lobbyState.settings.maxPlayers }})
      </p>
    </div>

    <!-- Players list -->
    <div class="mb-5">
      <h3 class="text-cyan-400 m-0 mb-4 text-base">👥 Players ({{ lobbyState.players.length }}/{{ lobbyState.settings.maxPlayers }})</h3>
      <div class="flex flex-col gap-2.5">
        <PlayerCard
          v-for="player in lobbyState.players"
          :key="player.id"
          :player-id="player.id"
          :name="player.name"
          :color="player.color"
          :is-ready="player.isReady"
          :is-host="player.id === lobbyState.hostId"
          :is-you="player.id === currentPlayerId"
          :is-a-i-bot="player.id.startsWith('ai-')"
          :show-host-controls="isHost && lobbyState.state === 'waiting'"
          @kick="emit('kickPlayer', $event)"
          @ban="emit('banPlayer', $event)"
          @remove-bot="emit('removeAIBot', $event)"
        />
      </div>
    </div>

    <!-- Spectators list -->
    <div v-if="lobbyState.spectators && lobbyState.spectators.length > 0" class="mb-5">
      <h3 class="text-cyan-400 m-0 mb-4 text-base">👁️ Spectators ({{ lobbyState.spectators.length }})</h3>
      <div class="flex flex-col gap-2.5">
        <PlayerCard
          v-for="spectator in lobbyState.spectators"
          :key="spectator.id"
          :player-id="spectator.id"
          :name="spectator.name"
          :color="spectator.color"
          :is-you="spectator.id === currentPlayerId"
          :is-spectator="true"
          size="sm"
        />
      </div>
    </div>

    <!-- Ready button or Countdown -->
    <div class="flex flex-col gap-2.5 items-center">
      <!-- Show countdown if in starting state -->
      <div v-if="lobbyState.state === 'starting' && lobbyState.countdownRemaining !== null" class="flex flex-col items-center gap-2.5 p-5 bg-orange-400/10 border-2 border-orange-400 rounded-xl animate-[pulse_1s_infinite]">
        <div class="text-[72px] font-black text-orange-400 leading-none">
          {{ lobbyState.countdownRemaining }}
        </div>
        <p class="text-orange-400 text-lg font-semibold uppercase tracking-[2px] m-0">
          Game starting...
        </p>
      </div>
      
      <!-- Show ready button if in waiting state -->
      <template v-else-if="lobbyState.state === 'waiting'">
        <div v-if="!isSpectator" class="flex gap-3 w-full">
          <CircuitButton
            :variant="isReady ? 'danger' : 'primary'"
            full-width
            @click="emit('toggleReady')"
          >
            {{ isReady ? '❌ Cancel' : '✓ Ready Up' }}
          </CircuitButton>
          
          <CircuitButton
            variant="ghost"
            @click="emit('leaveLobby')"
          >
            🚪 Leave Lobby
          </CircuitButton>
        </div>

        <div v-else class="flex gap-3 w-full">
          <CircuitButton
            variant="ghost"
            full-width
            @click="emit('leaveLobby')"
          >
            🚪 Stop Spectating
          </CircuitButton>
        </div>

        <p v-if="canStart" class="text-green-400 font-semibold m-0 animate-[pulse_1.5s_infinite]">
          🎮 All players ready! Game starting soon...
        </p>
        <p v-else-if="lobbyState.players.length === 1" class="text-cyan-400 m-0 opacity-80 text-sm">
          Waiting for more players to join...
        </p>
        <p v-else-if="!isSpectator" class="text-cyan-400 m-0 opacity-80 text-sm">
          Waiting for all players to ready up...
        </p>
        <p v-else class="text-cyan-400 m-0 opacity-80 text-sm">
          Watching as spectator...
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>

