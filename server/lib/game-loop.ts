/**
 * Game loop management with state dependencies
 * Requires explicit imports per Nuxt conventions
 */

import { lobbyService } from '../services/lobby.service'
import { ReplayService, type ReplayRecorder } from '../services/replay.service'
import type { ReplayInitialState } from '../types/replay.types'
import { broadcastLobbyState, broadcastGameState, broadcastToLobby, broadcastLobbyList } from './broadcast'

interface Peer {
  send: (data: string) => void;
  close: () => void;
  data?: PeerData;
}

interface PeerData {
  playerId: string;
  lobbyId: string | null;
  isSpectator: boolean;
  reconnectToken?: string;
  userId?: string;
}

/**
 * Start countdown interval - broadcasts lobby state every second during countdown
 */
export const startCountdownInterval = (
  lobbyId: string,
  connectedPeers: Map<string, Peer>,
  countdownIntervals: Map<string, NodeJS.Timeout>,
  replayRecorders: Map<string, ReplayRecorder>,
  gameIntervals: Map<string, NodeJS.Timeout>
) => {
  // Clear any existing countdown interval
  const existing = countdownIntervals.get(lobbyId)
  if (existing) {
    clearInterval(existing)
  }
  
  // Broadcast immediately
  broadcastLobbyState(lobbyId, connectedPeers)
  
  // Then broadcast every second to update countdown
  const interval = setInterval(() => {
    const lobby = lobbyService.getLobby(lobbyId)
    if (!lobby) {
      clearInterval(interval)
      countdownIntervals.delete(lobbyId)
      return
    }
    
    const snapshot = lobby.actor.getSnapshot()
    
    // If still in starting state, broadcast updated countdown
    if (snapshot.value === 'starting') {
      broadcastLobbyState(lobbyId, connectedPeers)
    }
    // If transitioned to inGame, start the game
    else if (snapshot.value === 'inGame') {
      clearInterval(interval)
      countdownIntervals.delete(lobbyId)
      
      // Generate obstacles and start game
      const context = lobbyService.getLobbyContext(lobbyId)
      if (context) {
        const obstacles = generateObstacles(context.settings.gridSize)
        lobbyService.startGame(lobbyId, obstacles)
        
        // Start replay recording
        const recorder = ReplayService.createRecorder()
        const initialState: ReplayInitialState = {
          gridSize: context.settings.gridSize,
          players: context.players.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            avatar: p.avatar || 'light-cycle',
            x: p.x,
            y: p.y,
            direction: p.direction,
            isAI: p.id.startsWith('ai-'),
          })),
          obstacles: obstacles.map(pos => {
            const parts = pos.split(',').map(Number)
            return { x: parts[0] || 0, y: parts[1] || 0 }
          }),
          settings: {
            maxPlayers: context.settings.maxPlayers,
            tickRate: 200, // Current tick rate
            maxPowerUps: 5,
          },
        }
        recorder.startRecording(initialState, context.settings.lobbyName || `Lobby ${lobbyId}`)
        replayRecorders.set(lobbyId, recorder)
        console.log(`[Replay] Started recording for lobby ${lobbyId}`)
        
        // Record game start event
        recorder.recordEvent({
          type: 'gameStarted',
          payload: { lobbyId },
        })
        
        // Broadcast initial game state immediately
        broadcastLobbyState(lobbyId, connectedPeers)
        broadcastGameState(lobbyId, connectedPeers)
        
        // Broadcast lobby list (state changed from starting to inGame)
        broadcastLobbyList(connectedPeers)
        
        startGameLoop(lobbyId, connectedPeers, gameIntervals, replayRecorders)
      }
    }
    // If went back to waiting or closed, just stop
    else {
      clearInterval(interval)
      countdownIntervals.delete(lobbyId)
    }
  }, 1000)

  countdownIntervals.set(lobbyId, interval)
}

/**
 * Start the main game loop
 */
export const startGameLoop = (
  lobbyId: string,
  connectedPeers: Map<string, Peer>,
  gameIntervals: Map<string, NodeJS.Timeout>,
  replayRecorders: Map<string, ReplayRecorder>
) => {
  // Clear any existing interval
  const existingInterval = gameIntervals.get(lobbyId)
  if (existingInterval) {
    clearInterval(existingInterval)
  }

  const interval = setInterval(() => {
    const lobby = lobbyService.getLobby(lobbyId)
    if (!lobby) {
      clearInterval(interval)
      gameIntervals.delete(lobbyId)
      return
    }

    if (!lobby.gameActor) {
      clearInterval(interval)
      gameIntervals.delete(lobbyId)
      return
    }

    const gameSnapshot = lobby.gameActor.getSnapshot()
    if (!gameSnapshot.matches('playing')) {
      return
    }

    // Send tick event
    lobby.gameActor.send({ type: 'TICK' })

    const context = gameSnapshot.context
    
    // Increment replay recorder tick
    const recorder = replayRecorders.get(lobbyId)
    if (recorder) {
      recorder.incrementTick()
    }

    // AI decision making - update AI player directions before movement
    context.players.forEach(player => {
      if (player.id.startsWith('ai-') && player.direction !== 'crashed') {
        const newDirection = getAIMove(player, context)
        if (newDirection !== player.direction) {
          // Record AI direction change
          if (recorder) {
            recorder.recordAction({
              playerId: player.id,
              action: 'move',
              payload: { direction: newDirection },
            })
          }
          player.direction = newDirection
        }
      }
    })

    // Spawn power-ups randomly (10% chance each tick if not at max)
    if (context.powerUps.length < context.settings.maxPowerUps && Math.random() < 0.1) {
      const gridSize = context.settings.gridSize
      const margin = 5
      let attempts = 0
      let spawned = false
      
      while (!spawned && attempts < 50) {
        attempts++
        const x = margin + Math.floor(Math.random() * (gridSize - 2 * margin))
        const y = margin + Math.floor(Math.random() * (gridSize - 2 * margin))
        const pos = `${x},${y}`
        
        // Check if position is clear
        const isObstacle = context.obstacles.includes(pos)
        const isTrail = context.players.some(p => p.trail.includes(pos))
        const isPowerUp = context.powerUps.some(p => p.x === x && p.y === y)
        
        if (!isObstacle && !isTrail && !isPowerUp && lobby.gameActor) {
          // Randomly select power-up type
          const powerUpTypes: Array<'speed' | 'shield' | 'trailEraser'> = ['speed', 'shield', 'trailEraser']
          const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)] as 'speed' | 'shield' | 'trailEraser'
          
          lobby.gameActor.send({ 
            type: 'SPAWN_POWERUP', 
            powerUp: { x, y, type: randomType }
          })
          spawned = true
          
          // Record power-up spawn
          if (recorder) {
            recorder.recordEvent({
              type: 'powerUpSpawned',
              payload: { x, y, type: randomType },
            })
          }
        }
      }
    }

    // Update player positions
    context.players.forEach(player => {
      if (player.direction === 'crashed') return

      // Check if speed boost expired
      const now = Date.now()
      if (player.speedBoostUntil && now >= player.speedBoostUntil) {
        player.speed = 1
        player.speedBoostUntil = null
      }

      // Calculate move steps
      let moveSteps = 0
      if (player.isBraking) {
        moveSteps = context.ticks % 5 === 0 ? 1 : 0
      } else if (player.speedBoostUntil && now < player.speedBoostUntil) {
        moveSteps = 2
      } else {
        moveSteps = 1
      }

      // Move player
      for (let step = 0; step < moveSteps; step++) {
        const startPos = `${player.x},${player.y}`
        if (!player.trail.includes(startPos)) {
          player.trail.push(startPos)
        }

        // Update position
        switch (player.direction) {
          case 'up': player.y--; break
          case 'down': player.y++; break
          case 'left': player.x--; break
          case 'right': player.x++; break
        }

        // Check collisions
        const currentPos = `${player.x},${player.y}`
        const wallCollision = player.x < 0 || player.x >= context.settings.gridSize || 
                             player.y < 0 || player.y >= context.settings.gridSize
        
        const trailCollision = context.players.some(p => {
          if (p.id === player.id) {
            return p.trail.slice(0, -1).includes(currentPos)
          }
          return p.trail.includes(currentPos)
        })

        const obstacleCollision = context.obstacles.includes(currentPos)

        if (wallCollision || trailCollision || obstacleCollision) {
          // Check if player has shield
          if (player.hasShield && lobby.gameActor) {
            // Shield absorbs the hit
            lobby.gameActor.send({ 
              type: 'PLAYER_CRASHED', 
              playerId: player.id, 
              shieldAbsorbed: true 
            })
            
            // Broadcast shield absorption
            broadcastToLobby(lobbyId, {
              type: 'shieldAbsorbed',
              payload: { playerId: player.id },
            }, connectedPeers)
            
            // Don't mark as crashed, just continue
            player.trail.push(currentPos)
          } else {
            // No shield - player crashes
            if (lobby.gameActor) {
              lobby.gameActor.send({ type: 'PLAYER_CRASHED', playerId: player.id })
            }
            
            // Record player crash
            if (recorder) {
              recorder.recordEvent({
                type: 'playerCrashed',
                payload: { playerId: player.id },
              })
            }
            
            broadcastToLobby(lobbyId, {
              type: 'playerCrashed',
              payload: { playerId: player.id },
            }, connectedPeers)
            break
          }
        } else {
          // Check for power-up collection
          const powerUpIndex = context.powerUps.findIndex(p => p.x === player.x && p.y === player.y)
          if (powerUpIndex !== -1 && lobby.gameActor) {
            const powerUp = context.powerUps[powerUpIndex]
            const powerUpType = powerUp?.type || 'speed'
            lobby.gameActor.send({ 
              type: 'COLLECT_POWERUP', 
              playerId: player.id, 
              powerUpIndex,
              powerUpType
            })
            
            // Record power-up collection
            if (recorder) {
              recorder.recordEvent({
                type: 'powerUpCollected',
                payload: { playerId: player.id, powerUpIndex, powerUpType },
              })
            }
          }
          player.trail.push(currentPos)
        }
      }
    })

    // Broadcast updated game state
    broadcastGameState(lobbyId, connectedPeers)
    
    // Record player positions for replay (snapshot every tick)
    if (recorder) {
      const positionSnapshot: Record<string, { x: number; y: number; direction: string; trail: string[] }> = {}
      context.players.forEach(player => {
        positionSnapshot[player.id] = {
          x: player.x,
          y: player.y,
          direction: player.direction,
          trail: [...player.trail] // Copy trail array
        }
      })
      recorder.recordEvent({
        type: 'positionSnapshot',
        payload: { positions: positionSnapshot },
      })
    }

    // Get FRESH context after all crash events have been processed
    const freshSnapshot = lobby.gameActor?.getSnapshot()
    const freshContext = freshSnapshot?.context
    
    if (!freshContext) {
      console.error(`[GameCheck] No fresh context available for lobby ${lobbyId}`)
      return
    }
    
    // Check for game over using the fresh context
    const activePlayers = freshContext.players.filter(p => p.direction !== 'crashed')
    
    if (activePlayers.length === 0 || (activePlayers.length === 1 && freshContext.players.length > 1)) {
      const winnerPlayer = activePlayers.length === 1 ? activePlayers[0] : null
      const winner = winnerPlayer?.id || null
      
      // Check if replay was being recorded BEFORE stopping it
      const wasRecording = recorder?.isCurrentlyRecording() || false
      
      // Record game over event
      if (recorder) {
        recorder.recordEvent({
          type: 'gameOver',
          payload: { 
            winner, 
            winnerColor: winnerPlayer?.color || null,
            draw: winner === null 
          },
        })
        recorder.stopRecording()
        console.log(`[Replay] Stopped recording for lobby ${lobbyId}, actions: ${recorder['actions']?.length || 0}, events: ${recorder['events']?.length || 0}`)
      }
      
      // Stop the game loop FIRST
      clearInterval(interval)
      gameIntervals.delete(lobbyId)
      
      // Broadcast game over IMMEDIATELY before any state changes
      broadcastToLobby(lobbyId, {
        type: 'gameOver',
        payload: { 
          winner, 
          winnerColor: winnerPlayer?.color || null,
          draw: winner === null,
          replayAvailable: wasRecording
        },
      }, connectedPeers)
      
      // End game via state machine (transitions to 'finished' state)
      lobbyService.endGame(lobbyId, winner)
      
      // Reset player positions for next game
      const lobbyContext = lobbyService.getLobbyContext(lobbyId)
      if (lobbyContext) {
        lobbyContext.players.forEach(p => {
          const pos = getSafePosition(
            lobbyContext.settings.gridSize,
            lobbyContext.players,
            lobbyService.getGameContext(lobbyId)?.obstacles || []
          )
          p.x = pos.x
          p.y = pos.y
          p.direction = pos.direction
          p.trail = []
          p.speed = 1
          p.speedBoostUntil = null
          p.isBraking = false
          p.brakeStartTime = null
        })
      }
    }
  }, 200) // 200ms tick rate

  gameIntervals.set(lobbyId, interval)
}

