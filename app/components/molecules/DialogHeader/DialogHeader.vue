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
    
    <CircuitButton
      v-if="showClose"
      variant="ghost"
      size="sm"
      class="!text-[32px] leading-none !p-0 !min-w-[32px] !min-h-[32px] shrink-0 transition-all hover:rotate-90"
      @click="emit('close')"
    >
      ×
    </CircuitButton>
  </div>
</template>

