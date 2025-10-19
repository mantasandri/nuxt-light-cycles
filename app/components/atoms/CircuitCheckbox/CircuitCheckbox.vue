<script setup lang="ts">
interface Props {
  modelValue?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
  variant?: 'default' | 'inline';
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  change: [value: boolean];
}>();

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', target.checked);
};
</script>

<template>
  <label
    :class="[
      // Base wrapper styles
      'group flex gap-2.5 cursor-pointer select-none',
      variant === 'inline' ? 'items-center' : 'items-start',
      disabled && 'opacity-50 cursor-not-allowed'
    ]"
  >
    <!-- Hidden native checkbox -->
    <input
      type="checkbox"
      class="sr-only"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
    
    <!-- Custom checkbox box -->
    <span
      :class="[
        'relative w-6 h-6 min-w-[24px] border-2 rounded flex items-center justify-center transition-all duration-200',
        modelValue ? 'bg-cyan-400 border-cyan-400' : 'border-cyan-400 bg-transparent',
        !disabled && !modelValue && 'group-hover:bg-cyan-400/10 group-hover:shadow-[0_0_8px_rgba(0,255,255,0.3)]',
      ]"
    >
      <span v-if="modelValue" class="text-cyan-950 text-lg font-bold leading-none">✓</span>
    </span>
    
    <!-- Label and hint content -->
    <span
      v-if="label || $slots.default"
      :class="[
        'flex flex-1 gap-1',
        variant === 'inline' ? 'flex-row items-center gap-2' : 'flex-col'
      ]"
    >
      <span
        :class="[
          'text-cyan-400 font-semibold leading-snug',
          variant === 'inline' ? 'text-sm' : 'text-base'
        ]"
      >
        <slot>{{ label }}</slot>
      </span>
      <small
        v-if="hint"
        :class="[
          'text-gray-500 leading-snug block',
          variant === 'inline' ? 'text-[11px]' : 'text-xs'
        ]"
      >
        {{ hint }}
      </small>
    </span>
  </label>
</template>

