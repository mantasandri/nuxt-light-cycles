import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useWebSocket } from './useWebSocket'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  
  send = vi.fn()
  close = vi.fn()
  
  // Helper to simulate connection
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) this.onopen(new Event('open'))
  }
  
  // Helper to simulate message
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
  
  // Helper to simulate close
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose(new CloseEvent('close'))
  }
}

describe('useWebSocket', () => {
  let mockWebSocket: MockWebSocket
  
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    
    mockWebSocket = new MockWebSocket()
    global.WebSocket = vi.fn(() => mockWebSocket) as unknown as typeof WebSocket
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'http:',
        host: 'localhost:3000',
      },
      writable: true,
    })
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with null websocket and playerId', () => {
    const ws = useWebSocket()
    
    expect(ws.ws.value).toBeNull()
    expect(ws.playerId.value).toBeNull()
    expect(ws.isReconnecting.value).toBe(false)
    expect(ws.reconnectAttempts.value).toBe(0)
  })

  it('returns expected interface', () => {
    const ws = useWebSocket()
    
    expect(ws).toHaveProperty('ws')
    expect(ws).toHaveProperty('playerId')
    expect(ws).toHaveProperty('reconnectToken')
    expect(ws).toHaveProperty('isReconnecting')
    expect(ws).toHaveProperty('reconnectAttempts')
    expect(ws).toHaveProperty('onMessage')
    expect(ws).toHaveProperty('send')
    expect(ws).toHaveProperty('connect')
    expect(ws).toHaveProperty('disconnect')
    expect(ws).toHaveProperty('loadReconnectToken')
    expect(typeof ws.onMessage).toBe('function')
    expect(typeof ws.send).toBe('function')
    expect(typeof ws.connect).toBe('function')
    expect(typeof ws.disconnect).toBe('function')
    expect(typeof ws.loadReconnectToken).toBe('function')
  })

  it('connects to WebSocket server', () => {
    const ws = useWebSocket()
    ws.connect()
    
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3000/_ws')
  })

  it('uses wss protocol when page is https', () => {
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        host: 'example.com',
      },
      writable: true,
    })
    
    const ws = useWebSocket()
    ws.connect()
    
    expect(WebSocket).toHaveBeenCalledWith('wss://example.com/_ws')
  })

  it('returns false when sending without connection', () => {
    const ws = useWebSocket()
    
    const result = ws.send('testMessage', { data: 'test' })
    
    expect(result).toBe(false)
  })

  it('registers and unregisters message handlers', () => {
    const ws = useWebSocket()
    const handler = vi.fn()
    
    const unregister = ws.onMessage(handler)
    
    expect(typeof unregister).toBe('function')
    expect(() => unregister()).not.toThrow()
  })

  it('disconnects WebSocket', () => {
    const ws = useWebSocket()
    ws.connect()
    
    mockWebSocket.simulateOpen()
    ws.disconnect()
    
    expect(mockWebSocket.close).toHaveBeenCalled()
    expect(ws.ws.value).toBeNull()
  })

  it('handles disconnect when not connected', () => {
    const ws = useWebSocket()
    
    expect(() => ws.disconnect()).not.toThrow()
  })

  it('loads reconnect token from localStorage', () => {
    localStorage.setItem('reconnectToken', 'stored-token')
    
    const ws = useWebSocket()
    ws.loadReconnectToken()
    
    expect(ws.reconnectToken.value).toBe('stored-token')
  })

  it('handles missing reconnect token gracefully', () => {
    const ws = useWebSocket()
    
    expect(() => ws.loadReconnectToken()).not.toThrow()
  })

  it('closes existing connection when connecting again', () => {
    const ws = useWebSocket()
    ws.connect()
    
    mockWebSocket.simulateOpen()
    const firstSocket = mockWebSocket
    
    ws.connect()
    
    expect(firstSocket.close).toHaveBeenCalled()
  })
})
