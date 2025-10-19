// Replay-related types shared between client and server

export interface ReplayMetadata {
  replayId: string
  lobbyName: string
  createdAt: number
  duration: number
  totalTicks: number
  winner: {
    playerId: string
    name: string
    color: string
  } | null
  playerCount: number
  gridSize: number
}

export interface ReplayPlayer {
  id: string
  name: string
  color: string
  avatar: string
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right' | 'crashed'
  isAI: boolean
}

export interface ReplayInitialState {
  gridSize: number
  players: ReplayPlayer[]
  obstacles: Array<{ x: number; y: number }>
  settings: {
    maxPlayers: number
    tickRate: number
    maxPowerUps: number
  }
}

export interface ReplayAction {
  tick: number
  playerId: string
  action: 'move' | 'brake'
  payload: unknown
  timestamp: number
}

export interface ReplayEvent {
  tick: number
  type: string
  payload: unknown
  timestamp: number
}

export interface ReplayData {
  metadata: ReplayMetadata
  initialState: ReplayInitialState
  actions: ReplayAction[]
  events: ReplayEvent[]
}

