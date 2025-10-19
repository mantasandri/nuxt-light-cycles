<script setup lang="ts">
interface Props {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const emit = defineEmits<{
  action: [];
}>()

const iconSize = computed(() => {
  if (props.size === 'sm') return '48px'
  if (props.size === 'lg') return '72px'
  return '64px'
})
</script>

<template>
  <div
    :class="[
      'text-center flex flex-col items-center text-cyan-400/70',
      size === 'sm' && 'gap-3 py-10 px-5',
      size === 'md' && 'gap-6 py-16 px-5',
      size === 'lg' && 'gap-8 py-20 px-5'
    ]"
  >
    <CircuitIcon
      v-if="icon"
      :name="icon"
      class="opacity-60 leading-none flex-shrink-0"
      :style="{ fontSize: iconSize }"
    />
    
    <h3
      :class="[
        'text-cyan-400 m-0 font-semibold leading-snug',
        size === 'sm' && 'text-lg',
        size === 'md' && 'text-2xl',
        size === 'lg' && 'text-[32px]'
      ]"
    >
      {{ title }}
    </h3>
    
    <p
      v-if="message"
      :class="[
        'text-gray-500 m-0 leading-relaxed max-w-md',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-lg'
      ]"
    >
      {{ message }}
    </p>
    
    <CircuitButton
      v-if="actionLabel"
      variant="primary"
      :size="size"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </CircuitButton>
    
    <slot name="actions" />
  </div>
</template>

