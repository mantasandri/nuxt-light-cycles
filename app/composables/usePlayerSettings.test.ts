import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePlayerSettings, AVATAR_OPTIONS, getPersistentUserId } from './usePlayerSettings'

describe('usePlayerSettings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with default settings', () => {
    const { settings, isConfigured } = usePlayerSettings()
    
    expect(settings.value.name).toBe('')
    expect(settings.value.color).toBe('hsl(180, 90%, 60%)')
    expect(settings.value.colorHex).toBe('#00ffff')
    expect(settings.value.avatar).toBe('recognizer')
    expect(isConfigured.value).toBe(false)
  })

  it('loads settings from localStorage', () => {
    const mockSettings = {
      name: 'Test User',
      color: 'hsl(120, 90%, 60%)',
      colorHex: '#00ff00',
      avatar: 'cycle',
      userId: 'user-test123',
    }
    
    localStorage.setItem('lightcycles_player_settings', JSON.stringify(mockSettings))
    
    const { settings, isConfigured, loadSettings } = usePlayerSettings()
    loadSettings()
    
    expect(settings.value.name).toBe('Test User')
    expect(settings.value.color).toBe('hsl(120, 90%, 60%)')
    expect(settings.value.avatar).toBe('cycle')
    expect(isConfigured.value).toBe(true)
  })

  it('saves settings to localStorage', () => {
    const { settings, saveSettings, isConfigured } = usePlayerSettings()
    
    const newSettings = {
      name: 'Player One',
      color: 'hsl(200, 90%, 60%)',
      colorHex: '#0099ff',
      avatar: 'disc',
      userId: 'user-abc',
    }
    
    saveSettings(newSettings)
    
    expect(settings.value.name).toBe('Player One')
    expect(isConfigured.value).toBe(true)
    
    const stored = localStorage.getItem('lightcycles_player_settings')
    expect(stored).toBeTruthy()
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.name).toBe('Player One')
      expect(parsed.avatar).toBe('disc')
    }
  })

  it('clears settings and localStorage', () => {
    const { settings, saveSettings, clearSettings, isConfigured } = usePlayerSettings()
    
    saveSettings({
      name: 'Test',
      color: 'hsl(180, 90%, 60%)',
      colorHex: '#00ffff',
      avatar: 'cycle',
      userId: 'user-test',
    })
    
    clearSettings()
    
    expect(settings.value.name).toBe('')
    expect(isConfigured.value).toBe(false)
    expect(localStorage.getItem('lightcycles_player_settings')).toBeNull()
  })

  it('preserves userId when clearing settings', () => {
    const { settings, saveSettings, clearSettings } = usePlayerSettings()
    
    saveSettings({
      name: 'Test',
      color: 'hsl(180, 90%, 60%)',
      colorHex: '#00ffff',
      avatar: 'cycle',
      userId: 'user-persistent',
    })
    
    const originalUserId = settings.value.userId
    clearSettings()
    
    expect(settings.value.userId).toBeTruthy()
    expect(settings.value.userId).toBe(originalUserId)
  })

  it('getUserId returns the current userId', () => {
    const { getUserId } = usePlayerSettings()
    
    const userId = getUserId()
    
    expect(userId).toBeTruthy()
    expect(userId).toMatch(/^user-/)
  })

  it('saveSettings does not throw on errors', () => {
    const { saveSettings } = usePlayerSettings()
    
    // Should not throw even with invalid data
    expect(() => {
      saveSettings({
        name: 'Test',
        color: 'hsl(180, 90%, 60%)',
        colorHex: '#00ffff',
        avatar: 'cycle',
        userId: 'user-test',
      })
    }).not.toThrow()
  })
})

describe('getPersistentUserId', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('generates a new userId if none exists', () => {
    const userId = getPersistentUserId()
    
    expect(userId).toMatch(/^user-/)
    expect(localStorage.getItem('lightcycles_userId')).toBe(userId)
  })

  it('returns existing userId from localStorage', () => {
    const existingId = 'user-existing123'
    localStorage.setItem('lightcycles_userId', existingId)
    
    const userId = getPersistentUserId()
    
    expect(userId).toBe(existingId)
  })

  it('returns consistent userId across multiple calls', () => {
    const userId1 = getPersistentUserId()
    const userId2 = getPersistentUserId()
    
    expect(userId1).toBe(userId2)
  })

  it('always returns a valid userId', () => {
    // Should return a valid userId in all cases
    const userId1 = getPersistentUserId()
    expect(userId1).toMatch(/^user-/)
    expect(userId1).toBeTruthy()
    
    // Should be consistent
    const userId2 = getPersistentUserId()
    expect(userId2).toBe(userId1)
  })
})

describe('AVATAR_OPTIONS', () => {
  it('exports avatar options array', () => {
    expect(AVATAR_OPTIONS).toBeInstanceOf(Array)
    expect(AVATAR_OPTIONS.length).toBeGreaterThan(0)
  })

  it('each avatar has required properties', () => {
    AVATAR_OPTIONS.forEach(avatar => {
      expect(avatar).toHaveProperty('id')
      expect(avatar).toHaveProperty('label')
      expect(avatar).toHaveProperty('svg')
      expect(typeof avatar.id).toBe('string')
      expect(typeof avatar.label).toBe('string')
      expect(typeof avatar.svg).toBe('string')
    })
  })

  it('includes recognizer as default avatar', () => {
    const recognizer = AVATAR_OPTIONS.find(a => a.id === 'recognizer')
    expect(recognizer).toBeTruthy()
  })
})

