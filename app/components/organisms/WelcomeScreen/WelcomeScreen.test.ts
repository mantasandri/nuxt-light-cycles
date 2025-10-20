import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, it, expect } from 'vitest'
import WelcomeScreen from './WelcomeScreen.vue'

describe('WelcomeScreen', () => {
  it('renders welcome title', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('Welcome to Circuit Breaker')
  })

  it('renders subtitle', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('A Tron-Inspired Multiplayer Light Cycles Game')
  })

  it('renders game overview section', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('🎮 The Game')
    expect(wrapper.text()).toContain('Control a light cycle')
  })

  it('renders controls section', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('🕹️ Controls')
    expect(wrapper.text()).toContain('Desktop')
    expect(wrapper.text()).toContain('Mobile')
  })

  it('renders power-ups section', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('⚡ Power-Ups')
    expect(wrapper.text()).toContain('Speed Boost')
    expect(wrapper.text()).toContain('Shield')
    expect(wrapper.text()).toContain('Trail Eraser')
  })

  it('renders quick tips section', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('💡 Quick Tips')
    expect(wrapper.text()).toContain('Control the center')
  })

  it('renders how to start section', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('🚀 Ready to Play?')
    expect(wrapper.text()).toContain('Browse available lobbies')
  })

  it('renders continue button', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain('Continue to Lobby Browser')
  })

  it('emits continue event when button is clicked', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    await wrapper.find('.continue-btn').trigger('click')
    
    expect(wrapper.emitted('continue')).toBeTruthy()
  })

  it('renders footer note', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.text()).toContain("This screen won't show again this session")
  })

  it('renders keyboard controls visual', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    const keyboardKeys = wrapper.findAll('.key')
    expect(keyboardKeys.length).toBeGreaterThan(0)
  })

  it('renders mobile d-pad visual', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    expect(wrapper.find('.mobile-icon svg').exists()).toBe(true)
  })

  it('renders all three powerup cards', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    const powerupCards = wrapper.findAll('.powerup-card')
    expect(powerupCards.length).toBe(3)
  })

  it('renders tips list', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    const tips = wrapper.findAll('.tips-list li')
    expect(tips.length).toBeGreaterThan(0)
  })

  it('renders steps list', async () => {
    const wrapper = await mountSuspended(WelcomeScreen)
    
    const steps = wrapper.findAll('.steps-list li')
    expect(steps.length).toBe(5)
  })
})

