// Lobby state management composable
export function useLobbyState(
  ws: { send: (type: string, payload?: unknown) => boolean; onMessage: (handler: MessageHandler) => () => void },
  playerId: Ref<string | null>
) {
  // Lobby state
  const lobbyState = ref<LobbyState | null>(null)
  const lobbyId = ref<string | null>(null)
  const isReady = ref(false)
  const isSpectator = ref(false)
  const currentGridSize = ref(20)
  
  // Computed
  const isHost = computed(() => {
    return playerId.value === lobbyState.value?.hostId
  })
  
  // Actions
  const joinLobby = (targetLobbyId: string, playerName: string, playerColor: string) => {
    ws.send('joinLobby', {
      lobbyId: targetLobbyId,
      playerName,
      playerColor,
    })
  }
  
  const joinLobbyAsSpectator = (targetLobbyId: string, playerName: string, playerColor: string) => {
    ws.send('joinLobbyAsSpectator', {
      lobbyId: targetLobbyId,
      playerName,
      playerColor,
    })
  }
  
  const createLobby = (settings: LobbySettings, playerName: string, playerColor: string) => {
    ws.send('createLobby', {
      settings,
      playerName,
      playerColor,
    })
  }
  
  const toggleReady = () => {
    if (!playerId.value) return
    
    const newReadyState = !isReady.value
    isReady.value = newReadyState
    
    ws.send('ready', { ready: newReadyState })
  }
  
  const updateLobbySettings = (settings: Partial<LobbySettings>) => {
    ws.send('updateSettings', { settings })
  }
  
  const kickPlayer = (targetPlayerId: string) => {
    ws.send('kickPlayer', { targetPlayerId })
  }
  
  const banPlayer = (targetPlayerId: string) => {
    ws.send('banPlayer', { targetPlayerId })
  }
  
  const addAIBot = () => {
    ws.send('addAIBot', {})
  }
  
  const removeAIBot = (botId: string) => {
    ws.send('removeAIBot', { botId })
  }
  
  const leaveLobby = () => {
    ws.send('leaveLobby', {})
    
    // Reset state
    lobbyId.value = null
    lobbyState.value = null
    isReady.value = false
    isSpectator.value = false
  }
  
  const returnToLobby = () => {
    ws.send('returnToLobby', {})
  }
  
  // Reset lobby state
  const reset = () => {
    lobbyState.value = null
    lobbyId.value = null
    isReady.value = false
    isSpectator.value = false
  }
  
  // Handle WebSocket messages
  const handleMessage: MessageHandler = (data) => {
    switch (data.type) {
      case 'lobbyJoined':
        lobbyId.value = data.payload.lobbyId
        currentGridSize.value = data.payload.gridSize
        isSpectator.value = data.payload.isSpectator || false
        break
        
      case 'lobbyState': {
        lobbyState.value = data.payload
        
        // Update ready state
        const currentPlayerInLobby = data.payload.players.find((p: { id: string }) => p.id === playerId.value)
        if (currentPlayerInLobby) {
          isReady.value = currentPlayerInLobby.isReady
        }
        break
      }
        
      case 'lobbyClosed':
        console.log('[Lobby] Lobby closed:', data.payload.message)
        
        // Reset state
        reset()
        
        // Show notification to user
        alert(data.payload.message || 'Lobby has been closed.')
        break
        
      case 'kicked':
        console.log('[Lobby] You have been kicked:', data.payload.message)
        
        // Reset state
        reset()
        
        // Show notification to user
        alert(data.payload.message || 'You have been kicked from the lobby.')
        break
        
      case 'banned':
        console.log('[Lobby] You have been banned:', data.payload.message)
        
        // Reset state
        reset()
        
        // Show notification to user
        alert(data.payload.message || 'You have been banned from the lobby.')
        break
        
      case 'reconnected':
        lobbyId.value = data.payload.lobbyId
        isSpectator.value = data.payload.isSpectator
        break
    }
  }
  
  // Register message handler
  let unregister: (() => void) | null = null
  
  onMounted(() => {
    unregister = ws.onMessage(handleMessage)
  })
  
  onUnmounted(() => {
    if (unregister) unregister()
  })
  
  return {
    // State
    lobbyState: readonly(lobbyState),
    lobbyId: readonly(lobbyId),
    isReady: readonly(isReady),
    isSpectator: readonly(isSpectator),
    currentGridSize: readonly(currentGridSize),
    
    // Computed
    isHost,
    
    // Actions
    joinLobby,
    joinLobbyAsSpectator,
    createLobby,
    toggleReady,
    updateLobbySettings,
    kickPlayer,
    banPlayer,
    addAIBot,
    removeAIBot,
    leaveLobby,
    returnToLobby,
    reset,
  }
}

