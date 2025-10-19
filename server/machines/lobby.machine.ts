// server/machines/lobby.machine.ts
import { setup, assign, fromPromise } from 'xstate';
import type { GamePlayer, LobbySettings, Spectator } from '../types/game.types';

// Context: What data does the lobby hold?
export interface LobbyContext {
  lobbyId: string;
  hostId: string | null;
  players: GamePlayer[];
  spectators: Spectator[];
  bannedPlayerIds: string[]; // Track banned players
  settings: LobbySettings;
  createdAt: number;
  countdownStartedAt: number | null;
  roundNumber: number;
}

// Events: What can happen to the lobby?
export type LobbyEvent =
  | { type: 'PLAYER_JOIN'; player: GamePlayer }
  | { type: 'PLAYER_LEAVE'; playerId: string }
  | { type: 'SPECTATOR_JOIN'; spectator: Spectator }
  | { type: 'SPECTATOR_LEAVE'; spectatorId: string }
  | { type: 'PLAYER_READY'; playerId: string; isReady: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<LobbySettings> }
  | { type: 'START_GAME' }
  | { type: 'GAME_ENDED'; winner: string | null }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'CLOSE_LOBBY' }
  | { type: 'KICK_PLAYER'; playerId: string }
  | { type: 'BAN_PLAYER'; playerId: string }
  | { type: 'ADD_AI_BOT'; bot: GamePlayer }
  | { type: 'REMOVE_AI_BOT'; botId: string };

// Input for creating a new lobby machine
export interface LobbyInput {
  lobbyId: string;
  hostId?: string;
  settings?: Partial<LobbySettings>;
}

export const lobbyMachine = setup({
  types: {
    context: {} as LobbyContext,
    events: {} as LobbyEvent,
    input: {} as LobbyInput,
  },
  actors: {
    // Actor for persisting lobby state (if needed)
    persistLobby: fromPromise(async ({ input }: { input: LobbyContext }) => {
      // Could save to storage/DB here
      return input;
    }),
  },
  guards: {
    hasMinimumPlayers: ({ context }) => {
      // Must have at least one human player (not just AI)
      const humanPlayers = context.players.filter(p => !p.id.startsWith('ai-'));
      return humanPlayers.length > 0;
    },
    allPlayersReady: ({ context }) => {
      // Must have at least one human player, and all players must be ready
      const humanPlayers = context.players.filter(p => !p.id.startsWith('ai-'));
      return humanPlayers.length > 0 && context.players.every(p => p.isReady);
    },
    isFull: ({ context }) => {
      return context.players.length >= context.settings.maxPlayers;
    },
    isNotFull: ({ context }) => {
      return context.players.length < context.settings.maxPlayers;
    },
    isNotBanned: ({ context, event }) => {
      if (event.type === 'PLAYER_JOIN') {
        return !context.bannedPlayerIds.includes(event.player.id);
      }
      return true;
    },
    isHost: ({ event }) => {
      if (event.type === 'START_GAME' || event.type === 'UPDATE_SETTINGS') {
        // In a real implementation, you'd check the playerId from the event
        // For now, we'll allow anyone to start
        return true;
      }
      return false;
    },
    hasPlayers: ({ context }) => {
      return context.players.length > 0;
    },
  },
  actions: {
    addPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_JOIN') return context.players;
        
        // Don't add duplicate players
        if (context.players.some(p => p.id === event.player.id)) {
          return context.players;
        }
        
        return [...context.players, event.player];
      },
      hostId: ({ context, event }) => {
        // First player becomes host (even if spectators are present)
        // This handles the case where host leaves and only spectators remain
        if (context.players.length === 0 && event.type === 'PLAYER_JOIN') {
          return event.player.id;
        }
        return context.hostId;
      },
    }),
    removePlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_LEAVE') return context.players;
        return context.players.filter(p => p.id !== event.playerId);
      },
      hostId: ({ context, event }) => {
        if (event.type !== 'PLAYER_LEAVE') return context.hostId;
        
        // If host leaves, assign new host (only human players, not AI)
        if (context.hostId === event.playerId) {
          const remainingPlayers = context.players.filter(p => p.id !== event.playerId);
          const humanPlayers = remainingPlayers.filter(p => !p.id.startsWith('ai-'));
          // Only assign host to human players, not AI
          return humanPlayers.length > 0 ? humanPlayers[0].id : null;
        }
        return context.hostId;
      },
    }),
    addSpectator: assign({
      spectators: ({ context, event }) => {
        if (event.type !== 'SPECTATOR_JOIN') return context.spectators;
        
        // Don't add duplicate spectators
        if (context.spectators.some(s => s.id === event.spectator.id)) {
          return context.spectators;
        }
        
        return [...context.spectators, event.spectator];
      },
    }),
    removeSpectator: assign({
      spectators: ({ context, event }) => {
        if (event.type !== 'SPECTATOR_LEAVE') return context.spectators;
        return context.spectators.filter(s => s.id !== event.spectatorId);
      },
    }),
    updatePlayerReady: assign({
      players: ({ context, event }) => {
        if (event.type !== 'PLAYER_READY') return context.players;
        
        return context.players.map(p =>
          p.id === event.playerId ? { ...p, isReady: event.isReady } : p
        );
      },
    }),
    updateSettings: assign({
      settings: ({ context, event }) => {
        if (event.type !== 'UPDATE_SETTINGS') return context.settings;
        return { ...context.settings, ...event.settings };
      },
    }),
    resetPlayerReadyStates: assign({
      players: ({ context }) => {
        return context.players.map(p => ({ ...p, isReady: false }));
      },
    }),
    startCountdown: assign({
      countdownStartedAt: () => Date.now(),
    }),
    clearCountdown: assign({
      countdownStartedAt: () => null,
    }),
    incrementRound: assign({
      roundNumber: ({ context }) => context.roundNumber + 1,
    }),
    resetRound: assign({
      roundNumber: () => 1,
    }),
    kickPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'KICK_PLAYER') return context.players;
        return context.players.filter(p => p.id !== event.playerId);
      },
    }),
    banPlayer: assign({
      players: ({ context, event }) => {
        if (event.type !== 'BAN_PLAYER') return context.players;
        return context.players.filter(p => p.id !== event.playerId);
      },
      bannedPlayerIds: ({ context, event }) => {
        if (event.type !== 'BAN_PLAYER') return context.bannedPlayerIds;
        // Add to banned list if not already there
        if (!context.bannedPlayerIds.includes(event.playerId)) {
          return [...context.bannedPlayerIds, event.playerId];
        }
        return context.bannedPlayerIds;
      },
    }),
    addAIBot: assign({
      players: ({ context, event }) => {
        if (event.type !== 'ADD_AI_BOT') return context.players;
        
        // Don't add if lobby is full
        if (context.players.length >= context.settings.maxPlayers) {
          return context.players;
        }
        
        return [...context.players, event.bot];
      },
    }),
    removeAIBot: assign({
      players: ({ context, event }) => {
        if (event.type !== 'REMOVE_AI_BOT') return context.players;
        return context.players.filter(p => p.id !== event.botId);
      },
    }),
  },
}).createMachine({
  id: 'lobby',
  initial: 'waiting',
  context: ({ input }) => ({
    lobbyId: input.lobbyId,
    hostId: input.hostId || null,
    players: [],
    spectators: [],
    bannedPlayerIds: [],
    settings: {
      isPrivate: input.settings?.isPrivate ?? false,
      gridSize: input.settings?.gridSize ?? 40,
      maxPlayers: input.settings?.maxPlayers ?? 8,
      allowSpectators: input.settings?.allowSpectators ?? true,
    },
    createdAt: Date.now(),
    countdownStartedAt: null,
    roundNumber: 1,
  }),
  states: {
    waiting: {
      description: 'Waiting for players to join and ready up',
      on: {
        PLAYER_JOIN: {
          guard: { type: 'isNotFull', and: ['isNotBanned'] },
          actions: 'addPlayer',
        },
        PLAYER_LEAVE: {
          actions: 'removePlayer',
          target: 'waiting',
        },
        SPECTATOR_JOIN: {
          actions: 'addSpectator',
        },
        SPECTATOR_LEAVE: {
          actions: 'removeSpectator',
        },
        PLAYER_READY: {
          actions: 'updatePlayerReady',
        },
        UPDATE_SETTINGS: {
          guard: 'isHost',
          actions: 'updateSettings',
        },
        START_GAME: {
          guard: 'allPlayersReady',
          target: 'starting',
        },
        KICK_PLAYER: {
          actions: 'kickPlayer',
        },
        BAN_PLAYER: {
          actions: 'banPlayer',
        },
        ADD_AI_BOT: {
          guard: 'isNotFull',
          actions: 'addAIBot',
        },
        REMOVE_AI_BOT: {
          actions: 'removeAIBot',
        },
        CLOSE_LOBBY: {
          target: 'closed',
        },
      },
      // Automatically transition to starting when all players are ready
      always: {
        guard: 'allPlayersReady',
        target: 'starting',
      },
    },
    starting: {
      description: 'Countdown before game starts (5 seconds)',
      entry: ['startCountdown', 'incrementRound'],
      after: {
        // 5 second countdown before game starts
        5000: {
          target: 'inGame',
          actions: ['resetPlayerReadyStates', 'clearCountdown'],
        },
      },
      on: {
        // Allow players to leave during countdown - cancel and go back to waiting
        PLAYER_LEAVE: {
          actions: ['removePlayer', 'clearCountdown'],
          target: 'waiting',
        },
        SPECTATOR_JOIN: {
          actions: 'addSpectator',
        },
        SPECTATOR_LEAVE: {
          actions: 'removeSpectator',
        },
      },
    },
    inGame: {
      description: 'Game is actively being played',
      on: {
        PLAYER_LEAVE: {
          actions: 'removePlayer',
        },
        SPECTATOR_JOIN: {
          actions: 'addSpectator',
        },
        SPECTATOR_LEAVE: {
          actions: 'removeSpectator',
        },
        GAME_ENDED: {
          target: 'finished',
        },
        CLOSE_LOBBY: {
          target: 'closed',
        },
      },
    },
    finished: {
      description: 'Game has ended, showing results',
      on: {
        RETURN_TO_LOBBY: {
          target: 'waiting',
          actions: 'resetPlayerReadyStates',
        },
        PLAYER_LEAVE: {
          actions: 'removePlayer',
        },
        SPECTATOR_JOIN: {
          actions: 'addSpectator',
        },
        SPECTATOR_LEAVE: {
          actions: 'removeSpectator',
        },
        CLOSE_LOBBY: {
          target: 'closed',
        },
      },
    },
    closed: {
      description: 'Lobby is closed and no longer accepting players',
      type: 'final',
    },
  },
});

