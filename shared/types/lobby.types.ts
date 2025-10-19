// Lobby-related types shared between client and server

export interface LobbySettings {
  isPrivate: boolean
  gridSize: number
  maxPlayers: number
  allowSpectators: boolean
  enableAI?: boolean
  aiPlayerCount?: number
}

export interface LobbyPlayer {
  id: string
  name: string
  color: string
  isReady: boolean
}

export interface LobbySpectator {
  id: string
  name: string
  color: string
}

export interface LobbyState {
  lobbyId: string
  state: string
  players: LobbyPlayer[]
  spectators?: LobbySpectator[]
  settings: LobbySettings
  hostId: string | null
  countdownRemaining: number | null
  roundNumber: number
}

