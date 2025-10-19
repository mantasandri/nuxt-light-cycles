<script setup lang="ts">
interface Props {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  animated?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  animated: false,
})

const sizeMap = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center justify-center leading-none align-middle select-none',
      size === 'xs' && 'w-3 h-3',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-5 h-5',
      size === 'lg' && 'w-6 h-6',
      size === 'xl' && 'w-8 h-8',
      animated && 'animate-spin'
    ]"
    :style="{ fontSize: sizeMap[size], color: color }"
  >
    <slot>{{ name }}</slot>
  </span>
</template>

