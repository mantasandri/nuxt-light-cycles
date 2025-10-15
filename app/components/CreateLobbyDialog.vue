<script setup lang="ts">
import { ref } from 'vue';

interface LobbySettings {
  isPrivate: boolean;
  gridSize: number;
  maxPlayers: number;
  allowSpectators: boolean;
  enableAI: boolean;
  aiPlayerCount: number;
}

const emit = defineEmits<{
  create: [settings: LobbySettings];
  cancel: [];
}>();

const settings = ref<LobbySettings>({
  isPrivate: false,
  gridSize: 40,
  maxPlayers: 8,
  allowSpectators: true,
  enableAI: false,
  aiPlayerCount: 1,
});

const create = () => {
  emit('create', settings.value);
};
</script>

<template>
  <div class="dialog-overlay" @click.self="emit('cancel')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>Create New Lobby</h2>
        <button @click="emit('cancel')" class="close-btn">×</button>
      </div>

      <div class="dialog-body">
        <div class="setting-group">
          <label class="setting-label">Grid Size</label>
          <select v-model="settings.gridSize" class="setting-select">
            <option :value="30">Small (30x30)</option>
            <option :value="40">Medium (40x40)</option>
            <option :value="50">Large (50x50)</option>
            <option :value="60">Extra Large (60x60)</option>
          </select>
        </div>

        <div class="setting-group">
          <label class="setting-label">Max Players</label>
          <select v-model="settings.maxPlayers" class="setting-select">
            <option :value="2">2 Players</option>
            <option :value="4">4 Players</option>
            <option :value="6">6 Players</option>
            <option :value="8">8 Players</option>
          </select>
        </div>

        <div class="setting-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.isPrivate" />
            <span>🔒 Private Lobby</span>
            <small>Only players with the link can join</small>
          </label>
        </div>

        <div class="setting-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="settings.allowSpectators" />
            <span>👁️ Allow Spectators</span>
            <small>Others can watch without playing</small>
          </label>
        </div>

        <div class="ai-section">
          <div class="setting-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="settings.enableAI" />
              <span>🤖 Add AI Players</span>
              <small>Practice against computer opponents</small>
            </label>
          </div>

          <div v-if="settings.enableAI" class="ai-controls">
            <label class="setting-label">Number of AI Players</label>
            <div class="ai-counter">
              <button 
                @click="settings.aiPlayerCount = Math.max(1, settings.aiPlayerCount - 1)"
                class="counter-btn"
              >
                −
              </button>
              <span class="counter-value">{{ settings.aiPlayerCount }}</span>
              <button 
                @click="settings.aiPlayerCount = Math.min(settings.maxPlayers - 1, settings.aiPlayerCount + 1)"
                class="counter-btn"
              >
                +
              </button>
            </div>
            <small class="ai-hint">
              You + {{ settings.aiPlayerCount }} AI = {{ settings.aiPlayerCount + 1 }} total players
            </small>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="emit('cancel')" class="cancel-btn">
          Cancel
        </button>
        <button @click="create" class="create-btn">
          Create Lobby
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-content {
  background: rgba(0, 20, 20, 0.98);
  border: 2px solid #0ff;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
}

.dialog-header h2 {
  color: #0ff;
  margin: 0;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.close-btn {
  background: transparent;
  border: none;
  color: #0ff;
  font-size: 32px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #fff;
  transform: rotate(90deg);
}

.dialog-body {
  padding: 25px;
  max-height: 60vh;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  color: #0ff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.setting-select {
  width: 100%;
  background: rgba(0, 255, 255, 0.1);
  border: 2px solid rgba(0, 255, 255, 0.3);
  color: #fff;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.setting-select:hover,
.setting-select:focus {
  border-color: #0ff;
  background: rgba(0, 255, 255, 0.15);
  outline: none;
}

.checkbox-group {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 6px;
  padding: 15px;
}

.checkbox-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkbox-label input[type="checkbox"] + span {
  color: #0ff;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  padding-left: 35px;
}

.checkbox-label input[type="checkbox"] + span::before {
  content: '';
  position: absolute;
  left: 0;
  width: 24px;
  height: 24px;
  border: 2px solid #0ff;
  border-radius: 4px;
  background: rgba(0, 255, 255, 0.1);
  transition: all 0.2s;
}

.checkbox-label input[type="checkbox"]:checked + span::before {
  background: #0ff;
}

.checkbox-label input[type="checkbox"]:checked + span::after {
  content: '✓';
  position: absolute;
  left: 6px;
  top: 0px;
  font-size: 18px;
  color: #001414;
  font-weight: bold;
}

.checkbox-label small {
  color: #888;
  font-size: 12px;
  padding-left: 35px;
}

.ai-section {
  margin-top: 25px;
  padding-top: 25px;
  border-top: 1px solid rgba(0, 255, 255, 0.2);
}

.ai-controls {
  margin-top: 15px;
  padding: 15px;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 6px;
}

.ai-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 15px 0;
}

.counter-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 255, 255, 0.2);
  border: 2px solid #0ff;
  color: #0ff;
  border-radius: 6px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.counter-btn:hover {
  background: #0ff;
  color: #001414;
  transform: scale(1.1);
}

.counter-value {
  color: #0ff;
  font-size: 28px;
  font-weight: bold;
  min-width: 40px;
  text-align: center;
}

.ai-hint {
  display: block;
  text-align: center;
  color: #888;
  font-size: 12px;
  margin-top: 10px;
}

.dialog-footer {
  display: flex;
  gap: 15px;
  padding: 20px 25px;
  border-top: 1px solid rgba(0, 255, 255, 0.3);
}

.cancel-btn {
  flex: 1;
  background: rgba(100, 100, 100, 0.2);
  border: 2px solid #666;
  color: #888;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: rgba(100, 100, 100, 0.3);
  border-color: #888;
  color: #aaa;
}

.create-btn {
  flex: 1;
  background: #0ff;
  border: none;
  color: #001414;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.5);
}
</style>

