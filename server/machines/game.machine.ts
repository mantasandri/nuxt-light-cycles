// server/machines/game.machine.ts
import { setup, assign } from 'xstate';
import type { GamePlayer, PowerUp, GameSettings } from '../types/game.types';

// Context: Game state data
export interface GameContext {
  gameId: string;
  players: GamePlayer[];
  powerUps: PowerUp[];
  obstacles: string[];
  settings: GameSettings;
  ticks: number;
  startTime: number | null;
  winner: string | null;
}

// Events: What can happen during a game?
export type GameEvent =
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'PLAYER_MOVE'; playerId: string; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'PLAYER_BRAKE'; playerId: string; braking: boolean }
  | { type: 'PLAYER_CRASHED'; playerId: string }
  | { type: 'SPAWN_POWERUP'; powerUp: PowerUp }
  | { type: 'COLLECT_POWERUP'; playerId: string; powerUpIndex: number }
  | { type: 'GAME_OVER'; winner: string | null }
  | { type: 'RESET' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

export interface GameInput {
  gameId: string;
  players: GamePlayer[];
  settings: GameSettings;
  obstacles: string[];
}

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as GameInput,
  },
  guards: {
    hasWinner: ({ context }) => {
      const activePlayers = context.players.filter(p => p.direction !== 'crashed');
      return activePlayers.length === 1 && context.players.length > 1;
    },
    allCrashed: ({ context }) => {
      return context.players.every(p => p.direction === 'crashed');
    },
    shouldEnd: ({ context }) => {
      const activePlayers = context.players.filter(p => p.direction !== 'crashed');
      return (
        activePlayers.length === 0 ||
        (activePlayers.length === 1 && context.players.length > 1)
      );
    },
  },
  actions: {
    initializeGame: assign({
      startTime: () => Date.now(),
      ticks: () => 0,
      winner: () => null,
    }),
    incrementTick: assign({
      ticks: ({ context }) => (context.ticks + 1) % 4,
    }),
    updatePlayerDirection: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_MOVE') return context.players;
        
        return context.players.map(p => {
          if (p.id === event.playerId && p.direction !== 'crashed') {
            // Check if trying to go opposite direction
            const isOpposite = (
              (p.direction === 'up' && event.direction === 'down') ||
              (p.direction === 'down' && event.direction === 'up') ||
              (p.direction === 'left' && event.direction === 'right') ||
              (p.direction === 'right' && event.direction === 'left')
            );
            
            // Don't allow opposite direction unless no trail
            if (isOpposite && p.trail.length > 0) {
              return p;
            }
            
            return { ...p, direction: event.direction, lastDirection: event.direction };
          }
          return p;
        });
      },
    }),
    updatePlayerBrake: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_BRAKE') return context.players;
        
        return context.players.map(p =>
          p.id === event.playerId
            ? {
                ...p,
                isBraking: event.braking,
                brakeStartTime: event.braking ? Date.now() : null,
              }
            : p
        );
      },
    }),
    markPlayerCrashed: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_CRASHED') return context.players;
        
        return context.players.map(p =>
          p.id === event.playerId ? { ...p, direction: 'crashed' as const } : p
        );
      },
    }),
    addPowerUp: assign({
      powerUps: ({ context, event }) => {
        if (event.type !== 'SPAWN_POWERUP') return context.powerUps;
        if (context.powerUps.length >= context.settings.maxPowerUps) {
          return context.powerUps;
        }
        return [...context.powerUps, event.powerUp];
      },
    }),
    removePowerUp: assign({
      powerUps: ({ context, event }) => {
        if (event.type !== 'COLLECT_POWERUP') return context.powerUps;
        return context.powerUps.filter((_, idx) => idx !== event.powerUpIndex);
      },
    }),
    applyPowerUpToPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'COLLECT_POWERUP') return context.players;
        
        return context.players.map(p => {
          if (p.id === event.playerId) {
            const now = Date.now();
            if (p.speedBoostUntil && now < p.speedBoostUntil) {
              // Extend existing boost
              return {
                ...p,
                speedBoostUntil: p.speedBoostUntil + context.settings.speedBoostDuration,
              };
            } else {
              // New boost
              return {
                ...p,
                speed: 2,
                speedBoostUntil: now + context.settings.speedBoostDuration,
              };
            }
          }
          return p;
        });
      },
    }),
    setWinner: assign({
      winner: ({ context }) => {
        const activePlayers = context.players.filter(p => p.direction !== 'crashed');
        return activePlayers.length === 1 ? activePlayers[0].id : null;
      },
    }),
    resetGame: assign({
      ticks: () => 0,
      startTime: () => null,
      winner: () => null,
      powerUps: () => [],
      players: ({ context }) =>
        context.players.map(p => ({
          ...p,
          trail: [],
          speed: 1,
          speedBoostUntil: null,
          isBraking: false,
          brakeStartTime: null,
          isReady: false,
        })),
    }),
  },
}).createMachine({
  id: 'game',
  initial: 'idle',
  context: ({ input }) => ({
    gameId: input.gameId,
    players: input.players,
    powerUps: [],
    obstacles: input.obstacles,
    settings: input.settings,
    ticks: 0,
    startTime: null,
    winner: null,
  }),
  states: {
    idle: {
      description: 'Game is not active',
      on: {
        START: {
          target: 'playing',
          actions: 'initializeGame',
        },
      },
    },
    playing: {
      description: 'Game is active and running',
      on: {
        TICK: {
          actions: 'incrementTick',
        },
        PLAYER_MOVE: {
          actions: 'updatePlayerDirection',
        },
        PLAYER_BRAKE: {
          actions: 'updatePlayerBrake',
        },
        PLAYER_CRASHED: {
          actions: 'markPlayerCrashed',
          // Check if game should end after crash
        },
        SPAWN_POWERUP: {
          actions: 'addPowerUp',
        },
        COLLECT_POWERUP: {
          actions: ['removePowerUp', 'applyPowerUpToPlayer'],
        },
        GAME_OVER: {
          target: 'gameOver',
          actions: 'setWinner',
        },
        PAUSE: {
          target: 'paused',
        },
      },
      // Check for game over conditions after each event
      always: [
        {
          guard: 'shouldEnd',
          target: 'gameOver',
          actions: 'setWinner',
        },
      ],
    },
    paused: {
      description: 'Game is paused',
      on: {
        RESUME: {
          target: 'playing',
        },
        RESET: {
          target: 'idle',
          actions: 'resetGame',
        },
      },
    },
    gameOver: {
      description: 'Game has ended',
      entry: 'setWinner',
      on: {
        RESET: {
          target: 'idle',
          actions: 'resetGame',
        },
      },
    },
  },
});

