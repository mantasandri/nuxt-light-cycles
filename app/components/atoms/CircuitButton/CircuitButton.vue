<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  fullWidth: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent];
}>()

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="[
      // Base styles
      'inline-flex items-center justify-center gap-2 border-2 rounded-lg cursor-pointer font-semibold transition-all duration-200 whitespace-nowrap select-none active:scale-[0.98]',
      // Sizes
      size === 'sm' && 'px-3 py-1.5 text-[13px]',
      size === 'md' && 'px-5 py-2.5 text-sm',
      size === 'lg' && 'px-7 py-3.5 text-base',
      // Variants
      variant === 'primary' && 'bg-cyan-400 border-cyan-400 text-cyan-950 hover:bg-cyan-500 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,255,255,0.5)]',
      variant === 'secondary' && 'bg-cyan-400/10 border-cyan-400 text-cyan-400 hover:bg-cyan-400/20 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]',
      variant === 'danger' && 'bg-red-400/20 border-red-400/60 text-red-400 hover:bg-red-400/30 hover:border-red-400 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(255,100,100,0.3)]',
      variant === 'ghost' && 'bg-gray-400/20 border-gray-600 text-gray-500 hover:bg-gray-400/30 hover:border-gray-500 hover:text-gray-400',
      variant === 'success' && 'bg-green-400/20 border-green-400/60 text-green-400 hover:bg-green-400/30 hover:border-green-400 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,255,100,0.3)]',
      // States
      disabled && 'opacity-50 cursor-not-allowed',
      fullWidth && 'w-full'
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <span v-if="icon" class="inline-flex items-center text-[1.2em] leading-none">{{ icon }}</span>
    <slot />
  </button>
</template>

