// Game controls composable (keyboard + mobile)
export function useGameControls(
  ws: { send: (type: string, payload?: unknown) => boolean },
  gameState: Ref<string>,
  currentDirection: Ref<string>
) {
  const isBraking = ref(false)
  
  // Check if direction is opposite
  const isOppositeDirection = (current: string, newDir: string) => {
    return (
      (current === 'up' && newDir === 'down') ||
      (current === 'down' && newDir === 'up') ||
      (current === 'left' && newDir === 'right') ||
      (current === 'right' && newDir === 'left')
    )
  }
  
  // Handle virtual D-pad direction input (for mobile)
  const handleDPadDirection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState.value !== 'playing') return

    if (isOppositeDirection(currentDirection.value, direction)) {
      // Don't allow opposite direction, but don't brake either
      return
    } else {
      ws.send('move', { direction })
    }
  }
  
  // Handle virtual D-pad brake input (for mobile)
  const handleDPadBrake = (braking: boolean) => {
    if (gameState.value !== 'playing') return

    isBraking.value = braking
    ws.send('brake', { braking })
  }
  
  // Keyboard event handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameState.value !== 'playing') return

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
    }

    let newDirection = ''
    switch (e.key) {
      case 'ArrowUp': newDirection = 'up'; break
      case 'ArrowDown': newDirection = 'down'; break
      case 'ArrowLeft': newDirection = 'left'; break
      case 'ArrowRight': newDirection = 'right'; break
    }

    if (newDirection) {
      if (isOppositeDirection(currentDirection.value, newDirection)) {
        isBraking.value = true
        ws.send('brake', { braking: true })
      } else {
        ws.send('move', { direction: newDirection })
      }
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (gameState.value !== 'playing') return

    let direction = ''
    switch (e.key) {
      case 'ArrowUp': direction = 'up'; break
      case 'ArrowDown': direction = 'down'; break
      case 'ArrowLeft': direction = 'left'; break
      case 'ArrowRight': direction = 'right'; break
    }

    if (direction && isBraking.value) {
      if (isOppositeDirection(currentDirection.value, direction)) {
        isBraking.value = false
        ws.send('brake', { braking: false })
      }
    }
  }
  
  // Setup keyboard listeners
  const setupKeyboardListeners = () => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }
  
  // Lifecycle
  let cleanup: (() => void) | null = null
  
  onMounted(() => {
    cleanup = setupKeyboardListeners()
  })
  
  onUnmounted(() => {
    if (cleanup) cleanup()
  })
  
  return {
    isBraking: readonly(isBraking),
    handleDPadDirection,
    handleDPadBrake,
  }
}

