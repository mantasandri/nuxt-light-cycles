<script setup lang="ts">
interface Props {
  playerId: string;
  name: string;
  color: string;
  isReady?: boolean;
  isHost?: boolean;
  isYou?: boolean;
  isSpectator?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showHostControls?: boolean; // Show kick/ban buttons for host
  isAIBot?: boolean; // Is this an AI bot
}

withDefaults(defineProps<Props>(), {
  isReady: false,
  isHost: false,
  isYou: false,
  isSpectator: false,
  size: 'md',
  showHostControls: false,
  isAIBot: false,
})

const emit = defineEmits<{
  kick: [playerId: string];
  ban: [playerId: string];
  removeBot: [botId: string];
}>()

const sizeMap = {
  sm: { color: 32, name: 14 },
  md: { color: 40, name: 16 },
  lg: { color: 48, name: 18 },
}
</script>

<template>
  <div
    :class="[
      'flex items-center rounded-lg border transition-all duration-300',
      size === 'sm' && 'gap-2 p-2',
      size === 'md' && 'gap-3 p-3',
      size === 'lg' && 'gap-4 p-4',
      isReady && 'bg-green-400/[0.08] border-green-400/40',
      !isReady && !isSpectator && 'bg-cyan-400/5 border-cyan-400/20',
      isYou && 'shadow-[0_0_10px_rgba(0,255,255,0.3)] !border-cyan-400',
      isSpectator && 'bg-gray-400/5 border-gray-400/20 opacity-80'
    ]"
  >
    <div
      :class="[
        'rounded-lg border-2 shrink-0 shadow-[0_0_8px_currentColor]',
        isSpectator ? 'border-gray-500' : 'border-cyan-400'
      ]"
      :style="{
        backgroundColor: color,
        width: `${sizeMap[size].color}px`,
        height: `${sizeMap[size].color}px`
      }"
    />
    
    <div class="flex-1 flex flex-col gap-1.5 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-white font-medium leading-tight" :style="{ fontSize: `${sizeMap[size].name}px` }">
          {{ name }}
        </span>
        <span v-if="isYou" class="text-cyan-400 text-xs font-semibold bg-cyan-400/15 px-1.5 py-0.5 rounded">
          You
        </span>
        <span v-if="isHost" class="text-sm leading-none">👑</span>
        <span v-if="isAIBot" class="text-purple-400 text-xs font-semibold bg-purple-400/15 px-1.5 py-0.5 rounded">
          🤖 AI
        </span>
      </div>
      
      <div v-if="!isSpectator" class="flex items-center">
        <CircuitBadge
          v-if="isReady"
          variant="success"
          size="sm"
          icon="✓"
        >
          Ready
        </CircuitBadge>
        <CircuitBadge
          v-else
          variant="ghost"
          size="sm"
        >
          Waiting...
        </CircuitBadge>
      </div>
    </div>

    <!-- Host controls (kick/ban buttons) -->
    <div v-if="showHostControls && !isYou" class="flex gap-1.5 ml-2">
      <CircuitButton
        v-if="isAIBot"
        variant="danger"
        size="sm"
        title="Remove bot"
        @click="emit('removeBot', playerId)"
      >
        ❌
      </CircuitButton>
      <template v-else>
        <CircuitButton
          variant="ghost"
          size="sm"
          title="Kick player"
          @click="emit('kick', playerId)"
        >
          👢
        </CircuitButton>
        <CircuitButton
          variant="danger"
          size="sm"
          title="Ban player"
          @click="emit('ban', playerId)"
        >
          🚫
        </CircuitButton>
      </template>
    </div>
  </div>
</template>

