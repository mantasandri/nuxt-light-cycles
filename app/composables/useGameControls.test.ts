import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { useGameControls } from './useGameControls'
import { ref } from 'vue'

describe('useGameControls', () => {
  let mockWs: { send: ReturnType<typeof vi.fn> }
  let gameState: ReturnType<typeof ref<string>>
  let currentDirection: ReturnType<typeof ref<string>>

  beforeEach(() => {
    mockWs = {
      send: vi.fn().mockReturnValue(true),
    }
    gameState = ref('playing')
    currentDirection = ref('right')
  })

  // Test component wrapper
  const createTestComponent = () => defineComponent({
    setup() {
      const controls = useGameControls(mockWs, gameState, currentDirection)
      return { controls }
    },
    render() {
      return h('div', { id: 'test' })
    }
  })

  it('returns expected interface', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    const controls = wrapper.vm.controls
    
    expect(controls).toHaveProperty('isBraking')
    expect(controls).toHaveProperty('handleDPadDirection')
    expect(controls).toHaveProperty('handleDPadBrake')
    expect(typeof controls.handleDPadDirection).toBe('function')
    expect(typeof controls.handleDPadBrake).toBe('function')
  })

  it('initializes with isBraking as false', async () => {
    const wrapper = await mountSuspended(createTestComponent())
    
    expect(wrapper.vm.controls.isBraking.value).toBe(false)
  })

  describe('handleDPadDirection', () => {
    it('sends move command when direction is valid', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadDirection('up')
      
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'up' })
    })

    it('does not send move when game is not playing', async () => {
      gameState.value = 'waiting'
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadDirection('up')
      
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('does not allow opposite direction', async () => {
      currentDirection.value = 'up'
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadDirection('down')
      
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('allows perpendicular direction changes', async () => {
      currentDirection.value = 'up'
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadDirection('left')
      
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'left' })
    })

    it('handles all four directions', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadDirection('up')
      wrapper.vm.controls.handleDPadDirection('down')
      wrapper.vm.controls.handleDPadDirection('left')
      wrapper.vm.controls.handleDPadDirection('right')
      
      expect(mockWs.send).toHaveBeenCalled()
    })
  })

  describe('handleDPadBrake', () => {
    it('sends brake command when braking is true', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadBrake(true)
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
      expect(wrapper.vm.controls.isBraking.value).toBe(true)
    })

    it('sends brake command when braking is false', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadBrake(false)
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: false })
      expect(wrapper.vm.controls.isBraking.value).toBe(false)
    })

    it('does not send brake when game is not playing', async () => {
      gameState.value = 'finished'
      const wrapper = await mountSuspended(createTestComponent())
      
      wrapper.vm.controls.handleDPadBrake(true)
      
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('updates internal braking state', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const controls = wrapper.vm.controls
      
      expect(controls.isBraking.value).toBe(false)
      
      controls.handleDPadBrake(true)
      expect(controls.isBraking.value).toBe(true)
      
      controls.handleDPadBrake(false)
      expect(controls.isBraking.value).toBe(false)
    })
  })

  describe('keyboard controls', () => {
    it('prevents default on arrow key down', async () => {
      await mountSuspended(createTestComponent())
      
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      
      window.dispatchEvent(event)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('sends move command on arrow key press', async () => {
      currentDirection.value = 'right'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'up' })
    })

    it('sends brake command on opposite direction key press', async () => {
      currentDirection.value = 'up'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
    })

    it('sends brake release on opposite direction key up', async () => {
      currentDirection.value = 'up'
      const wrapper = await mountSuspended(createTestComponent())
      
      // First press down
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      expect(wrapper.vm.controls.isBraking.value).toBe(true)
      
      // Then release
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: false })
    })

    it('does not process keys when game is not playing', async () => {
      gameState.value = 'waiting'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('handles all arrow keys', async () => {
      currentDirection.value = 'right'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'up' })
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'down' })
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
      
      currentDirection.value = 'up'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(mockWs.send).toHaveBeenCalledWith('move', { direction: 'right' })
    })

    it('cleans up event listeners on unmount', async () => {
      const wrapper = await mountSuspended(createTestComponent())
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      wrapper.unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function))
      
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('opposite direction detection', () => {
    it('detects up-down as opposite', async () => {
      currentDirection.value = 'up'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
    })

    it('detects left-right as opposite', async () => {
      currentDirection.value = 'left'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
    })

    it('detects down-up as opposite', async () => {
      currentDirection.value = 'down'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
    })

    it('detects right-left as opposite', async () => {
      currentDirection.value = 'right'
      await mountSuspended(createTestComponent())
      
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      
      expect(mockWs.send).toHaveBeenCalledWith('brake', { braking: true })
    })
  })
})
