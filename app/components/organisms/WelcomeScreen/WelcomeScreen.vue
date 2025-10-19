<script setup lang="ts">
const emit = defineEmits<{
  continue: []
}>();

const handleContinue = () => {
  emit('continue');
};
</script>

<template>
  <div class="welcome-overlay">
    <div class="welcome-container">
      <div class="welcome-header">
        <h1 class="title">Welcome to Circuit Breaker</h1>
        <p class="subtitle">A Tron-Inspired Multiplayer Light Cycles Game</p>
      </div>

      <div class="welcome-content">
        <!-- Game Overview -->
        <section class="section">
          <h2 class="section-title">🎮 The Game</h2>
          <p class="section-text">
            Control a light cycle that leaves a permanent trail behind it. Survive by avoiding walls, 
            obstacles, and trails (including your own!). Outmaneuver your opponents to be the last one standing. 
            The grid is your arena—master it or crash trying.
          </p>
        </section>

        <!-- Controls -->
        <section class="section">
          <h2 class="section-title">🕹️ Controls</h2>
          <div class="controls-grid">
            <div class="control-item">
              <div class="control-icon keyboard-icon">
                <div class="key-group">
                  <div class="key">↑</div>
                  <div class="key-row">
                    <div class="key">←</div>
                    <div class="key">↓</div>
                    <div class="key">→</div>
                  </div>
                </div>
              </div>
              <div class="control-desc">
                <strong>Desktop</strong>
                <p>Use Arrow Keys to change direction</p>
                <p class="hint">Press opposite direction to brake</p>
              </div>
            </div>
            <div class="control-item">
              <div class="control-icon mobile-icon">
                <svg viewBox="0 0 100 100" width="80" height="80">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2" />
                  <path d="M50 20 L50 35" stroke="currentColor" stroke-width="3" />
                  <path d="M50 65 L50 80" stroke="currentColor" stroke-width="3" />
                  <path d="M20 50 L35 50" stroke="currentColor" stroke-width="3" />
                  <path d="M65 50 L80 50" stroke="currentColor" stroke-width="3" />
                  <polygon points="50,15 45,25 55,25" fill="currentColor" />
                  <polygon points="50,85 45,75 55,75" fill="currentColor" />
                  <polygon points="15,50 25,45 25,55" fill="currentColor" />
                  <polygon points="85,50 75,45 75,55" fill="currentColor" />
                </svg>
              </div>
              <div class="control-desc">
                <strong>Mobile</strong>
                <p>Tap D-Pad arrows to move</p>
                <p class="hint">Tap and hold brake button to slow down</p>
              </div>
            </div>
          </div>
          <div class="controls-note">
            <strong>Note:</strong> You can't reverse direction, only turn 90 degrees. Plan ahead!
          </div>
        </section>

        <!-- Power-ups -->
        <section class="section">
          <h2 class="section-title">⚡ Power-Ups</h2>
          <div class="powerups-grid">
            <div class="powerup-card speed">
              <div class="powerup-icon">⚡</div>
              <div class="powerup-info">
                <h3>Speed Boost</h3>
                <p>Temporary speed increase to escape tight situations or cut off opponents</p>
                <div class="powerup-visual"/>
              </div>
            </div>
            <div class="powerup-card shield">
              <div class="powerup-icon">🛡</div>
              <div class="powerup-info">
                <h3>Shield</h3>
                <p>Protects you from one collision with trails or obstacles (not walls!)</p>
                <div class="powerup-visual"/>
              </div>
            </div>
            <div class="powerup-card eraser">
              <div class="powerup-icon">✨</div>
              <div class="powerup-info">
                <h3>Trail Eraser</h3>
                <p>Press the same direction twice to erase your trail for a short distance</p>
                <div class="powerup-visual"/>
              </div>
            </div>
          </div>
        </section>

        <!-- Strategy Tips -->
        <section class="section">
          <h2 class="section-title">💡 Quick Tips</h2>
          <ul class="tips-list">
            <li><strong>Control the center:</strong> More room to maneuver means more survival time</li>
            <li><strong>Use your brake:</strong> Slow down in tight spaces for precise movement</li>
            <li><strong>Collect power-ups:</strong> They spawn randomly—grab them when you can!</li>
            <li><strong>Cut off opponents:</strong> Force them into walls or trails to eliminate them</li>
            <li><strong>Watch your six:</strong> Don't forget about your own trail!</li>
          </ul>
        </section>

        <!-- How to Start -->
        <section class="section how-to-start">
          <h2 class="section-title">🚀 Ready to Play?</h2>
          <ol class="steps-list">
            <li>Browse available lobbies or create your own</li>
            <li>Wait for other players to join (or add AI opponents)</li>
            <li>Hit "Ready" when you're prepared</li>
            <li>Game starts when all players are ready</li>
            <li>Be the last cycle standing!</li>
          </ol>
        </section>
      </div>

      <div class="welcome-footer">
        <button class="continue-btn" @click="handleContinue">
          Continue to Lobby Browser
        </button>
        <p class="footer-note">This screen won't show again this session</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  overflow-y: auto;
  padding: 20px;
}

.welcome-container {
  max-width: 900px;
  width: 100%;
  background: rgba(0, 20, 20, 0.95);
  border: 3px solid #0ff;
  border-radius: 16px;
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
  overflow: hidden;
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-header {
  background: linear-gradient(180deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 255, 255, 0.05) 100%);
  padding: 40px 30px;
  text-align: center;
  border-bottom: 2px solid #0ff;
}

.title {
  font-size: 42px;
  font-weight: bold;
  color: #0ff;
  margin: 0 0 10px 0;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
  letter-spacing: 1px;
}

.subtitle {
  font-size: 18px;
  color: #fff;
  margin: 0;
  opacity: 0.8;
}

.welcome-content {
  padding: 30px;
  max-height: 60vh;
  overflow-y: auto;
}

.section {
  margin-bottom: 35px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 24px;
  color: #0ff;
  margin: 0 0 15px 0;
  font-weight: 600;
}

.section-text {
  color: #fff;
  line-height: 1.6;
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 15px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
}

.control-icon {
  flex-shrink: 0;
  color: #0ff;
}

.keyboard-icon .key-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.keyboard-icon .key-row {
  display: flex;
  gap: 5px;
}

.keyboard-icon .key {
  width: 35px;
  height: 35px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid #0ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #0ff;
}

.mobile-icon svg {
  color: #0ff;
}

.control-desc {
  flex: 1;
}

.control-desc strong {
  display: block;
  color: #0ff;
  font-size: 18px;
  margin-bottom: 8px;
}

.control-desc p {
  margin: 4px 0;
  color: #fff;
  font-size: 14px;
  opacity: 0.9;
}

.control-desc .hint {
  font-size: 13px;
  color: #aaa;
  font-style: italic;
}

.controls-note {
  padding: 12px;
  background: rgba(255, 255, 0, 0.1);
  border-left: 3px solid #ff0;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
}

.controls-note strong {
  color: #ff0;
}

.powerups-grid {
  display: grid;
  gap: 20px;
}

.powerup-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.powerup-card:hover {
  transform: translateX(5px);
  box-shadow: 0 0 20px currentColor;
}

.powerup-card.speed {
  border-color: #ffff00;
}

.powerup-card.shield {
  border-color: #00ccff;
}

.powerup-card.eraser {
  border-color: #ff00ff;
}

.powerup-icon {
  font-size: 40px;
  line-height: 1;
  flex-shrink: 0;
}

.powerup-info {
  flex: 1;
}

.powerup-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #fff;
}

.powerup-info p {
  margin: 0;
  color: #ddd;
  font-size: 14px;
  line-height: 1.5;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 12px 15px;
  margin-bottom: 10px;
  background: rgba(0, 255, 255, 0.05);
  border-left: 3px solid #0ff;
  border-radius: 4px;
  color: #fff;
  font-size: 15px;
  line-height: 1.5;
}

.tips-list li strong {
  color: #0ff;
}

.how-to-start {
  background: rgba(0, 255, 255, 0.08);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 25px;
}

.steps-list {
  counter-reset: step-counter;
  list-style: none;
  padding: 0;
  margin: 0;
}

.steps-list li {
  counter-increment: step-counter;
  position: relative;
  padding: 12px 12px 12px 50px;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 15px;
}

.steps-list li::before {
  content: counter(step-counter);
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  background: #0ff;
  color: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.welcome-footer {
  padding: 30px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 2px solid rgba(0, 255, 255, 0.3);
  text-align: center;
}

.continue-btn {
  width: 100%;
  max-width: 400px;
  padding: 16px 32px;
  font-size: 20px;
  font-weight: 600;
  background: #0ff;
  color: #001414;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
}

.continue-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
}

.footer-note {
  margin: 15px 0 0 0;
  color: #888;
  font-size: 13px;
  font-style: italic;
}

/* Scrollbar styling */
.welcome-content::-webkit-scrollbar {
  width: 8px;
}

.welcome-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.welcome-content::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.4);
  border-radius: 4px;
}

.welcome-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.6);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .welcome-overlay {
    padding: 10px;
  }

  .welcome-container {
    max-width: 100%;
  }

  .welcome-header {
    padding: 25px 20px;
  }

  .title {
    font-size: 28px;
  }

  .subtitle {
    font-size: 14px;
  }

  .welcome-content {
    padding: 20px;
    max-height: 65vh;
  }

  .section-title {
    font-size: 20px;
  }

  .section-text {
    font-size: 14px;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }

  .control-item {
    flex-direction: column;
    text-align: center;
  }

  .powerup-card {
    flex-direction: column;
    text-align: center;
  }

  .tips-list li {
    font-size: 14px;
    padding: 10px 12px;
  }

  .steps-list li {
    font-size: 14px;
    padding: 10px 10px 10px 45px;
  }

  .continue-btn {
    font-size: 18px;
    padding: 14px 24px;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 24px;
  }

  .subtitle {
    font-size: 13px;
  }

  .section-title {
    font-size: 18px;
  }
}
</style>

