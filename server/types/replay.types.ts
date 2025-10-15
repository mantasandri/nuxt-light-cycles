/**
 * Replay System Type Definitions
 * Tracks player actions and game events for replay functionality
 */

export interface PlayerAction {
  tick: number;
  playerId: string;
  action: 'move' | 'brake';
  payload: {
    direction?: 'up' | 'down' | 'left' | 'right';
    braking?: boolean;
  };
  timestamp: number;
}

export interface GameEvent {
  tick: number;
  type: 'playerCrashed' | 'powerUpSpawned' | 'powerUpCollected' | 'gameStarted' | 'gameOver';
  payload: any;
  timestamp: number;
}

export interface ReplayInitialState {
  gridSize: number;
  players: Array<{
    id: string;
    name: string;
    color: string;
    avatar: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
    isAI: boolean;
  }>;
  obstacles: Array<{ x: number; y: number }>;
  settings: {
    maxPlayers: number;
    tickRate: number;
    maxPowerUps: number;
  };
}

export interface ReplayMetadata {
  replayId: string;
  userId: string; // The player who saved the replay
  lobbyName: string;
  createdAt: number;
  duration: number; // Total game duration in seconds
  totalTicks: number;
  winner: {
    playerId: string;
    name: string;
    color: string;
  } | null;
  playerCount: number;
  gridSize: number;
}

export interface ReplayData {
  metadata: ReplayMetadata;
  initialState: ReplayInitialState;
  actions: PlayerAction[];
  events: GameEvent[];
}

export interface UserReplayList {
  userId: string;
  replays: Array<{
    replayId: string;
    metadata: Omit<ReplayMetadata, 'userId'>;
  }>;
}

