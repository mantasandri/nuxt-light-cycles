import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameAudio } from './useGameAudio'

describe('useGameAudio', () => {
  beforeEach(() => {
    // Mock Audio constructor
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      volume: 0,
      currentTime: 0,
    })) as unknown as typeof Audio
  })

  it('returns playGameOverSound and stopGameOverSound functions', () => {
    const audio = useGameAudio()
    
    expect(audio).toHaveProperty('playGameOverSound')
    expect(audio).toHaveProperty('stopGameOverSound')
    expect(typeof audio.playGameOverSound).toBe('function')
    expect(typeof audio.stopGameOverSound).toBe('function')
  })

  it('creates audio element and plays sound when playGameOverSound is called', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = {
      play: mockPlay,
      pause: vi.fn(),
      volume: 0,
      currentTime: 0,
    }
    
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    
    expect(Audio).toHaveBeenCalledWith('/audio/endofline.mp3')
    expect(mockAudio.volume).toBe(0.7)
    expect(mockPlay).toHaveBeenCalled()
  })

  it('reuses existing audio element on subsequent plays', () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined)
    const mockAudio = {
      play: mockPlay,
      pause: vi.fn(),
      volume: 0,
      currentTime: 0,
    }
    
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    audio.playGameOverSound()
    
    expect(Audio).toHaveBeenCalledTimes(1)
    expect(mockPlay).toHaveBeenCalledTimes(2)
  })

  it('resets currentTime before playing', () => {
    const mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      volume: 0,
      currentTime: 5,
    }
    
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    
    expect(mockAudio.currentTime).toBe(0)
  })

  it('stops game over sound when stopGameOverSound is called', () => {
    const mockPause = vi.fn()
    const mockAudio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: mockPause,
      volume: 0,
      currentTime: 0,
    }
    
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    audio.stopGameOverSound()
    
    expect(mockPause).toHaveBeenCalled()
    expect(mockAudio.currentTime).toBe(0)
  })

  it('handles play errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockPlay = vi.fn().mockRejectedValue(new Error('Play failed'))
    const mockAudio = {
      play: mockPlay,
      pause: vi.fn(),
      volume: 0,
      currentTime: 0,
    }
    
    global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    
    // Wait for promise to settle
    return new Promise(resolve => setTimeout(resolve, 0)).then(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  it('handles audio initialization errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    global.Audio = vi.fn(() => {
      throw new Error('Audio init failed')
    }) as unknown as typeof Audio
    
    const audio = useGameAudio()
    audio.playGameOverSound()
    
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('does not throw when stopping before playing', () => {
    const audio = useGameAudio()
    
    expect(() => audio.stopGameOverSound()).not.toThrow()
  })
})

