<script setup lang="ts">
import { AVATAR_OPTIONS } from '~/composables/usePlayerSettings'

const props = defineProps<{
  isConfigured: boolean
  initialName?: string
  initialColor?: string
  initialColorHex?: string
  initialAvatar?: string
}>()

const emit = defineEmits<{
  save: [settings: PlayerSettings]
  cancel: []
}>()

const tempName = ref(props.initialName || '')
const tempColor = ref(props.initialColor || 'hsl(180, 90%, 60%)')
const tempColorHex = ref(props.initialColorHex || '#00ffff')
const tempAvatar = ref(props.initialAvatar || 'recognizer')

const handleColorSquareClick = () => {
  if (typeof window !== 'undefined') {
    const input = window.document.querySelector('.hidden-color-input') as HTMLInputElement
    input?.click()
  }
}

const handleRandomColor = () => {
  const color = generateRandomColor()
  tempColor.value = color.hsl
  tempColorHex.value = color.hex
}

const handleSave = () => {
  if (!tempName.value.trim()) return
  
  emit('save', {
    name: tempName.value.trim(),
    color: tempColor.value,
    colorHex: tempColorHex.value,
    avatar: tempAvatar.value,
  })
}

const handleColorInput = () => {
  tempColor.value = hexToHSL(tempColorHex.value) || tempColor.value
}
</script>

<template>
  <div class="name-dialog">
    <div class="name-dialog-content">
      <h2>{{ isConfigured ? 'Update Settings' : 'Welcome to Circuit Breaker!' }}</h2>
      <div class="input-group">
        <label for="playerName">Your Name:</label>
        <input 
          id="playerName"
          v-model="tempName" 
          placeholder="Enter your name"
          maxlength="20"
          class="name-input"
          @keyup.enter="handleSave"
        >
      </div>
      
      <div class="input-group">
        <label>Your Avatar:</label>
        <div class="avatar-picker">
          <div 
            v-for="avatar in AVATAR_OPTIONS" 
            :key="avatar.id"
            class="avatar-option"
            :class="{ 'selected': tempAvatar === avatar.id }"
            :title="avatar.label"
            @click="tempAvatar = avatar.id"
          >
            <div class="avatar-icon" v-html="avatar.svg"/>
          </div>
        </div>
      </div>
      
      <div class="input-group">
        <label>Your Color:</label>
        <div class="color-picker">
          <input 
            v-model="tempColorHex" 
            type="color"
            class="hidden-color-input"
            @input="handleColorInput"
          >
          <div 
            class="color-square" 
            :style="{ backgroundColor: tempColor }"
            @click="handleColorSquareClick"
          />
          <button
            class="random-color-btn" 
            @click="handleRandomColor"
          >
            🎲 Random Color
          </button>
        </div>
      </div>
      <button class="start-btn" @click="handleSave">
        {{ isConfigured ? 'Save & Continue' : 'Continue' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.name-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.name-dialog-content {
  background: rgba(0, 20, 20, 0.95);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid #0ff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
              inset 0 0 30px rgba(0, 255, 255, 0.1);
  min-width: 400px;
}

.name-dialog h2 {
  color: #0ff;
  margin: 0 0 30px;
  font-size: 28px;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.input-group {
  margin: 25px 0;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 12px;
  color: #0ff;
  font-size: 18px;
  font-weight: 500;
}

.name-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #0ff;
  background: rgba(0, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
  font-size: 18px;
  transition: all 0.3s ease;
}

.name-input:focus {
  outline: none;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  background: rgba(0, 255, 255, 0.15);
}

.avatar-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.avatar-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-option:hover {
  border-color: rgba(0, 255, 255, 0.6);
  background: rgba(0, 255, 255, 0.1);
  transform: scale(1.05);
}

.avatar-option.selected {
  border-color: #0ff;
  background: rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
}

.avatar-icon {
  width: 32px;
  height: 32px;
  color: #0ff;
}

.avatar-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}

.avatar-option:hover .avatar-icon {
  color: #0ff;
}

.avatar-option.selected .avatar-icon {
  color: #0ff;
  filter: drop-shadow(0 0 4px #0ff);
}

.color-picker {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
  position: relative;
}

.color-square {
  width: 60px;
  height: 60px;
  border: 2px solid #0ff;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-square:hover {
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
}

.random-color-btn {
  width: 100%;
  padding: 12px;
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid #0ff;
  color: #0ff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.random-color-btn:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: scale(1.02);
}

.start-btn {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  background: #0ff;
  border: none;
  border-radius: 8px;
  color: #001414;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.hidden-color-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
}
</style>

