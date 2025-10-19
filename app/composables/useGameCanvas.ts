// Game canvas rendering composable
export function useGameCanvas(
  gamePlayers: Ref<Player[]>,
  powerUps: Ref<PowerUp[]>,
  obstacles: Ref<string[]>,
  currentGridSize: Ref<number>,
  gameState: Ref<string>,
  playerId: Ref<string | null>
) {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const cellSize = 20
  
  let ctx: CanvasRenderingContext2D | null = null
  
  // Performance optimizations - canvas caching
  let gridCanvas: HTMLCanvasElement | null = null
  let gridCtx: CanvasRenderingContext2D | null = null
  let cachedGridSize = 0
  
  // Get trail color with transparency
  const getTrailColor = (color: string | undefined) => {
    if (!color) return '#ffffff66'
    
    if (color.startsWith('hsl')) {
      const matches = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
      if (matches && matches.length >= 4) {
        const h = parseInt(matches[1] || '0')
        const s = parseInt(matches[2] || '0')
        const l = parseInt(matches[3] || '0')
        if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
          return `hsla(${h}, ${s}%, ${Math.min(l + 20, 90)}%, 0.4)`
        }
      }
    }
    return `${color}66`
  }
  
  // Create or update cached grid canvas
  const createGridCache = (gridSize: number) => {
    const size = gridSize * cellSize
    
    // Create offscreen canvas if needed
    if (!gridCanvas) {
      gridCanvas = document.createElement('canvas')
      gridCtx = gridCanvas.getContext('2d', { alpha: false })
    }
    
    if (!gridCtx) return
    
    // Resize if needed
    if (gridCanvas.width !== size || gridCanvas.height !== size) {
      gridCanvas.width = size
      gridCanvas.height = size
    }
    
    // Draw grid to offscreen canvas
    gridCtx.fillStyle = '#000'
    gridCtx.fillRect(0, 0, size, size)
    
    gridCtx.strokeStyle = '#333'
    gridCtx.lineWidth = 0.5
    
    for (let i = 0; i <= gridSize; i++) {
      const pos = i * cellSize
      gridCtx.beginPath()
      gridCtx.moveTo(pos, 0)
      gridCtx.lineTo(pos, size)
      gridCtx.stroke()
      
      gridCtx.beginPath()
      gridCtx.moveTo(0, pos)
      gridCtx.lineTo(size, pos)
      gridCtx.stroke()
    }
    
    cachedGridSize = gridSize
  }
  
  // Setup canvas
  const setupCanvas = () => {
    nextTick(() => {
      if (canvasRef.value) {
        const size = currentGridSize.value > 0 ? currentGridSize.value * cellSize : 800
        canvasRef.value.width = size
        canvasRef.value.height = size
        ctx = canvasRef.value.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = false
        }
      }
    })
  }
  
  // Draw the game
  const drawGame = () => {
    const canvasEl = canvasRef.value
    
    if (!canvasEl) {
      return
    }
    
    // ALWAYS get a fresh context - hydration issue workaround
    ctx = canvasEl.getContext('2d', { 
      alpha: false,
      willReadFrequently: false 
    })
    if (!ctx) {
      return
    }
    ctx.imageSmoothingEnabled = false

    // Only update canvas dimensions if they actually changed
    const size = currentGridSize.value * cellSize
    if (canvasEl.width !== size || canvasEl.height !== size) {
      canvasEl.width = size
      canvasEl.height = size
      // Re-apply context settings after resize
      if (ctx) {
        ctx.imageSmoothingEnabled = false
      }
    }
    
    // Draw cached grid background (performance optimization)
    if (gridCanvas && cachedGridSize === currentGridSize.value) {
      // Use cached grid
      ctx.drawImage(gridCanvas, 0, 0)
    } else {
      // Cache not ready or size changed - regenerate
      if (cachedGridSize !== currentGridSize.value) {
        createGridCache(currentGridSize.value)
      }
      if (gridCanvas) {
        ctx.drawImage(gridCanvas, 0, 0)
      } else {
        // Extreme fallback
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      }
    }
    
    // Null check for context (safety)
    if (!ctx) return

    // Draw obstacles first (static)
    ctx.fillStyle = '#444'
    obstacles.value.forEach(pos => {
      const coords = pos.split(',').map(Number)
      if (coords.length === 2 && !coords.some(isNaN) && coords[0] !== undefined && coords[1] !== undefined) {
        ctx!.fillRect(coords[0] * cellSize, coords[1] * cellSize, cellSize, cellSize)
      }
    })

    // Draw trails using Path2D for better performance
    gamePlayers.value.forEach(player => {
      if (player.trail.length === 0) return
      
      const trailColor = getTrailColor(player.color)
      ctx!.fillStyle = trailColor
      
      // Use Path2D to batch all trail segments
      const trailPath = new Path2D()
      player.trail.forEach(pos => {
        const coords = pos.split(',').map(Number)
        if (coords.length === 2 && !coords.some(isNaN) && coords[0] !== undefined && coords[1] !== undefined) {
          trailPath.rect(coords[0] * cellSize, coords[1] * cellSize, cellSize, cellSize)
        }
      })
      
      // Single fill operation for entire trail
      ctx!.fill(trailPath)

      // Visual effects for player state
      if (player.speedBoostUntil && Date.now() < player.speedBoostUntil) {
        ctx!.shadowColor = '#ffff00'
        ctx!.shadowBlur = 20
      }

      if (player.isBraking && player.brakeStartTime) {
        const brakeDuration = (Date.now() - player.brakeStartTime) / 1000
        const brakeIntensity = Math.min(1, brakeDuration * 0.2)
        ctx!.shadowColor = '#ff0000'
        ctx!.shadowBlur = 15 + (10 * brakeIntensity)
      }
      
      if (player.hasShield) {
        ctx!.shadowColor = '#00ccff'
        ctx!.shadowBlur = 25
      }
      
      if (player.hasTrailEraser) {
        ctx!.shadowColor = '#ff00ff'
        ctx!.shadowBlur = 20
      }

      if (typeof player.x === 'number' && typeof player.y === 'number' && player.color) {
        ctx!.fillStyle = player.color
        ctx!.fillRect(player.x * cellSize, player.y * cellSize, cellSize, cellSize)

        const center = {
          x: player.x * cellSize + cellSize / 2,
          y: player.y * cellSize + cellSize / 2
        }
        
        ctx!.fillStyle = '#000'
        ctx!.beginPath()
        switch (player.direction) {
          case 'up':
            ctx!.moveTo(center.x, center.y - cellSize / 3)
            ctx!.lineTo(center.x - cellSize / 4, center.y)
            ctx!.lineTo(center.x + cellSize / 4, center.y)
            break
          case 'down':
            ctx!.moveTo(center.x, center.y + cellSize / 3)
            ctx!.lineTo(center.x - cellSize / 4, center.y)
            ctx!.lineTo(center.x + cellSize / 4, center.y)
            break
          case 'left':
            ctx!.moveTo(center.x - cellSize / 3, center.y)
            ctx!.lineTo(center.x, center.y - cellSize / 4)
            ctx!.lineTo(center.x, center.y + cellSize / 4)
            break
          case 'right':
            ctx!.moveTo(center.x + cellSize / 3, center.y)
            ctx!.lineTo(center.x, center.y - cellSize / 4)
            ctx!.lineTo(center.x, center.y + cellSize / 4)
            break
        }
        ctx!.closePath()
        ctx!.fill()

        ctx!.shadowBlur = 0

        if (player.name) {
          ctx!.fillStyle = '#fff'
          ctx!.font = '12px sans-serif'
          ctx!.textAlign = 'center'
          const nameText = player.name + (player.id === playerId.value ? ' (You)' : '')
          ctx!.fillText(
            nameText,
            player.x * cellSize + cellSize / 2,
            player.y * cellSize - 5
          )
          
          // Draw power-up indicators next to name
          const nameWidth = ctx!.measureText(nameText).width
          let iconOffset = nameWidth / 2 + 8
          
          if (player.hasShield) {
            ctx!.fillStyle = '#00ccff'
            ctx!.font = 'bold 10px sans-serif'
            ctx!.fillText('🛡', player.x * cellSize + cellSize / 2 + iconOffset, player.y * cellSize - 5)
            iconOffset += 12
          }
          
          if (player.hasTrailEraser) {
            ctx!.fillStyle = '#ff00ff'
            ctx!.font = 'bold 10px sans-serif'
            ctx!.fillText('✨', player.x * cellSize + cellSize / 2 + iconOffset, player.y * cellSize - 5)
          }
        }
      }
    })

    // Draw power-ups
    powerUps.value.forEach(powerUp => {
      if (typeof powerUp.x === 'number' && typeof powerUp.y === 'number') {
        const x = powerUp.x * cellSize
        const y = powerUp.y * cellSize
        const centerX = x + cellSize / 2
        const centerY = y + cellSize / 2

        // Different colors and icons for different power-up types
        if (powerUp.type === 'speed') {
          // Yellow lightning bolt
          ctx!.shadowColor = '#ffff00'
          ctx!.shadowBlur = 15
          ctx!.fillStyle = '#ffff00'
          ctx!.beginPath()
          ctx!.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
          ctx!.fill()

          ctx!.shadowBlur = 0
          ctx!.fillStyle = '#000'
          ctx!.beginPath()
          ctx!.moveTo(centerX, y + cellSize/4)
          ctx!.lineTo(x + cellSize/3, centerY)
          ctx!.lineTo(centerX, centerY)
          ctx!.lineTo(x + cellSize/3, y + 3*cellSize/4)
          ctx!.lineTo(x + 2*cellSize/3, centerY)
          ctx!.lineTo(centerX, centerY)
          ctx!.lineTo(x + 2*cellSize/3, y + cellSize/4)
          ctx!.closePath()
          ctx!.fill()
        } else if (powerUp.type === 'shield') {
          // Blue shield
          ctx!.shadowColor = '#00ccff'
          ctx!.shadowBlur = 15
          ctx!.fillStyle = '#00ccff'
          ctx!.beginPath()
          ctx!.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
          ctx!.fill()

          ctx!.shadowBlur = 0
          ctx!.fillStyle = '#000'
          ctx!.strokeStyle = '#000'
          ctx!.lineWidth = 2
          
          // Shield shape
          ctx!.beginPath()
          ctx!.moveTo(centerX, y + cellSize/4)
          ctx!.lineTo(x + 2*cellSize/3, y + cellSize/3)
          ctx!.lineTo(x + 2*cellSize/3, centerY + cellSize/8)
          ctx!.lineTo(centerX, y + 3*cellSize/4)
          ctx!.lineTo(x + cellSize/3, centerY + cellSize/8)
          ctx!.lineTo(x + cellSize/3, y + cellSize/3)
          ctx!.closePath()
          ctx!.stroke()
        } else if (powerUp.type === 'trailEraser') {
          // Purple eraser
          ctx!.shadowColor = '#ff00ff'
          ctx!.shadowBlur = 15
          ctx!.fillStyle = '#ff00ff'
          ctx!.beginPath()
          ctx!.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2)
          ctx!.fill()

          ctx!.shadowBlur = 0
          ctx!.fillStyle = '#000'
          
          // Eraser icon (X shape)
          ctx!.strokeStyle = '#000'
          ctx!.lineWidth = 2
          ctx!.beginPath()
          ctx!.moveTo(x + cellSize/3, y + cellSize/3)
          ctx!.lineTo(x + 2*cellSize/3, y + 2*cellSize/3)
          ctx!.moveTo(x + 2*cellSize/3, y + cellSize/3)
          ctx!.lineTo(x + cellSize/3, y + 2*cellSize/3)
          ctx!.stroke()
        }
      }
    })
  }
  
  // Watch for grid size changes
  watch(currentGridSize, (newSize) => {
    if (canvasRef.value && newSize > 0) {
      canvasRef.value.width = newSize * cellSize
      canvasRef.value.height = newSize * cellSize
      if (ctx) {
        ctx.imageSmoothingEnabled = false
      }
      createGridCache(newSize)
    }
  })
  
  // Auto-render when playing
  watch(gameState, (newState) => {
    if (newState === 'playing') {
      const renderLoop = () => {
        drawGame()
        if (gameState.value === 'playing') {
          requestAnimationFrame(renderLoop)
        }
      }
      renderLoop()
    }
  })
  
  onMounted(() => {
    setupCanvas()
  })
  
  return {
    canvasRef,
    drawGame,
    setupCanvas,
    cellSize,
  }
}

