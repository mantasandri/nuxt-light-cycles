<script setup lang="ts">
interface Props {
  modelValue?: string | number;
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  disabled?: boolean;
  maxlength?: number;
  min?: number;
  max?: number;
  error?: boolean;
  fullWidth?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  error: false,
  fullWidth: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  enter: [];
  blur: [];
  focus: [];
}>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = props.type === 'number' ? Number(target.value) : target.value;
  emit('update:modelValue', value);
};

const handleKeyup = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    emit('enter');
  }
};
</script>

<template>
  <input
    :class="[
      // Base styles
      'px-3 py-2.5 border-2 rounded-md text-sm text-white transition-all duration-200 outline-none',
      // Default state
      'border-cyan-400/30 bg-cyan-400/10',
      // Hover state
      'hover:border-cyan-400/50 hover:bg-cyan-400/[0.12] disabled:hover:border-cyan-400/30 disabled:hover:bg-cyan-400/10',
      // Focus state
      'focus:border-cyan-400 focus:bg-cyan-400/15 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)]',
      // Error state
      error && 'border-red-400/60 bg-red-400/10 focus:border-red-400 focus:shadow-[0_0_10px_rgba(255,100,100,0.3)]',
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed',
      // Width
      fullWidth && 'w-full'
    ]"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :maxlength="maxlength"
    :min="min"
    :max="max"
    @input="handleInput"
    @keyup="handleKeyup"
    @blur="emit('blur')"
    @focus="emit('focus')"
  />
</template>

<style scoped>
/* Remove number input spinners */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>

