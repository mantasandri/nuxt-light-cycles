<script setup lang="ts">

interface Props {
  title: string;
  subtitle?: string;
  showClose?: boolean;
}

withDefaults(defineProps<Props>(), {
  showClose: true,
});

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div class="flex justify-between items-start gap-5 px-6 py-5 border-b border-cyan-400/30">
    <div class="flex-1 flex flex-col gap-1.5">
      <h2 class="text-cyan-400 m-0 text-2xl font-semibold [text-shadow:0_0_10px_rgba(0,255,255,0.5)] leading-tight">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="text-white m-0 text-sm opacity-80 leading-snug">
        {{ subtitle }}
      </p>
    </div>
    
    <button
      v-if="showClose"
      class="w-8 h-8 flex items-center justify-center shrink-0 border-2 border-gray-600 rounded-lg bg-gray-400/20 hover:bg-gray-400/30 hover:border-gray-500 transition-all hover:rotate-90 active:scale-95"
      @click="emit('close')"
    >
      <svg class="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="3" x2="13" y2="13" />
        <line x1="13" y1="3" x2="3" y2="13" />
      </svg>
    </button>
  </div>
</template>

