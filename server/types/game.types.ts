// server/types/game.types.ts

export interface Position {
  x: number;
  y: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'crashed';
  color: string;
  trail: string[];
  isReady: boolean;
  speed: number;
  speedBoostUntil: number | null;
  isBraking: boolean;
  brakeStartTime: number | null;
  lastDirection?: string;
  gameId: string;
  avatar?: string;
  hasShield: boolean;
  hasTrailEraser: boolean;
}

export interface Spectator {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export interface PowerUp {
  x: number;
  y: number;
  type: 'speed' | 'shield' | 'trailEraser';
}

export interface GameSettings {
  gridSize: number;
  maxPlayers: number;
  countdownSeconds: number;
  tickRate: number; // ms per tick
  speedBoostDuration: number; // ms
  maxPowerUps: number;
}

export interface LobbySettings {
  isPrivate: boolean;
  gridSize: number;
  maxPlayers: number;
  allowSpectators: boolean;
  lobbyName?: string;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  gridSize: 40,
  maxPlayers: 8,
  countdownSeconds: 3,
  tickRate: 200,
  speedBoostDuration: 2000,
  maxPowerUps: 5, // Increased from 3 to 5 for more power-ups
};

export const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
  isPrivate: false,
  gridSize: 40,
  maxPlayers: 8,
  allowSpectators: true,
};

