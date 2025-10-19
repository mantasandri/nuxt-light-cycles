<template>
  <div v-show="isVisible" class="dpad-container">
    <!-- Brake button (top left) -->
    <button
      class="brake-button"
      :class="{ active: isBraking }"
      @touchstart.prevent="handleBrakeStart"
      @touchend.prevent="handleBrakeEnd"
      @mousedown.prevent="handleBrakeStart"
      @mouseup.prevent="handleBrakeEnd"
    >
      <span class="brake-icon">🛑</span>
      <span class="brake-label">BRAKE</span>
    </button>

    <!-- D-Pad control (bottom right) -->
    <div class="dpad-wrapper">
      <svg class="dpad-svg" viewBox="0 0 200 200">
        <!-- Background circle -->
        <circle
          cx="100"
          cy="100"
          r="95"
          class="dpad-background"
        />
        
        <!-- Up arrow -->
        <path
          d="M 100 30 L 130 70 L 110 70 L 110 100 L 90 100 L 90 70 L 70 70 Z"
          class="dpad-arrow"
          :class="{ active: activeDirection === 'up' }"
          @touchstart.prevent="() => handleDirectionStart('up')"
          @touchend.prevent="handleDirectionEnd"
          @mousedown.prevent="() => handleDirectionStart('up')"
          @mouseup.prevent="handleDirectionEnd"
        />
        
        <!-- Down arrow -->
        <path
          d="M 100 170 L 70 130 L 90 130 L 90 100 L 110 100 L 110 130 L 130 130 Z"
          class="dpad-arrow"
          :class="{ active: activeDirection === 'down' }"
          @touchstart.prevent="() => handleDirectionStart('down')"
          @touchend.prevent="handleDirectionEnd"
          @mousedown.prevent="() => handleDirectionStart('down')"
          @mouseup.prevent="handleDirectionEnd"
        />
        
        <!-- Left arrow -->
        <path
          d="M 30 100 L 70 70 L 70 90 L 100 90 L 100 110 L 70 110 L 70 130 Z"
          class="dpad-arrow"
          :class="{ active: activeDirection === 'left' }"
          @touchstart.prevent="() => handleDirectionStart('left')"
          @touchend.prevent="handleDirectionEnd"
          @mousedown.prevent="() => handleDirectionStart('left')"
          @mouseup.prevent="handleDirectionEnd"
        />
        
        <!-- Right arrow -->
        <path
          d="M 170 100 L 130 130 L 130 110 L 100 110 L 100 90 L 130 90 L 130 70 Z"
          class="dpad-arrow"
          :class="{ active: activeDirection === 'right' }"
          @touchstart.prevent="() => handleDirectionStart('right')"
          @touchend.prevent="handleDirectionEnd"
          @mousedown.prevent="() => handleDirectionStart('right')"
          @mouseup.prevent="handleDirectionEnd"
        />
        
        <!-- Center circle -->
        <circle
          cx="100"
          cy="100"
          r="25"
          class="dpad-center"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isVisible?: boolean;
}

withDefaults(defineProps<Props>(), {
  isVisible: true,
});

const emit = defineEmits<{
  direction: [direction: 'up' | 'down' | 'left' | 'right'];
  brake: [braking: boolean];
}>();

const activeDirection = ref<'up' | 'down' | 'left' | 'right' | null>(null);
const isBraking = ref(false);

const handleDirectionStart = (direction: 'up' | 'down' | 'left' | 'right') => {
  activeDirection.value = direction;
  emit('direction', direction);
  
  // Haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};

const handleDirectionEnd = () => {
  activeDirection.value = null;
};

const handleBrakeStart = () => {
  isBraking.value = true;
  emit('brake', true);
  
  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate(15);
  }
};

const handleBrakeEnd = () => {
  isBraking.value = false;
  emit('brake', false);
};
</script>

<style scoped>
.dpad-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1000;
}

/* Brake button - positioned to the left of D-pad for one-handed use */
.brake-button {
  position: absolute;
  bottom: 60px; /* Aligned vertically with D-pad center */
  right: 200px; /* To the left of the D-pad */
  width: 70px;
  height: 70px;
  background: rgba(255, 100, 100, 0.2);
  border: 3px solid rgba(255, 100, 100, 0.6);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.brake-button.active {
  background: rgba(255, 100, 100, 0.5);
  border-color: rgba(255, 100, 100, 1);
  transform: scale(0.95);
  box-shadow: 0 0 20px rgba(255, 100, 100, 0.6);
}

.brake-icon {
  font-size: 28px;
  line-height: 1;
}

.brake-label {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 5px rgba(255, 100, 100, 0.8);
  letter-spacing: 0.5px;
}

/* D-Pad - bottom right */
.dpad-wrapper {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 160px;
  height: 160px;
  pointer-events: auto;
}

.dpad-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.3));
}

.dpad-background {
  fill: rgba(0, 20, 40, 0.8);
  stroke: rgba(0, 255, 255, 0.4);
  stroke-width: 2;
}

.dpad-arrow {
  fill: rgba(0, 255, 255, 0.3);
  stroke: rgba(0, 255, 255, 0.6);
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}

.dpad-arrow.active {
  fill: rgba(0, 255, 255, 0.8);
  stroke: rgba(0, 255, 255, 1);
  filter: drop-shadow(0 0 8px rgba(0, 255, 255, 0.8));
}

.dpad-center {
  fill: rgba(0, 100, 150, 0.5);
  stroke: rgba(0, 255, 255, 0.5);
  stroke-width: 2;
  pointer-events: none;
}

/* Tablet and larger screens - make controls slightly bigger */
@media (min-width: 768px) {
  .brake-button {
    width: 90px;
    height: 90px;
    bottom: 85px; /* Aligned with larger D-pad center */
    right: 250px; /* To the left of larger D-pad */
  }
  
  .brake-icon {
    font-size: 36px;
  }
  
  .brake-label {
    font-size: 12px;
  }
  
  .dpad-wrapper {
    width: 200px;
    height: 200px;
    bottom: 30px;
    right: 30px;
  }
}

/* Hide on desktop (we have keyboard) */
@media (min-width: 1024px) and (pointer: fine) {
  .dpad-container {
    display: none;
  }
}

/* Landscape phone adjustments */
@media (max-width: 896px) and (orientation: landscape) {
  .brake-button {
    width: 60px;
    height: 60px;
    bottom: 50px; /* Aligned with smaller D-pad center in landscape */
    right: 170px; /* To the left of smaller D-pad */
  }
  
  .brake-icon {
    font-size: 24px;
  }
  
  .brake-label {
    font-size: 8px;
  }
  
  .dpad-wrapper {
    width: 140px;
    height: 140px;
    bottom: 15px;
    right: 15px;
  }
}
</style>

