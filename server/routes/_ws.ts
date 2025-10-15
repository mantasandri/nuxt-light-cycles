// server/routes/_ws.new.ts
import { lobbyService } from '../services/lobby.service';
import type { GamePlayer } from '../types/game.types';
import { ReplayService, type ReplayRecorder } from '../services/replay.service';
import type { ReplayInitialState } from '../types/replay.types';

interface Peer {
  send: (data: string) => void;
  close: () => void;
  data?: PeerData;
}

interface Message {
  toString: () => string;
}

interface GameMessage {
  type: string;
  payload: unknown;
}

interface PeerData {
  playerId: string;
  lobbyId: string | null; // Allow null for browsing state
  isSpectator: boolean; // Track if this peer is spectating
  reconnectToken?: string; // Token for reconnection
  userId?: string; // Persistent user ID from localStorage
}

// Map to store connected peers
const connectedPeers = new Map<string, Peer>();

// Map to store reconnection tokens -> peer data for session recovery
const reconnectionSessions = new Map<string, { playerId: string; lobbyId: string | null; isSpectator: boolean; lastSeen: number }>();

// Game loop intervals per lobby
const gameIntervals = new Map<string, NodeJS.Timeout>();
const countdownIntervals = new Map<string, NodeJS.Timeout>();

// Replay recorders per lobby
const replayRecorders = new Map<string, ReplayRecorder>();

/**
 * Broadcast to a specific peer
 */
const sendToPeer = (playerId: string, message: GameMessage) => {
  const peer = connectedPeers.get(playerId);
  if (peer) {
    peer.send(JSON.stringify(message));
  }
};

/**
 * Get list of all lobbies for browser
 */
const getLobbyList = () => {
  const lobbies = lobbyService.getAllLobbies();
  return lobbies.map(lobby => {
    const snapshot = lobby.actor.getSnapshot();
    const context = snapshot.context;
    const hostPlayer = context.players.find(p => p.id === context.hostId);
    
    return {
      lobbyId: context.lobbyId,
      playerCount: context.players.length,
      maxPlayers: context.settings.maxPlayers,
      gridSize: context.settings.gridSize,
      isPrivate: context.settings.isPrivate,
      hostName: hostPlayer?.name || 'Unknown',
      state: snapshot.value,
    };
  });
};

/**
 * Broadcast lobby list to all players who are browsing (not in a lobby)
 */
const broadcastLobbyList = () => {
  const lobbyList = getLobbyList();
  
  // Send to all connected players who are NOT in a lobby
  for (const [playerId, peer] of connectedPeers) {
    const peerData = (peer as Peer & { data?: PeerData }).data;
    if (!peerData?.lobbyId) {
      // Player is browsing, send them the updated list
      sendToPeer(playerId, {
        type: 'lobbyList',
        payload: {
          lobbies: lobbyList
        },
      });
    }
  }
};

/**
 * Broadcast message to all players in a specific lobby
 */
const broadcastToLobby = (lobbyId: string, message: GameMessage) => {
  const messageStr = JSON.stringify(message);
  for (const [_, peer] of connectedPeers) {
    const peerData = (peer as Peer & { data?: PeerData }).data;
    if (peerData?.lobbyId === lobbyId) {
      peer.send(messageStr);
    }
  }
};

/**
 * Broadcast lobby state (players, settings, etc.)
 */
const broadcastLobbyState = (lobbyId: string) => {
  const context = lobbyService.getLobbyContext(lobbyId);
  if (!context) {
    console.log(`[broadcastLobbyState] No context found for lobby ${lobbyId}`);
    return;
  }

  const lobby = lobbyService.getLobby(lobbyId);
  if (!lobby) {
    console.log(`[broadcastLobbyState] No lobby found for ${lobbyId}`);
    return;
  }

  const snapshot = lobby.actor.getSnapshot();
  
  // Calculate countdown remaining time if in starting state
  let countdownRemaining = null;
  if (snapshot.value === 'starting' && context.countdownStartedAt) {
    const elapsed = Date.now() - context.countdownStartedAt;
    countdownRemaining = Math.max(0, Math.ceil((5000 - elapsed) / 1000)); // 5 seconds countdown
  }
  
  const payload = {
    lobbyId: context.lobbyId,
    state: snapshot.value,
    players: context.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isReady: p.isReady,
    })),
    spectators: context.spectators.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })),
    settings: context.settings,
    hostId: context.hostId,
    countdownRemaining,
    roundNumber: context.roundNumber,
  };
  
  broadcastToLobby(lobbyId, {
    type: 'lobbyState',
    payload,
  });
};

/**
 * Broadcast full game state (positions, trails, power-ups, etc.)
 */
const broadcastGameState = (lobbyId: string) => {
  const gameContext = lobbyService.getGameContext(lobbyId);
  if (!gameContext) {
    return;
  }
  
  broadcastToLobby(lobbyId, {
    type: 'gameState',
    payload: {
      players: gameContext.players.map(p => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        direction: p.direction,
        color: p.color,
        trail: p.trail,
        isReady: p.isReady,
        speed: p.speed,
        speedBoostUntil: p.speedBoostUntil,
        isBraking: p.isBraking,
      })),
      powerUps: gameContext.powerUps,
      obstacles: gameContext.obstacles,
      gridSize: gameContext.settings.gridSize,
      gameState: 'playing', // We'll derive this from the game machine state
    },
  });
};

/**
 * Generate random obstacles on the grid
 */
const generateObstacles = (gridSize: number): string[] => {
  const obstacles: string[] = [];
  const margin = 5;
  const minObstacleSpacing = 5;

  const isTooCloseToObstacle = (x: number, y: number): boolean => {
    return obstacles.some(obs => {
      const [ox, oy] = obs.split(',').map(Number);
      const distance = Math.sqrt(Math.pow(ox - x, 2) + Math.pow(oy - y, 2));
      return distance < minObstacleSpacing;
    });
  };

  const quadrantSize = Math.floor(gridSize / 2);
  const quadrants = [
    { x: 0, y: 0 },
    { x: quadrantSize, y: 0 },
    { x: 0, y: quadrantSize },
    { x: quadrantSize, y: quadrantSize },
  ];

  quadrants.forEach(quadrant => {
    // Increased from 0.03 (3%) to 0.08 (8%) for more obstacles
    const numObstaclesInQuadrant = Math.floor((quadrantSize * quadrantSize) * 0.08);
    let attempts = 0;
    let placedInQuadrant = 0;

    while (placedInQuadrant < numObstaclesInQuadrant && attempts < 100) {
      attempts++;
      const x = quadrant.x + margin + Math.floor(Math.random() * (quadrantSize - 2 * margin));
      const y = quadrant.y + margin + Math.floor(Math.random() * (quadrantSize - 2 * margin));
      
      if (!isTooCloseToObstacle(x, y)) {
        obstacles.push(`${x},${y}`);
        placedInQuadrant++;
      }
    }
  });

  return obstacles;
};

/**
 * Get a safe spawn position for a player
 */
const getSafePosition = (lobbyId: string): { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right' } => {
  const context = lobbyService.getLobbyContext(lobbyId);
  if (!context) {
    return { x: 5, y: 5, direction: 'right' };
  }

  const gridSize = context.settings.gridSize;
  const margin = 5;
  const maxAttempts = 50;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const x = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
    const y = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
    const pos = `${x},${y}`;

    // Check if position is clear
    const gameContext = lobbyService.getGameContext(lobbyId);
    const obstacles = gameContext?.obstacles || [];
    
    const isOccupied = context.players.some(p => 
      (p.x === x && p.y === y) || p.trail.includes(pos)
    ) || obstacles.includes(pos);

    if (!isOccupied) {
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      return { x, y, direction };
    }
  }

  return { x: margin, y: margin, direction: 'right' };
};

/**
 * Start countdown interval - broadcasts lobby state every second during countdown
 */
const startCountdownInterval = (lobbyId: string) => {
  // Clear any existing countdown interval
  const existing = countdownIntervals.get(lobbyId);
  if (existing) {
    clearInterval(existing);
  }
  
  // Broadcast immediately
  broadcastLobbyState(lobbyId);
  
  // Then broadcast every second to update countdown
  const interval = setInterval(() => {
    const lobby = lobbyService.getLobby(lobbyId);
    if (!lobby) {
      clearInterval(interval);
      countdownIntervals.delete(lobbyId);
      return;
    }
    
    const snapshot = lobby.actor.getSnapshot();
    
    // If still in starting state, broadcast updated countdown
    if (snapshot.value === 'starting') {
      broadcastLobbyState(lobbyId);
    }
    // If transitioned to inGame, start the game
    else if (snapshot.value === 'inGame') {
      clearInterval(interval);
      countdownIntervals.delete(lobbyId);
      
      // Generate obstacles and start game
      const context = lobbyService.getLobbyContext(lobbyId);
      if (context) {
        const obstacles = generateObstacles(context.settings.gridSize);
        lobbyService.startGame(lobbyId, obstacles);
        
        // Start replay recording
        const recorder = ReplayService.createRecorder();
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
            const [x, y] = pos.split(',').map(Number);
            return { x, y };
          }),
          settings: {
            maxPlayers: context.settings.maxPlayers,
            tickRate: 200, // Current tick rate
            maxPowerUps: 5,
          },
        };
        recorder.startRecording(initialState, context.settings.lobbyName || `Lobby ${lobbyId}`);
        replayRecorders.set(lobbyId, recorder);
        console.log(`[Replay] Started recording for lobby ${lobbyId}`);
        
        // Record game start event
        recorder.recordEvent({
          type: 'gameStarted',
          payload: { lobbyId },
        });
        
        // Broadcast initial game state immediately
        broadcastLobbyState(lobbyId);
        broadcastGameState(lobbyId);
        
        // Broadcast lobby list (state changed from starting to inGame)
        broadcastLobbyList();
        
        startGameLoop(lobbyId);
      }
    }
    // If went back to waiting or closed, just stop
    else {
      clearInterval(interval);
      countdownIntervals.delete(lobbyId);
    }
  }, 1000);

  countdownIntervals.set(lobbyId, interval);
};

/**
 * AI logic to determine next move
 */
const getAIMove = (player: GamePlayer, context: { players: GamePlayer[], obstacles: string[], settings: { gridSize: number }, powerUps: Array<{ x: number, y: number }> }): 'up' | 'down' | 'left' | 'right' => {
  const gridSize = context.settings.gridSize;
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
  
  // Helper to check if a position is safe
  const isSafe = (x: number, y: number, checkDistance: number = 1): boolean => {
    // Check bounds
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
    
    const pos = `${x},${y}`;

    // Check obstacles
    if (context.obstacles.includes(pos)) return false;
    
    // Check all trails
    for (const p of context.players) {
      if (p.trail.includes(pos)) return false;
    }
    
    // Look ahead for additional safety
    if (checkDistance > 1) {
      const lookaheadDirections: Array<{ dx: number, dy: number }> = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
      ];
      
      let safeExits = 0;
      for (const dir of lookaheadDirections) {
        const nextX = x + dir.dx;
        const nextY = y + dir.dy;
        if (nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
          const nextPos = `${nextX},${nextY}`;
          if (!context.obstacles.includes(nextPos) && !context.players.some(p => p.trail.includes(nextPos))) {
            safeExits++;
          }
        }
      }
      
      return safeExits >= 2; // Need at least 2 exits for safety
    }
    
    return true;
  };
  
  // Score each direction
  const scores = directions.map(dir => {
    let x = player.x;
    let y = player.y;
    
    switch (dir) {
      case 'up': y--; break;
      case 'down': y++; break;
      case 'left': x--; break;
      case 'right': x++; break;
    }
    
    let score = 0;
    
    // Immediately unsafe = very negative score
    if (!isSafe(x, y, 1)) {
      return { dir, score: -1000 };
    }
    
    // Look ahead 2-3 steps for better planning
    if (isSafe(x, y, 2)) {
      score += 100;
    }
    
    // Prefer directions toward power-ups if close
    if (context.powerUps.length > 0) {
      const closestPowerUp = context.powerUps[0];
      const distanceToPowerUp = Math.abs(x - closestPowerUp.x) + Math.abs(y - closestPowerUp.y);
      if (distanceToPowerUp < 10) {
        score += (10 - distanceToPowerUp) * 5;
      }
    }
    
    // Prefer center of the map (more options)
    const centerX = gridSize / 2;
    const centerY = gridSize / 2;
    const distanceFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
    score += (gridSize - distanceFromCenter) * 2;
    
    // Avoid going back in the opposite direction unless necessary
    const opposites: Record<string, string> = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };
    
    if (dir === opposites[player.direction]) {
      score -= 50;
    }
    
    return { dir, score };
  });
  
  // Sort by score and pick the best
  scores.sort((a, b) => b.score - a.score);
  
  // If best move is still negative, we're likely trapped, but try anyway
  return scores[0].dir;
};

/**
 * Start the main game loop
 */
const startGameLoop = (lobbyId: string) => {
  // Clear any existing interval
  const existingInterval = gameIntervals.get(lobbyId);
  if (existingInterval) {
    clearInterval(existingInterval);
  }

    const interval = setInterval(() => {
    const lobby = lobbyService.getLobby(lobbyId);
    if (!lobby) {
      clearInterval(interval);
      gameIntervals.delete(lobbyId);
      return;
    }

    if (!lobby.gameActor) {
      clearInterval(interval);
      gameIntervals.delete(lobbyId);
      return;
    }

    const gameSnapshot = lobby.gameActor.getSnapshot();
    if (!gameSnapshot.matches('playing')) {
      return;
    }

    // Send tick event
    lobby.gameActor.send({ type: 'TICK' });

    const context = gameSnapshot.context;
    
    // Increment replay recorder tick
    const recorder = replayRecorders.get(lobbyId);
    if (recorder) {
      recorder.incrementTick();
    }

    // AI decision making - update AI player directions before movement
    context.players.forEach(player => {
      if (player.id.startsWith('ai-') && player.direction !== 'crashed') {
        player.direction = getAIMove(player, context);
      }
    });

    // Spawn power-ups randomly (10% chance each tick if not at max)
    if (context.powerUps.length < context.settings.maxPowerUps && Math.random() < 0.1) {
      const gridSize = context.settings.gridSize;
      const margin = 5;
      let attempts = 0;
      let spawned = false;
      
      while (!spawned && attempts < 50) {
        attempts++;
        const x = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        const y = margin + Math.floor(Math.random() * (gridSize - 2 * margin));
        const pos = `${x},${y}`;
        
        // Check if position is clear
        const isObstacle = context.obstacles.includes(pos);
        const isTrail = context.players.some(p => p.trail.includes(pos));
        const isPowerUp = context.powerUps.some(p => p.x === x && p.y === y);
        
        if (!isObstacle && !isTrail && !isPowerUp && lobby.gameActor) {
          lobby.gameActor.send({ 
            type: 'SPAWN_POWERUP', 
            powerUp: { x, y, type: 'speed' }
          });
          spawned = true;
          
          // Record power-up spawn
          if (recorder) {
            recorder.recordEvent({
              type: 'powerUpSpawned',
              payload: { x, y, type: 'speed' },
            });
          }
        }
      }
    }

    // Update player positions
    context.players.forEach(player => {
      if (player.direction === 'crashed') return;

      // Check if speed boost expired
      const now = Date.now();
      if (player.speedBoostUntil && now >= player.speedBoostUntil) {
        player.speed = 1;
        player.speedBoostUntil = null;
      }

      // Calculate move steps
      let moveSteps = 0;
      if (player.isBraking) {
        moveSteps = context.ticks % 5 === 0 ? 1 : 0;
      } else if (player.speedBoostUntil && now < player.speedBoostUntil) {
        moveSteps = 2;
      } else {
        moveSteps = 1;
      }

      // Move player
      for (let step = 0; step < moveSteps; step++) {
        const startPos = `${player.x},${player.y}`;
      if (!player.trail.includes(startPos)) {
        player.trail.push(startPos);
      }

        // Update position
        switch (player.direction) {
          case 'up': player.y--; break;
          case 'down': player.y++; break;
          case 'left': player.x--; break;
          case 'right': player.x++; break;
        }

        // Check collisions
        const currentPos = `${player.x},${player.y}`;
        const wallCollision = player.x < 0 || player.x >= context.settings.gridSize || 
                             player.y < 0 || player.y >= context.settings.gridSize;
        
        const trailCollision = context.players.some(p => {
          if (p.id === player.id) {
            return p.trail.slice(0, -1).includes(currentPos);
          }
          return p.trail.includes(currentPos);
        });

        const obstacleCollision = context.obstacles.includes(currentPos);

        if (wallCollision || trailCollision || obstacleCollision) {
          if (lobby.gameActor) {
            lobby.gameActor.send({ type: 'PLAYER_CRASHED', playerId: player.id });
          }
          
          // Record player crash
          if (recorder) {
            recorder.recordEvent({
              type: 'playerCrashed',
              payload: { playerId: player.id },
            });
          }
          
          broadcastToLobby(lobbyId, {
            type: 'playerCrashed',
            payload: { playerId: player.id },
          });
          break;
        } else {
          // Check for power-up collection
          const powerUpIndex = context.powerUps.findIndex(p => p.x === player.x && p.y === player.y);
          if (powerUpIndex !== -1 && lobby.gameActor) {
            lobby.gameActor.send({ 
              type: 'COLLECT_POWERUP', 
              playerId: player.id, 
              powerUpIndex 
            });
            
            // Record power-up collection
            if (recorder) {
              recorder.recordEvent({
                type: 'powerUpCollected',
                payload: { playerId: player.id, powerUpIndex },
              });
            }
          }
          player.trail.push(currentPos);
        }
      }
    });

    // Broadcast updated game state
    broadcastGameState(lobbyId);

    // Get FRESH context after all crash events have been processed
    const freshSnapshot = lobby.gameActor?.getSnapshot();
    const freshContext = freshSnapshot?.context;
    
    if (!freshContext) {
      console.error(`[GameCheck] No fresh context available for lobby ${lobbyId}`);
      return;
    }
    
    // Check for game over using the fresh context
    const activePlayers = freshContext.players.filter(p => p.direction !== 'crashed');
    
    if (activePlayers.length === 0 || (activePlayers.length === 1 && freshContext.players.length > 1)) {
      const winner = activePlayers.length === 1 ? activePlayers[0].id : null;
      
      // Check if replay was being recorded BEFORE stopping it
      const wasRecording = recorder?.isCurrentlyRecording() || false;
      
      // Record game over event
      if (recorder) {
        recorder.recordEvent({
          type: 'gameOver',
          payload: { 
            winner, 
            winnerColor: winner ? activePlayers[0].color : null,
            draw: winner === null 
          },
        });
        recorder.stopRecording();
        console.log(`[Replay] Stopped recording for lobby ${lobbyId}, actions: ${recorder['actions']?.length || 0}, events: ${recorder['events']?.length || 0}`);
      }
      
      // Stop the game loop FIRST
      clearInterval(interval);
      gameIntervals.delete(lobbyId);
      
      // Broadcast game over IMMEDIATELY before any state changes
      broadcastToLobby(lobbyId, {
        type: 'gameOver',
        payload: { 
          winner, 
          winnerColor: winner ? activePlayers[0].color : null,
          draw: winner === null,
          replayAvailable: wasRecording
        },
      });
      
      // DON'T transition back to lobby automatically
      // Let the client handle it via the "Play Again" or "Quit" buttons
      
      // End game via state machine (transitions to 'finished' state)
      lobbyService.endGame(lobbyId, winner);
      
      // Reset player positions for next game
      const lobbyContext = lobbyService.getLobbyContext(lobbyId);
      if (lobbyContext) {
        lobbyContext.players.forEach(p => {
          const pos = getSafePosition(lobbyId);
          p.x = pos.x;
          p.y = pos.y;
          p.direction = pos.direction;
          p.trail = [];
          p.speed = 1;
          p.speedBoostUntil = null;
          p.isBraking = false;
          p.brakeStartTime = null;
        });
      }
    }
  }, 200); // 200ms tick rate

  gameIntervals.set(lobbyId, interval);
};

/**
 * Check if color is too similar to existing colors
 */
const isColorTooSimilar = (color1: string, color2: string): boolean => {
  const getHSL = (color: string) => {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return null;
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3]),
    };
  };

  const hsl1 = getHSL(color1);
  const hsl2 = getHSL(color2);
  if (!hsl1 || !hsl2) return false;

  const hueDiff = Math.abs(hsl1.h - hsl2.h);
  const minHueDiff = Math.min(hueDiff, 360 - hueDiff);
  return minHueDiff < 30;
};

/**
 * WebSocket Handler
 */
export default defineWebSocketHandler({
  open: async (peer: Peer) => {
    const playerId = `player-${Math.random().toString(36).slice(2, 8)}`;
    const reconnectToken = `token-${Math.random().toString(36).slice(2, 16)}`;
    
    // Store peer connection (not in a lobby yet - browsing state)
    connectedPeers.set(playerId, peer);
    (peer as Peer & { data?: PeerData }).data = { 
      playerId, 
      lobbyId: null, 
      isSpectator: false,
      reconnectToken
    };

    console.log(`[WebSocket] Player ${playerId} connected (browsing)`);
    
    // Send initial connection info with lobby list
    peer.send(JSON.stringify({
      type: 'connected',
      payload: {
        playerId,
        reconnectToken,
        lobbies: getLobbyList(),
      },
    }));
  },

  message: async (peer: Peer, message: Message) => {
    const peerData = (peer as Peer & { data?: PeerData }).data;
    if (!peerData?.playerId) return;

    const { playerId, lobbyId } = peerData;
    const data = JSON.parse(message.toString());
    
    // Log incoming message types for debugging if needed
    // console.log(`[WebSocket] Received from ${playerId}:`, data.type);

    // Handle reconnection
    if (data.type === 'reconnect') {
      const token = data.payload.reconnectToken;
      const session = reconnectionSessions.get(token);
      
      if (session && Date.now() - session.lastSeen < 60000) { // 1 minute window
        console.log(`[WebSocket] Player ${playerId} reconnecting with token ${token}`);
        
        // Restore session
        (peer as Peer & { data?: PeerData }).data = {
          playerId: session.playerId,
          lobbyId: session.lobbyId,
          isSpectator: session.isSpectator,
          reconnectToken: token
        };
        
        // Update peer reference
        connectedPeers.set(session.playerId, peer);
        
        // Send reconnect success
        sendToPeer(session.playerId, {
          type: 'reconnected',
          payload: {
            playerId: session.playerId,
            lobbyId: session.lobbyId,
            isSpectator: session.isSpectator
          },
        });
        
        // If they were in a lobby, send current lobby state
        if (session.lobbyId) {
          broadcastLobbyState(session.lobbyId);
        }
        
        return;
      } else {
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Reconnection session expired or invalid' },
        });
        return;
      }
    }

    // Handle setUserId (set persistent user ID from client)
    if (data.type === 'setUserId') {
      const userId = data.payload.userId;
      if (userId && typeof userId === 'string') {
        const currentPeerData = (peer as Peer & { data?: PeerData }).data;
        if (currentPeerData) {
          currentPeerData.userId = userId;
          console.log(`[UserID] Set persistent userId for player ${playerId}: ${userId}`);
        }
      }
      return;
    }

    // Handle lobby browsing actions (no lobby required)
    if (data.type === 'getLobbyList') {
      sendToPeer(playerId, {
        type: 'lobbyList',
        payload: { lobbies: getLobbyList() },
      });
      return;
    }

    if (data.type === 'createLobby') {
      const settings = data.payload.settings;
      const playerName = data.payload.playerName;
      const playerColor = data.payload.playerColor;
      
      // Create new lobby
      const lobby = lobbyService.createLobby(playerId, settings);
      const newLobbyId = lobby.id;
      
      // Update peer data
      const peerDataForUpdate = (peer as Peer & { data?: PeerData }).data;
      if (peerDataForUpdate) {
        peerDataForUpdate.lobbyId = newLobbyId;
        peerDataForUpdate.isSpectator = false;
      }
      
      // Get safe starting position
      const startPos = getSafePosition(newLobbyId);
      
      // Create player object
      const newPlayer: GamePlayer = {
        id: playerId,
        name: playerName || `Player ${playerId.slice(-4)}`,
        x: startPos.x,
        y: startPos.y,
        direction: startPos.direction,
        color: playerColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
        trail: [],
        isReady: false,
        speed: 1,
        speedBoostUntil: null,
        isBraking: false,
        brakeStartTime: null,
        gameId: newLobbyId,
      };
      
      // Add player to lobby
      lobbyService.addPlayerToLobby(newLobbyId, newPlayer);
      
      // Add AI players if requested
      if (settings.enableAI && settings.aiPlayerCount > 0) {
        for (let i = 0; i < settings.aiPlayerCount; i++) {
          const aiPos = getSafePosition(newLobbyId);
          const aiPlayer: GamePlayer = {
            id: `ai-${Math.random().toString(36).slice(2, 8)}`,
            name: `AI Bot ${i + 1}`,
            x: aiPos.x,
            y: aiPos.y,
            direction: aiPos.direction,
            color: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
            trail: [],
            isReady: true, // AI always ready
            speed: 1,
            speedBoostUntil: null,
            isBraking: false,
            brakeStartTime: null,
            gameId: newLobbyId,
          };
          lobbyService.addPlayerToLobby(newLobbyId, aiPlayer);
        }
      }
      
      const context = lobbyService.getLobbyContext(newLobbyId);
      
      console.log(`[WebSocket] Lobby ${newLobbyId} created with ${context?.players.length} players (including AI)`);
      
      // Send success response
      sendToPeer(playerId, {
        type: 'lobbyJoined',
        payload: {
          lobbyId: newLobbyId,
          player: newPlayer,
          gridSize: context?.settings.gridSize || 40,
        },
      });
      
      // Broadcast updated lobby state to the creator
      broadcastLobbyState(newLobbyId);
      
      // Broadcast updated lobby list to all browsing players
      broadcastLobbyList();
      return;
    }

    if (data.type === 'joinLobby') {
      const targetLobbyId = data.payload.lobbyId;
      const playerName = data.payload.playerName;
      const playerColor = data.payload.playerColor;
      
      const lobby = lobbyService.getLobby(targetLobbyId);
      if (!lobby) {
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Lobby not found' },
        });
        return;
      }
      
      // Update peer data
      const peerDataUpdate = (peer as Peer & { data?: PeerData }).data;
      if (peerDataUpdate) {
        peerDataUpdate.lobbyId = targetLobbyId;
        peerDataUpdate.isSpectator = false;
      }
      
      // Get safe starting position
      const startPos = getSafePosition(targetLobbyId);
      
      // Create player object
      const newPlayer: GamePlayer = {
        id: playerId,
        name: playerName || `Player ${playerId.slice(-4)}`,
        x: startPos.x,
        y: startPos.y,
        direction: startPos.direction,
        color: playerColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
        trail: [],
        isReady: false,
        speed: 1,
        speedBoostUntil: null,
        isBraking: false,
        brakeStartTime: null,
        gameId: targetLobbyId,
      };
      
      // Add player to lobby
      lobbyService.addPlayerToLobby(targetLobbyId, newPlayer);
      
      const context = lobbyService.getLobbyContext(targetLobbyId);
      
      // Send success response
      sendToPeer(playerId, {
        type: 'lobbyJoined',
        payload: {
          lobbyId: targetLobbyId,
          player: newPlayer,
          gridSize: context?.settings.gridSize || 40,
          isSpectator: false,
        },
      });
      
      // Broadcast updated lobby state
      broadcastLobbyState(targetLobbyId);
      
      // Broadcast updated lobby list to all browsing players
      broadcastLobbyList();
      return;
    }

    if (data.type === 'joinLobbyAsSpectator') {
      const targetLobbyId = data.payload.lobbyId;
      const spectatorName = data.payload.playerName;
      const spectatorColor = data.payload.playerColor;
      
      const lobby = lobbyService.getLobby(targetLobbyId);
      if (!lobby) {
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Lobby not found' },
        });
        return;
      }

      const context = lobbyService.getLobbyContext(targetLobbyId);
      if (!context?.settings.allowSpectators) {
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Spectators not allowed in this lobby' },
        });
        return;
      }
      
      // Update peer data
      const peerDataUpdate = (peer as Peer & { data?: PeerData }).data;
      if (peerDataUpdate) {
        peerDataUpdate.lobbyId = targetLobbyId;
        peerDataUpdate.isSpectator = true;
      }
      
      // Create spectator object
      const newSpectator = {
        id: playerId,
        name: spectatorName || `Spectator ${playerId.slice(-4)}`,
        color: spectatorColor || `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
        joinedAt: Date.now(),
      };
      
      // Add spectator to lobby
      lobbyService.addSpectatorToLobby(targetLobbyId, newSpectator);
      
      // Send success response
      sendToPeer(playerId, {
        type: 'lobbyJoined',
        payload: {
          lobbyId: targetLobbyId,
          spectator: newSpectator,
          gridSize: context?.settings.gridSize || 40,
          isSpectator: true,
        },
      });
      
      // Broadcast updated lobby state
      broadcastLobbyState(targetLobbyId);
      
      // Broadcast updated lobby list to all browsing players
      broadcastLobbyList();
      return;
    }

    if (data.type === 'leaveLobby') {
      if (!lobbyId) return;
      
      const currentPeerData = (peer as Peer & { data?: PeerData }).data;
      
      // Remove player or spectator from lobby
      if (currentPeerData?.isSpectator) {
        lobbyService.removeSpectatorFromLobby(lobbyId, playerId);
      } else {
        lobbyService.removePlayerFromLobby(lobbyId, playerId);
      }
      
      // Update peer data to remove lobby association
      if (currentPeerData) {
        currentPeerData.lobbyId = null;
        currentPeerData.isSpectator = false;
      }
      
      // Check if only AI players remain
      const context = lobbyService.getLobbyContext(lobbyId);
      let lobbyClosed = false;
      if (context) {
        const humanPlayers = context.players.filter(p => !p.id.startsWith('ai-'));
        
        // If no human players remain (only AI + spectators, or empty), close the lobby
        if (humanPlayers.length === 0) {
          console.log(`[WebSocket] No human players left in lobby ${lobbyId}, closing...`);
          
          // Notify all spectators that lobby is closing
          if (context.spectators.length > 0) {
            for (const spectator of context.spectators) {
              const spectatorPeer = connectedPeers.get(spectator.id);
              if (spectatorPeer) {
                const peerData = (spectatorPeer as Peer & { data?: PeerData }).data;
                if (peerData) {
                  peerData.lobbyId = null;
                  peerData.isSpectator = false;
                }
                
                sendToPeer(spectator.id, {
                  type: 'lobbyClosed',
                  payload: { 
                    message: 'All players have left. Returning to lobby browser...' 
                  },
                });
                
                // Send them back to lobby browser
                sendToPeer(spectator.id, {
                  type: 'connected',
                  payload: {
                    playerId: spectator.id,
                    reconnectToken: peerData?.reconnectToken || '',
                    lobbies: getLobbyList(),
                  },
                });
              }
            }
          }
          
          // Stop game interval if running
          const interval = gameIntervals.get(lobbyId);
          if (interval) {
            clearInterval(interval);
            gameIntervals.delete(lobbyId);
          }
          
          // Clean up replay recorder if exists (lobby closing, replay not saved)
          if (replayRecorders.has(lobbyId)) {
            console.log(`[Replay] Cleaning up unsaved recorder for lobby ${lobbyId}`);
            replayRecorders.delete(lobbyId);
          }
          
          lobbyService.closeLobby(lobbyId);
          lobbyClosed = true;
        } else {
          // Human players remain, broadcast updated lobby state
          broadcastLobbyState(lobbyId);
          // Also broadcast lobby list (player count changed)
          broadcastLobbyList();
        }
      }
      
      // Send lobby list back to the player who left
      const lobbyList = getLobbyList();
      const reconnectToken = currentPeerData?.reconnectToken || '';
      sendToPeer(playerId, {
        type: 'connected',
        payload: {
          playerId,
          reconnectToken,
          lobbies: lobbyList
        },
      });
      
      // If lobby closed, broadcast to all other browsing players
      if (lobbyClosed) {
        broadcastLobbyList();
      }
      
      return;
    }

    // Handle replay actions (don't require lobby)
    if (data.type === 'getUserReplays') {
      try {
        const peerData = (peer as Peer & { data?: PeerData }).data;
        const userId = peerData?.userId || playerId;
        
        console.log(`[WebSocket] getUserReplays - playerId: ${playerId}, peerData.userId: ${peerData?.userId}, using: ${userId}`);
        const replays = await ReplayService.getUserReplays(userId);
        console.log(`[WebSocket] Found ${replays.length} replays for user ${userId}`);
        sendToPeer(playerId, {
          type: 'userReplays',
          payload: { replays },
        });
        console.log(`[WebSocket] Sent userReplays response to ${playerId}`);
      } catch (error) {
        const peerData = (peer as Peer & { data?: PeerData }).data;
        const userId = peerData?.userId || playerId;
        console.error(`[WebSocket] Failed to get replays for user ${userId}:`, error);
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Failed to load replays' },
        });
      }
      return;
    }

    if (data.type === 'loadReplay') {
      const replayId = data.payload.replayId;
      try {
        const replayData = await ReplayService.loadReplay(replayId);
        if (!replayData) {
          sendToPeer(playerId, {
            type: 'error',
            payload: { message: 'Replay not found' },
          });
          return;
        }

        sendToPeer(playerId, {
          type: 'replayData',
          payload: { replay: replayData },
        });
      } catch (error) {
        console.error(`[WebSocket] Failed to load replay ${replayId}:`, error);
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Failed to load replay' },
        });
      }
      return;
    }

    if (data.type === 'deleteReplay') {
      const replayId = data.payload.replayId;
      const peerData = (peer as Peer & { data?: PeerData }).data;
      const userId = peerData?.userId || playerId;
      
      try {
        console.log(`[WebSocket] deleteReplay ${replayId} for userId: ${userId}`);
        await ReplayService.removeReplayFromUser(userId, replayId);
        sendToPeer(playerId, {
          type: 'replayDeleted',
          payload: { replayId, message: 'Replay deleted successfully' },
        });
      } catch (error) {
        console.error(`[WebSocket] Failed to delete replay ${replayId}:`, error);
        sendToPeer(playerId, {
          type: 'error',
          payload: { message: 'Failed to delete replay' },
        });
      }
      return;
    }

    // All other actions require being in a lobby
    if (!lobbyId) {
      sendToPeer(playerId, {
        type: 'error',
        payload: { message: 'Not in a lobby' },
      });
      return;
    }

    const lobby = lobbyService.getLobby(lobbyId);
    if (!lobby) return;

    const lobbyContext = lobbyService.getLobbyContext(lobbyId);
    if (!lobbyContext) return;

    switch (data.type) {
      case 'setName': {
        const player = lobbyContext.players.find(p => p.id === playerId);
        if (!player) break;

        player.name = data.payload.name.slice(0, 20);

        // Check color similarity
        const isTooSimilar = lobbyContext.players.some(p =>
          p.id !== playerId && isColorTooSimilar(p.color, data.payload.color)
        );

        if (isTooSimilar) {
          let newColor: string;
          do {
            const hue = Math.floor(Math.random() * 360);
            newColor = `hsl(${hue}, 90%, 60%)`;
          } while (lobbyContext.players.some(p =>
            p.id !== playerId && isColorTooSimilar(p.color, newColor)
          ));
          player.color = newColor;
        } else {
          player.color = data.payload.color;
        }

        broadcastLobbyState(lobbyId);
        break;
      }

      case 'ready': {
        lobbyService.setPlayerReady(lobbyId, playerId, data.payload.ready);
        
        // Check if transitioned to starting state (XState does this automatically)
        const snapshot = lobby.actor.getSnapshot();
        if (snapshot.value === 'starting') {
          startCountdownInterval(lobbyId);
          // Broadcast lobby list (state changed from waiting to starting)
          broadcastLobbyList();
        } else {
          broadcastLobbyState(lobbyId);
        }
        break;
      }

      case 'move': {
        if (!lobby.gameActor) break;
        
        const gameSnapshot = lobby.gameActor.getSnapshot();
        if (gameSnapshot.matches('playing')) {
          lobby.gameActor.send({
            type: 'PLAYER_MOVE',
            playerId,
            direction: data.payload.direction,
          });
          
          // Record player move action
          const recorder = replayRecorders.get(lobbyId);
          if (recorder) {
            recorder.recordAction({
              playerId,
              action: 'move',
              payload: { direction: data.payload.direction },
            });
          }
        }
        break;
      }

      case 'brake': {
        if (!lobby.gameActor) break;
        
        lobby.gameActor.send({
          type: 'PLAYER_BRAKE',
          playerId,
          braking: data.payload.braking,
        });
        
        // Record brake action
        const recorder = replayRecorders.get(lobbyId);
        if (recorder) {
          recorder.recordAction({
            playerId,
            action: 'brake',
            payload: { braking: data.payload.braking },
          });
        }
        break;
      }

      case 'updateSettings': {
        // Only host can update settings
        if (lobbyContext.hostId === playerId) {
          lobbyService.updateLobbySettings(lobbyId, data.payload.settings);
          broadcastLobbyState(lobbyId);
        }
        break;
      }

      case 'returnToLobby': {
        // Transition from finished state back to waiting
        lobbyService.returnToLobby(lobbyId);
        
        // Clean up the old replay recorder (if not saved, it's lost)
        if (replayRecorders.has(lobbyId)) {
          console.log(`[Replay] Cleaning up recorder for lobby ${lobbyId} (returning to lobby for new game)`);
          replayRecorders.delete(lobbyId);
        }
        
        // Auto-ready AI players
        const updatedContext = lobbyService.getLobbyContext(lobbyId);
        if (updatedContext) {
          updatedContext.players.forEach(p => {
            if (p.id.startsWith('ai-')) {
              lobbyService.setPlayerReady(lobbyId, p.id, true);
            }
          });
        }
        
        // Broadcast updated lobby state
        broadcastLobbyState(lobbyId);
        
        // Broadcast updated lobby list (state changed from finished to waiting)
        broadcastLobbyList();
        break;
      }

      case 'saveReplay': {
        const recorder = replayRecorders.get(lobbyId);
        const peerData = (peer as Peer & { data?: PeerData }).data;
        const userId = peerData?.userId || playerId; // Use persistent userId if available, fallback to playerId
        
        console.log(`[WebSocket] saveReplay request for lobby ${lobbyId}, recorder exists:`, !!recorder);
        console.log(`[WebSocket] Using userId: ${userId} (persistent: ${!!peerData?.userId})`);
        
        if (!recorder) {
          console.log(`[WebSocket] No recorder found for lobby ${lobbyId}`);
          sendToPeer(playerId, {
            type: 'error',
            payload: { message: 'No replay available for this game' },
          });
          break;
        }

        try {
          console.log(`[WebSocket] Recorder status - actions: ${recorder['actions']?.length || 0}, events: ${recorder['events']?.length || 0}`);
          
          // Find winner info from lobby context
          const lobbyCtx = lobbyService.getLobbyContext(lobbyId);
          const activePlayers = lobbyCtx?.players.filter(p => p.direction !== 'crashed') || [];
          const winnerPlayer = activePlayers.length === 1 ? activePlayers[0] : null;
          
          const winner = winnerPlayer ? {
            playerId: winnerPlayer.id,
            name: winnerPlayer.name,
            color: winnerPlayer.color,
          } : null;

          console.log(`[WebSocket] Attempting to save replay for userId ${userId}, winner:`, winner?.name || 'draw');
          const replayId = await recorder.saveReplay(userId, winner);
          console.log(`[WebSocket] Replay saved successfully with ID: ${replayId}`);
          
          sendToPeer(playerId, {
            type: 'replaySaved',
            payload: { replayId, message: 'Replay saved successfully!' },
          });
          
          // Clean up recorder
          replayRecorders.delete(lobbyId);
        } catch (error) {
          console.error(`[WebSocket] Failed to save replay for lobby ${lobbyId}:`, error);
          sendToPeer(playerId, {
            type: 'error',
            payload: { message: 'Failed to save replay' },
          });
        }
        break;
      }

    }
  },

  close: async (peer: Peer) => {
    const peerData = (peer as Peer & { data?: PeerData }).data;
    if (!peerData?.playerId) return;

    const { playerId, lobbyId, isSpectator, reconnectToken } = peerData;
    
    console.log(`[WebSocket] Player ${playerId} disconnected`);
    
    // Save session for reconnection (60 second window)
    if (reconnectToken) {
      reconnectionSessions.set(reconnectToken, {
        playerId,
        lobbyId,
        isSpectator: isSpectator || false,
        lastSeen: Date.now()
      });
      
      // Clean up old sessions (over 2 minutes old)
      for (const [token, session] of reconnectionSessions.entries()) {
        if (Date.now() - session.lastSeen > 120000) {
          reconnectionSessions.delete(token);
        }
      }
    }
    
    connectedPeers.delete(playerId);
    
    // If player was in a lobby, remove them
    if (lobbyId) {
      if (isSpectator) {
        lobbyService.removeSpectatorFromLobby(lobbyId, playerId);
      } else {
        lobbyService.removePlayerFromLobby(lobbyId, playerId);
      }

      const context = lobbyService.getLobbyContext(lobbyId);
      if (context) {
        // Check if only AI players remain
        const humanPlayers = context.players.filter(p => !p.id.startsWith('ai-'));
        
        // If no human players remain (only AI + spectators, or empty), close the lobby
        if (humanPlayers.length === 0) {
          console.log(`[WebSocket] No human players left in lobby ${lobbyId}, closing...`);
          
          // Notify all spectators that lobby is closing
          if (context.spectators.length > 0) {
            for (const spectator of context.spectators) {
              const spectatorPeer = connectedPeers.get(spectator.id);
              if (spectatorPeer) {
                const peerData = (spectatorPeer as Peer & { data?: PeerData }).data;
                if (peerData) {
                  peerData.lobbyId = null;
                  peerData.isSpectator = false;
                }
                
                sendToPeer(spectator.id, {
                  type: 'lobbyClosed',
                  payload: { 
                    message: 'All players have disconnected. Returning to lobby browser...' 
                  },
                });
                
                // Send them back to lobby browser
                sendToPeer(spectator.id, {
                  type: 'connected',
                  payload: {
                    playerId: spectator.id,
                    reconnectToken: peerData?.reconnectToken || '',
                    lobbies: getLobbyList(),
                  },
                });
              }
            }
          }
          
          // Stop game interval if running
          const interval = gameIntervals.get(lobbyId);
          if (interval) {
            clearInterval(interval);
            gameIntervals.delete(lobbyId);
          }
          
          // Clean up replay recorder if exists (lobby closing, replay not saved)
          if (replayRecorders.has(lobbyId)) {
            console.log(`[Replay] Cleaning up unsaved recorder for lobby ${lobbyId} (player disconnect)`);
            replayRecorders.delete(lobbyId);
          }
          
          lobbyService.closeLobby(lobbyId);
          // Broadcast updated lobby list to all browsing players
          broadcastLobbyList();
        } else {
          // Human players remain, broadcast updated lobby state
          broadcastLobbyState(lobbyId);
        }
      }
    }
  },
});

