# Circuit Breaker

**Building a Real-Time Multiplayer Game with XState State Machines and WebSockets**

A real-time multiplayer grid battle game inspired by Tron's light cycles. Players compete to trap opponents with their energy trails in fast-paced matches. Built with Nuxt 4, XState for state management, and WebSockets for real-time communication.

## 🎮 Features

- **Real-Time Multiplayer**: Up to 8 players per lobby with WebSocket-powered instant updates
- **State Machine Architecture**: Lobby and game logic powered by XState v5 for predictable state transitions
- **AI Opponents**: Smart AI bots that use pathfinding and obstacle avoidance
- **Spectator Mode**: Watch ongoing matches without participating
- **Replay System**: Record and playback complete games with full position history
- **Automatic Reconnection**: Seamless session recovery if connection drops (60-second window)
- **Responsive Design**: Works on desktop, tablet, and mobile with virtual D-pad controls
- **Power-ups**: Speed boosts, shields, and trail erasers to gain tactical advantages
- **Audio Effects**: Game over sound effects with "End of Line" theme

## 🏗️ Technical Highlights

### State Management
- **XState v5** for lobby and game state machines
- Separate state machines for lobby flow (waiting → starting → inGame → finished) and game logic (playing)
- Type-safe state transitions and context management

### Real-Time Communication
- Custom WebSocket route (`/server/routes/_ws.ts`) using Nitro's WebSocket support
- Game tick system running at 200ms intervals
- Efficient state synchronization between server and clients
- **Automatic reconnection**: 60-second session recovery with exponential backoff (up to 5 attempts)

### Replay System
- Complete position snapshots recorded every tick for perfect accuracy
- Nuxt Storage API for platform-agnostic persistence
- Playback controls with variable speed (0.5x - 3x)
- Per-user replay management with automatic cleanup

### Architecture
```
├── app/                    # Client-side Vue components
│   ├── components/        # Atomic Design UI (atoms/molecules/organisms)
│   └── composables/       # Player settings & audio management
├── server/
│   ├── machines/          # XState v5 state machine definitions
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
- Arrow Keys - Change direction (up/down/left/right)
- Shift - Brake (slow down for precise movement)

**Mobile:**
- Virtual D-pad on screen
- Tap and hold brake button to slow down

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
- **Tailwind CSS** - Utility-first styling with custom Tron theme
- **Canvas API** - High-performance game rendering

## 🎨 Game Mechanics

- Grid-based movement with collision detection
- Trail system that creates permanent walls
- Three power-up types:
  - **Speed Boost**: Temporary speed increase
  - **Shield**: One-time invincibility to pass through obstacles
  - **Trail Eraser**: Clear portions of your trail to create escape routes
- Brake mechanic for precise control in tight spaces
- AI opponents with strategic pathfinding and power-up collection
- Multi-round support with win tracking
- Four grid sizes: 30x30, 40x40, 50x50, 60x60

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

Key areas for enhancement:
- Additional power-ups and game modes
- More sound effects and background music
- Performance optimizations for larger grids
- Enhanced mobile controls
- Social features (friends, chat, tournaments)

## 📄 License

MIT

---

**Circuit Breaker** - Breaking through the complexity of real-time multiplayer game development, one state transition at a time.
