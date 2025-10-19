<script setup lang="ts">
interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: number];
  change: [value: number];
}>();

const decrement = () => {
  if (props.disabled) return;
  const newValue = Math.max(props.min, props.modelValue - props.step);
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue);
    emit('change', newValue);
  }
};

const increment = () => {
  if (props.disabled) return;
  const newValue = Math.min(props.max, props.modelValue + props.step);
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue);
    emit('change', newValue);
  }
};

const isMinReached = computed(() => props.modelValue <= props.min);
const isMaxReached = computed(() => props.modelValue >= props.max);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="text-cyan-400 text-sm font-semibold">{{ label }}</label>
    <div class="flex items-center justify-center gap-4">
      <CircuitButton
        variant="secondary"
        size="sm"
        :disabled="disabled || isMinReached"
        @click="decrement"
      >
        −
      </CircuitButton>
      
      <span class="text-cyan-400 text-2xl font-bold min-w-[50px] text-center shadow-[0_0_8px_rgba(0,255,255,0.5)]">
        {{ modelValue }}
      </span>
      
      <CircuitButton
        variant="secondary"
        size="sm"
        :disabled="disabled || isMaxReached"
        @click="increment"
      >
        +
      </CircuitButton>
    </div>
  </div>
</template>

