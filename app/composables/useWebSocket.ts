// WebSocket connection management composable
export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const playerId = ref<string | null>(null)
  const reconnectToken = ref<string | null>(null)
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  
  const messageHandlers = ref<MessageHandler[]>([])
  
  // Register a message handler
  const onMessage = (handler: MessageHandler) => {
    messageHandlers.value.push(handler)
    
    // Return unregister function
    return () => {
      const index = messageHandlers.value.indexOf(handler)
      if (index > -1) {
        messageHandlers.value.splice(index, 1)
      }
    }
  }
  
  // Send a message to the server
  const send = (type: string, payload: unknown = {}) => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message, not connected:', type)
      return false
    }
    
    ws.value.send(JSON.stringify({ type, payload }))
    return true
  }
  
  // Connect to WebSocket
  const connect = (userId?: string) => {
    if (ws.value) {
      ws.value.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/_ws`
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('[WebSocket] Connected')
      ws.value = socket
      
      // Try to reconnect if we have a token
      if (reconnectToken.value && isReconnecting.value) {
        console.log('[WebSocket] Attempting to restore session...')
        send('reconnect', { reconnectToken: reconnectToken.value })
      }
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Handle core connection messages
        switch (data.type) {
          case 'connected':
            playerId.value = data.payload.playerId
            reconnectToken.value = data.payload.reconnectToken
            isReconnecting.value = false
            reconnectAttempts.value = 0
            
            // Send persistent userId to server if provided
            if (userId && socket.readyState === WebSocket.OPEN) {
              console.log('[WebSocket] Sending persistent userId to server:', userId)
              send('setUserId', { userId })
            }
            
            // Save reconnection token to localStorage
            if (reconnectToken.value) {
              localStorage.setItem('reconnectToken', reconnectToken.value)
            }
            break
            
          case 'reconnected':
            console.log('[WebSocket] Successfully restored session')
            playerId.value = data.payload.playerId
            isReconnecting.value = false
            reconnectAttempts.value = 0
            break
            
          case 'error':
            console.error('[WebSocket] Server error:', data.payload.message)
            break
        }
        
        // Notify all registered handlers
        messageHandlers.value.forEach(handler => {
          try {
            handler(data)
          } catch (error) {
            console.error('[WebSocket] Error in message handler:', error)
          }
        })
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error)
      }
    }

    socket.onclose = () => {
      console.log('[WebSocket] Disconnected')
      ws.value = null
      
      // Attempt reconnection with exponential backoff
      if (reconnectToken.value && reconnectAttempts.value < 5) {
        isReconnecting.value = true
        reconnectAttempts.value++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value - 1), 10000)
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value}/5)`)
        setTimeout(() => connect(userId), delay)
      } else {
        // Failed to reconnect or no token
        isReconnecting.value = false
        reconnectAttempts.value = 0
        // Try again after a longer delay
        setTimeout(() => connect(userId), 3000)
      }
    }

    socket.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }
  }
  
  // Disconnect
  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }
  
  // Load reconnect token from localStorage
  const loadReconnectToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('reconnectToken')
      if (token) {
        reconnectToken.value = token
      }
    }
  }
  
  return {
    ws: readonly(ws),
    playerId: readonly(playerId),
    reconnectToken: readonly(reconnectToken),
    isReconnecting: readonly(isReconnecting),
    reconnectAttempts: readonly(reconnectAttempts),
    onMessage,
    send,
    connect,
    disconnect,
    loadReconnectToken,
  }
}

