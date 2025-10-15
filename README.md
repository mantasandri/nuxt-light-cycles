# Circuit Breaker

**Building a Real-Time Multiplayer Game with XState State Machines and WebSockets**

A real-time multiplayer grid battle game inspired by Tron's light cycles. Players compete to trap opponents with their energy trails in fast-paced matches. Built with Nuxt 4, XState for state management, and WebSockets for real-time communication.

## 🎮 Features

- **Real-Time Multiplayer**: Up to 4 players per lobby with WebSocket-powered instant updates
- **State Machine Architecture**: Lobby and game logic powered by XState for predictable state transitions
- **AI Opponents**: Smart AI bots that use pathfinding and obstacle avoidance
- **Spectator Mode**: Watch ongoing matches without participating
- **Replay System**: Record and playback complete games with full position history
- **Responsive Design**: Works on desktop, tablet, and mobile with virtual D-pad controls
- **Power-ups**: Speed boosts and other collectibles to gain an edge

## 🏗️ Technical Highlights

### State Management
- **XState v5** for lobby and game state machines
- Separate state machines for lobby flow (waiting → starting → inGame → finished) and game logic (playing)
- Type-safe state transitions and context management

### Real-Time Communication
- Custom WebSocket route (`/server/routes/_ws.ts`) using Nitro's WebSocket support
- Game tick system running at 200ms intervals
- Efficient state synchronization between server and clients
- Reconnection handling with session recovery

### Replay System
- Complete position snapshots recorded every tick for perfect accuracy
- Nuxt Storage API for platform-agnostic persistence
- Playback controls with variable speed (0.5x - 3x)
- Per-user replay management with automatic cleanup

### Architecture
```
├── app/                    # Client-side Vue components
│   ├── components/        # UI components (Lobby, Game, Replays)
│   └── composables/       # Player settings management
├── server/
│   ├── machines/          # XState state machine definitions
│   ├── services/          # Game logic and replay recording
│   ├── routes/            # WebSocket handler
│   └── types/             # TypeScript type definitions
```

## 🚀 Setup

Install dependencies:

```bash
pnpm install
```

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

## 🎯 Game Controls

**Desktop:**
- Arrow Keys / WASD - Change direction
- Space - Brake (slow down)

**Mobile:**
- Virtual D-pad on screen
- Tap brake button to slow down

## 🔧 Deployment

The app is designed to run on platforms that support long-lived WebSocket connections:
- ✅ Render.com
- ✅ Railway.app
- ✅ Fly.io
- ✅ DigitalOcean App Platform
- ❌ Vercel (serverless functions don't support persistent WebSockets)
- ❌ Netlify (same limitation)

Replays use Nuxt Storage API which works with filesystem storage by default. For production, replays persist automatically.

## 📝 Tech Stack

- **Nuxt 4** - Full-stack Vue framework
- **XState 5** - State machine management
- **Nitro** - Server engine with WebSocket support
- **TypeScript** - Type safety throughout
- **Nuxt UI** - Component library
- **Canvas API** - Game rendering

## 🎨 Game Mechanics

- Grid-based movement with collision detection
- Trail system that creates walls
- Speed boost power-ups (2x speed)
- Brake mechanic for tight turns
- AI opponents with strategic pathfinding
- Multi-round support with win tracking

## 📊 State Machine Flow

**Lobby Machine:**
```
waiting → starting (countdown) → inGame → finished → waiting
```

**Game Machine:**
```
idle → playing → (gameOver)
```

## 🤝 Contributing

This is a demonstration project showcasing state machine architecture in real-time multiplayer games. Feel free to fork and experiment!

## 📄 License

MIT

---

**Circuit Breaker** - Breaking through the complexity of real-time multiplayer game development, one state transition at a time.
