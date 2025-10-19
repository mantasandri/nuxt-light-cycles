<script setup lang="ts">
interface Option {
  value: string | number;
  label: string;
}

interface Props {
  label: string;
  modelValue?: string | number | boolean;
  type?: 'text' | 'number' | 'select';
  options?: Option[];
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxlength?: number;
  min?: number;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean];
  enter?: [];
  change?: [value: string | number];
}>();

const handleUpdate = (value: string | number | boolean) => {
  emit('update:modelValue', value);
};

const handleChange = (value: string | number) => {
  emit('change', value);
};
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-cyan-400 text-sm font-semibold flex items-center gap-1">
      {{ label }}
      <span v-if="required" class="text-red-400 font-bold">*</span>
    </label>
    
    <CircuitSelect
      v-if="type === 'select' && options"
      :model-value="modelValue"
      :options="options"
      :placeholder="placeholder"
      :disabled="disabled"
      @update:model-value="handleUpdate"
      @change="handleChange"
    />
    
    <CircuitInput
      v-else
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :min="min"
      :max="max"
      :error="!!error"
      @update:model-value="handleUpdate"
      @enter="emit('enter')"
    />
    
    <small v-if="hint && !error" class="text-gray-500 text-xs leading-snug">{{ hint }}</small>
    <small v-if="error" class="text-red-400 text-xs leading-snug font-medium">{{ error }}</small>
  </div>
</template>

