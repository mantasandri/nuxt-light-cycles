<script setup lang="ts">
interface Props {
  label: string;
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
})

const model = defineModel<string | number | boolean>()

const emit = defineEmits<{
  'enter': [];
  'change': [value: string | number];
}>()

// Computed for narrower typing to child components
const inputModel = computed({
  get: () => model.value as string | number | undefined,
  set: (val) => { model.value = val }
})

const inputType = computed(() => props.type === 'select' ? 'text' : props.type)
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-cyan-400 text-sm font-semibold flex items-center gap-1">
      {{ label }}
      <span v-if="required" class="text-red-400 font-bold">*</span>
    </label>
    
    <CircuitSelect
      v-if="props.type === 'select' && props.options"
      v-model="inputModel"
      :options="props.options"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      @change="(val) => emit('change', val)"
    />
    
    <CircuitInput
      v-else
      v-model="inputModel"
      :type="inputType"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :maxlength="props.maxlength"
      :min="props.min"
      :max="props.max"
      :error="!!props.error"
      @enter="emit('enter')"
    />
    
    <small v-if="hint && !error" class="text-gray-500 text-xs leading-snug">{{ hint }}</small>
    <small v-if="error" class="text-red-400 text-xs leading-snug font-medium">{{ error }}</small>
  </div>
</template>

