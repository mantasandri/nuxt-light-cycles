// Game-related types shared between client and server

export interface PowerUp {
  x: number
  y: number
  type: 'speed' | 'shield' | 'trailEraser'
}

export interface Player {
  id: string
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right' | 'crashed'
  color: string
  trail: string[]
  isReady: boolean
  name: string
  speed: number
  speedBoostUntil: number | null
  isBraking: boolean
  brakeStartTime: number | null
  gameId: string
  hasShield: boolean
  hasTrailEraser: boolean
}

export type GameStateValue = 'waiting' | 'starting' | 'playing' | 'finished'

