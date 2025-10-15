# Nuxt Light Cycles - Complete Project Overview

A real-time multiplayer Tron-inspired light cycles game built with Nuxt 3, WebSockets, and XState state machines.

## 🎮 Game Overview

Light Cycles is a competitive grid-based game where players control light cycles that leave trails behind them. Players must avoid hitting walls, obstacles, and trails (including their own) while trying to outmaneuver opponents. The last player standing wins!

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Nuxt 3 (Vue 3 + TypeScript)
- **Backend**: Nuxt Server Routes with WebSocket support
- **State Management**: XState state machines for game and lobby logic
- **Real-time Communication**: WebSocket API
- **Rendering**: HTML5 Canvas API
- **Storage**: Browser localStorage for player settings

### Core Components

#### State Machines (XState)

**1. Lobby Machine** (`server/machines/lobby.machine.ts`)
- Manages lobby lifecycle: waiting → starting → inGame → finished
- Handles player ready states
- Coordinates countdown timer before game start
- Tracks round numbers
- Events: PLAYER_JOIN, PLAYER_LEAVE, PLAYER_READY, START_COUNTDOWN, GAME_STARTED, GAME_ENDED, RETURN_TO_LOBBY

**2. Game Machine** (`server/machines/game.machine.ts`)
- Manages active gameplay: idle → playing → paused → gameOver
- Handles game state transitions
- Events: START, PAUSE, RESUME, GAME_OVER

#### Server-Side Services

**Lobby Service** (`server/services/lobby.service.ts`)
- Creates and manages multiple lobby instances
- Each lobby has its own state machine actor
- Handles player management (join, leave, ready)
- Coordinates with game service for active games
- Auto-readies AI players after game completion
- Destroys lobbies when no human players remain

**WebSocket Handler** (`server/routes/_ws.ts`)
- Real-time bidirectional communication
- Message types:
  - `createLobby`: Create new game lobby
  - `joinLobby`: Join existing lobby
  - `leaveLobby`: Leave current lobby
  - `ready`: Mark player as ready
  - `getLobbyState`: Request current lobby state
  - `getLobbyList`: Request list of all lobbies
  - `move`: Send player movement input
  - `brake`: Activate speed brake
  - `returnToLobby`: Return to lobby after game ends
- Broadcasts:
  - `lobbyState`: Current lobby information
  - `lobbyList`: Available lobbies
  - `gameState`: Real-time game updates
  - `gameOver`: Game completion with winner
  - `playerCrashed`: Player elimination notification

#### Game Loop

**Server-Side Game Loop** (`server/routes/_ws.ts` - `startGameLoop`)
- Runs at 10 ticks per second (100ms intervals)
- Player movement and physics
- Collision detection (walls, obstacles, trails)
- Power-up spawning and collection
- Trail management
- Win/loss condition checking
- State broadcasting to all connected clients

**Client-Side Rendering Loop** (`app/pages/index.vue` - `drawGame`)
- Uses `requestAnimationFrame` for smooth 60fps rendering
- Draws grid background
- Renders obstacles
- Renders power-ups with glow effects
- Draws player trails with gradients
- Renders players as colored circles
- Displays player names

#### Frontend Components

**1. LobbyPanel** (`app/components/LobbyPanel.vue`)
- Displays lobby information
- Shows player list with ready status
- Game settings display
- Ready/Leave buttons
- Avatar and color visualization

**2. LobbyBrowser** (`app/components/LobbyBrowser.vue`)
- Lists all available lobbies
- Shows lobby status (waiting/starting/in progress)
- Player count per lobby
- Join and create lobby actions
- Real-time lobby list updates
- Refresh functionality

**3. CreateLobbyDialog** (`app/components/CreateLobbyDialog.vue`)
- Lobby name input
- Grid size selection (Small 30x30, Medium 40x40, Large 50x50)
- Max players (2-4)
- AI player toggles
- Game settings configuration

**4. Main Game Page** (`app/pages/index.vue`)
- Player settings dialog
- Lobby browser
- Lobby panel
- Game canvas
- Game over screen
- WebSocket connection management
- Keyboard input handling
- Game state coordination

#### Composables

**usePlayerSettings** (`app/composables/usePlayerSettings.ts`)
- Manages player profile (name, color, avatar)
- localStorage persistence
- 12 Tron-themed avatar options
- Color picker with hex/HSL support

## 🎨 Player Customization

### Avatars (Tron-Themed SVG Icons)
1. **Recognizer** - Flying surveillance ship
2. **Program User** - Digital program entity
3. **Identity Disc** - Classic Tron weapon
4. **Light Cycle** - Legendary vehicle
5. **Light Tank** - Combat vehicle
6. **Bit** - Diamond-shaped data entity
7. **Siren** - Geometric AI entity
8. **MCP Core** - Master Control Program hub
9. **Portal** - Grid data streams
10. **Grid Warrior** - Classic grid design
11. **Circuit** - Node connection system
12. **Data Stream** - Flowing data visualization

### Color Selection
- Full HSL color picker
- Player trail and cycle rendered in chosen color
- Visible in lobby and game

## 🎯 Game Features

### Core Gameplay
- **Grid-based movement**: Arrow keys control direction
- **Trail system**: Each player leaves a permanent trail
- **Collision detection**: Hit anything = elimination
- **Speed brake**: Hold Shift to slow down for precise movement
- **Last player standing wins**

### AI Players
- Smart pathfinding algorithm
- Avoids walls, obstacles, and trails
- Seeks power-ups when safe
- Prefers center of map for strategic positioning
- Can be added to lobbies for practice

### Obstacles
- Randomly generated at game start
- Distributed across 4 quadrants for balance
- Density: ~8% of grid spaces
- Shown as red squares

### Power-ups
- **Speed Boost**: Temporary speed increase
- Spawn randomly during gameplay (10% chance per tick)
- Max 5 active power-ups at once
- Shown as glowing yellow circles
- Collected on contact

### Game Settings
- **Grid Size**: 30x30 (Small), 40x40 (Medium), 50x50 (Large)
- **Max Players**: 2-4 players per lobby
- **AI Players**: Toggle AI opponents individually

## 🔄 Game Flow

### 1. Initial Setup
- Player enters name, selects avatar and color
- Settings saved to localStorage

### 2. Lobby Browser
- View all available lobbies
- See lobby status and player counts
- Create new lobby or join existing one

### 3. Lobby Waiting Room
- Players join and ready up
- Host can add AI players
- All players must ready up to start
- Leave button available before game starts

### 4. Countdown
- 5-second countdown after all players ready
- Visual countdown display
- Game starts automatically

### 5. Active Game
- Real-time gameplay
- 10 updates per second from server
- 60fps rendering on client
- Collision detection and elimination
- Power-up spawning

### 6. Game Over
- Winner announcement screen
- Player color and name displayed
- Options: Play Again or Return to Lobby

### 7. Post-Game
- Return to lobby with same settings
- AI players auto-ready
- Human players can ready for next round
- Round counter increments

## 🔌 WebSocket Protocol

### Client → Server Messages
```typescript
{ type: 'createLobby', payload: { name, settings } }
{ type: 'joinLobby', payload: { lobbyId, playerName, playerColor, avatar } }
{ type: 'joinLobbyAsSpectator', payload: { lobbyId, playerName, playerColor } } // NEW
{ type: 'leaveLobby' }
{ type: 'ready' }
{ type: 'getLobbyState' }
{ type: 'getLobbyList' }
{ type: 'move', payload: { direction: 'up'|'down'|'left'|'right' } }
{ type: 'brake', payload: { braking: boolean } }
{ type: 'returnToLobby' }
{ type: 'reconnect', payload: { reconnectToken: string } } // NEW
```

### Server → Client Messages
```typescript
{ type: 'connected', payload: { playerId, reconnectToken, lobbies } } // UPDATED: added reconnectToken
{ type: 'reconnected', payload: { playerId, lobbyId, isSpectator } } // NEW
{ type: 'lobbyCreated', payload: { lobbyId } }
{ type: 'lobbyJoined', payload: { lobbyId, isSpectator, gridSize } } // UPDATED: added isSpectator
{ type: 'lobbyState', payload: { lobbyId, state, players, spectators, settings, countdownRemaining, roundNumber } } // UPDATED: added spectators
{ type: 'lobbyList', payload: { lobbies: [...] } }
{ type: 'lobbyClosed', payload: { message } } // NEW
{ type: 'gameState', payload: { players, obstacles, powerUps, gridSize, gameState } }
{ type: 'playerCrashed', payload: { playerId } }
{ type: 'gameOver', payload: { winner, winnerColor, draw } }
{ type: 'error', payload: { message } }
```

## 🎨 Visual Design

### Color Scheme (Tron-Inspired)
- Background: Dark (#000, #111)
- Primary Accent: Cyan (#0ff)
- Grid Lines: Dark cyan (rgba(0, 255, 255, 0.1))
- Obstacles: Red (#f44)
- Power-ups: Yellow (#ff0) with glow
- Player Trails: Custom colors with gradient fade

### UI Elements
- Glassmorphism panels
- Neon glow effects
- Smooth animations and transitions
- Retro-futuristic typography
- Grid-based game rendering

## 📁 Project Structure

```
nuxt-light-cycles/
├── app/
│   ├── pages/
│   │   └── index.vue              # Main game page
│   ├── components/
│   │   ├── LobbyPanel.vue         # Lobby UI
│   │   ├── LobbyBrowser.vue       # Lobby list
│   │   └── CreateLobbyDialog.vue  # Lobby creation
│   ├── composables/
│   │   └── usePlayerSettings.ts   # Player profile management
│   └── app.vue                     # Root component
├── server/
│   ├── routes/
│   │   └── _ws.ts                 # WebSocket handler & game loop
│   ├── services/
│   │   └── lobby.service.ts       # Lobby management
│   ├── machines/
│   │   ├── lobby.machine.ts       # Lobby state machine
│   │   └── game.machine.ts        # Game state machine
│   └── types/
│       └── game.types.ts          # Shared type definitions
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── nuxt.config.ts                 # Nuxt configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── PROJECT_OVERVIEW.md            # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Development
- Server runs on `http://localhost:3000`
- WebSocket connects to same host automatically
- Hot module replacement enabled

## 🎮 How to Play

### Controls
- **Arrow Keys**: Change direction (Up, Down, Left, Right)
- **Shift**: Hold to activate speed brake (slower movement)

### Strategy Tips
1. **Plan ahead**: You can't reverse direction, only turn 90 degrees
2. **Use the brake**: Slow down in tight spaces
3. **Grab power-ups**: Speed boosts can help you escape tight situations
4. **Control the center**: More room to maneuver
5. **Cut off opponents**: Force them into walls or trails
6. **Watch for patterns**: AI has predictable behavior

## 🔧 Configuration

### Game Settings (Customizable per lobby)
```typescript
interface GameSettings {
  gridSize: number;        // 30, 40, or 50
  maxPlayers: number;      // 2-4
  tickRate: number;        // 100ms (10 tps)
  maxPowerUps: number;     // 5
}
```

### Player Spawn Positions
- 2 players: Opposite corners (top-left, bottom-right)
- 3 players: Three corners (top-left, top-right, bottom-left)
- 4 players: All four corners

### AI Configuration
- Decision interval: Every game tick
- Lookahead: 3 cells
- Avoidance priority: Walls > Trails > Obstacles
- Power-up attraction radius: 5 cells

## 🐛 Known Limitations

1. ~~**WebSocket reconnection**: Players must refresh if connection drops~~ ✅ **FIXED** - Automatic reconnection implemented
2. ~~**Spectator mode**: Not currently implemented~~ ✅ **FIXED** - Full spectator mode available
3. **Game replay**: No replay or recording functionality
4. **Mobile support**: Desktop only (requires keyboard)
5. **Audio**: No sound effects or music (yet!)

## ✅ Recently Implemented

### Spectator Mode (October 2025)
- **Watch games without taking player slots**
- "👁️ Watch" button on all lobbies in browser
- Spectators see all game updates in real-time
- Separate spectator list in lobby panel
- Can spectate during waiting, countdown, or active games
- Spectators automatically kicked when all players leave

### WebSocket Reconnection (October 2025)
- **Automatic reconnection** with exponential backoff
- Session persistence for 60 seconds using tokens
- Restores player/spectator status and lobby membership
- Visual feedback with reconnection overlay
- Up to 5 reconnection attempts before fresh start
- Works seamlessly for both players and spectators

### Host Transfer & Lobby Management (October 2025)
- **AI players can never become host** (prevents ghost games)
- Host automatically transfers to next human player
- Lobbies close when no human players remain
- Games require at least one human player to start
- Clean notification system for lobby closure events

## 🎯 Future Enhancements

### Potential Features
- [ ] Tournament bracket system
- [ ] Leaderboard and statistics
- [ ] More power-up types (shield, teleport, trail eraser)
- [ ] Custom game modes (time limit, elimination rounds)
- [ ] Mobile/touch controls
- [ ] Sound effects and background music
- [ ] Game replays
- [ ] Chat system
- [ ] Friend system and private lobbies
- [ ] Customizable grid obstacles
- [ ] Team-based gameplay

### Technical Improvements
- [x] ✅ WebSocket reconnection handling (October 2025)
- [ ] Server-side player input validation
- [ ] Anti-cheat measures
- [ ] Performance optimizations for large grids
- [ ] Database integration for persistent data
- [ ] Authentication system
- [ ] Rate limiting and abuse prevention

## 📊 Performance

### Server
- Handles multiple concurrent games
- Each game loop: ~10ms execution time
- Memory efficient state machines
- Automatic lobby cleanup

### Client
- 60fps rendering via requestAnimationFrame
- Canvas-based for optimal performance
- Efficient trail rendering with arrays
- Minimal DOM manipulation

## 🤝 Contributing

This is a personal project, but feel free to fork and enhance it! Key areas for improvement:
- Mobile controls
- Additional power-ups
- More AI strategies
- Performance optimizations
- Bug fixes

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Credits

Inspired by the classic Tron light cycles game and built with modern web technologies.

**Built with:**
- Nuxt 3
- XState
- TypeScript
- Canvas API
- WebSocket API

---

**Version**: 1.0.0  
**Last Updated**: October 2025
