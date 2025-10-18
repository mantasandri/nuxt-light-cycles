<script setup lang="ts">

interface Props {
  lobbyId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gridSize: number;
  isPrivate: boolean;
  state: string;
}

defineProps<Props>();

const emit = defineEmits<{
  join: [lobbyId: string];
  spectate: [lobbyId: string];
}>();

const getStateBadgeVariant = (state: string) => {
  if (state === 'waiting') return 'warning';
  if (state === 'inGame') return 'success';
  return 'default';
};

const getStateLabel = (state: string) => {
  if (state === 'waiting') return '⏳ Waiting';
  if (state === 'inGame') return '🎮 In Game';
  return state;
};
</script>

<template>
  <div
    :class="[
      'bg-cyan-950/60 border-2 rounded-xl p-5 flex flex-col gap-4 transition-all duration-300',
      'border-cyan-400/30',
      (playerCount >= maxPlayers || state !== 'waiting') && 'opacity-60 border-cyan-400/20',
      playerCount < maxPlayers && state === 'waiting' && 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:-translate-y-0.5'
    ]"
  >
    <div class="pb-2.5 border-b border-cyan-400/20">
      <h3 class="text-cyan-400 m-0 text-xl font-semibold">
        {{ isPrivate ? '🔒' : '🌐' }}
        {{ hostName }}'s Lobby
      </h3>
    </div>

    <div class="flex gap-3 flex-wrap">
      <CircuitBadge variant="default" size="sm" icon="👥">
        {{ playerCount }}/{{ maxPlayers }}
      </CircuitBadge>
      
      <CircuitBadge variant="info" size="sm" icon="📏">
        {{ gridSize }}x{{ gridSize }}
      </CircuitBadge>
      
      <CircuitBadge :variant="getStateBadgeVariant(state)" size="sm">
        {{ getStateLabel(state) }}
      </CircuitBadge>
    </div>

    <div class="flex gap-2.5 mt-1">
      <CircuitButton
        variant="primary"
        size="sm"
        :disabled="playerCount >= maxPlayers || state !== 'waiting'"
        @click="emit('join', lobbyId)"
      >
        {{ playerCount >= maxPlayers ? 'Full' : state !== 'waiting' ? 'In Progress' : '▶ Join' }}
      </CircuitButton>
      
      <CircuitButton
        variant="ghost"
        size="sm"
        icon="👁️"
        @click="emit('spectate', lobbyId)"
      >
        Watch
      </CircuitButton>
    </div>
  </div>
</template>

