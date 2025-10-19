// Common UI-related types shared across components

export interface Option {
  value: string | number;
  label: string;
}

export interface LobbyInfo {
  lobbyId: string;
  playerCount: number;
  maxPlayers: number;
  gridSize: number;
  isPrivate: boolean;
  hostName: string;
  state: string;
}

