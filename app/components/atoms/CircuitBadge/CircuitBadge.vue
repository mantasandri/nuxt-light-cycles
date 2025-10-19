<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
})
</script>

<template>
  <span
    :class="[
      // Base styles
      'inline-flex items-center gap-1 rounded border font-semibold whitespace-nowrap leading-none',
      // Sizes
      size === 'sm' && 'px-2 py-0.5 text-[11px]',
      size === 'md' && 'px-3 py-1 text-xs',
      size === 'lg' && 'px-4 py-1.5 text-sm',
      // Variants
      variant === 'default' && 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400',
      variant === 'success' && 'bg-green-400/10 border-green-400/30 text-green-400',
      variant === 'warning' && 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400',
      variant === 'danger' && 'bg-red-400/10 border-red-400/30 text-red-400',
      variant === 'info' && 'bg-blue-400/10 border-blue-400/30 text-blue-400',
      variant === 'ghost' && 'bg-gray-400/10 border-gray-400/30 text-gray-400'
    ]"
  >
    <span v-if="icon" class="inline-flex items-center text-[1.1em]">{{ icon }}</span>
    <slot />
  </span>
</template>

