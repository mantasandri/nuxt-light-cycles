<script setup lang="ts">
interface Props {
  modelValue?: string | number;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  fullWidth: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number];
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value
  
  // Convert to number if the original option value was a number
  const option = props.options.find(opt => String(opt.value) === value)
  const finalValue = option ? option.value : value
  
  emit('update:modelValue', finalValue)
  emit('change', finalValue)
}
</script>

<template>
  <select
    :class="[
      // Base styles
      'px-3 py-2.5 pr-9 border-2 rounded-md text-sm text-white cursor-pointer transition-all duration-200 outline-none appearance-none',
      'border-cyan-400/30 bg-cyan-400/10',
      // Background chevron icon
      'bg-[url(data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%2300ffff%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3e%3cpolyline%20points=%276%209%2012%2015%2018%209%27%3e%3c/polyline%3e%3c/svg%3e)]',
      'bg-[right_8px_center] bg-no-repeat bg-[length:20px]',
      // Hover state
      'hover:border-cyan-400/50 hover:bg-cyan-400/[0.12] disabled:hover:border-cyan-400/30 disabled:hover:bg-cyan-400/10',
      // Focus state
      'focus:border-cyan-400 focus:bg-cyan-400/15 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)]',
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed',
      // Width
      fullWidth && 'w-full'
    ]"
    :value="modelValue"
    :disabled="disabled"
    @change="handleChange"
  >
    <option v-if="placeholder" value="" disabled selected>
      {{ placeholder }}
    </option>
    <option
      v-for="option in options"
      :key="String(option.value)"
      :value="option.value"
      class="bg-cyan-950 text-white p-2 hover:bg-cyan-400/20"
    >
      {{ option.label }}
    </option>
  </select>
</template>

