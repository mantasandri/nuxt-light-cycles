/**
 * Replay Recording Service
 * Captures player actions and game events for replay functionality
 */

import type {
  PlayerAction,
  GameEvent,
  ReplayData,
  ReplayMetadata,
  ReplayInitialState,
  UserReplayList,
} from '../types/replay.types';
import { nanoid } from 'nanoid';
import { promises as fs } from 'fs';
import { join } from 'path';

class ReplayRecorder {
  private actions: PlayerAction[] = [];
  private events: GameEvent[] = [];
  private initialState: ReplayInitialState | null = null;
  private startTime: number = 0;
  private currentTick: number = 0;
  private lobbyName: string = '';
  private isRecording: boolean = false;

  startRecording(initialState: ReplayInitialState, lobbyName: string) {
    this.actions = [];
    this.events = [];
    this.initialState = initialState;
    this.startTime = Date.now();
    this.currentTick = 0;
    this.lobbyName = lobbyName;
    this.isRecording = true;
  }

  recordAction(action: Omit<PlayerAction, 'tick' | 'timestamp'>) {
    if (!this.isRecording) return;
    
    this.actions.push({
      ...action,
      tick: this.currentTick,
      timestamp: Date.now() - this.startTime,
    });
  }

  recordEvent(event: Omit<GameEvent, 'tick' | 'timestamp'>) {
    if (!this.isRecording) return;
    
    this.events.push({
      ...event,
      tick: this.currentTick,
      timestamp: Date.now() - this.startTime,
    });
  }

  incrementTick() {
    if (this.isRecording) {
      this.currentTick++;
    }
  }

  async saveReplay(userId: string, winner: ReplayMetadata['winner']): Promise<string> {
    // Check if we have recorded data (not currently recording, but has data from a stopped recording)
    if (!this.initialState || this.actions.length === 0) {
      throw new Error('No recording in progress');
    }

    const replayId = nanoid(12);
    const duration = Math.floor((Date.now() - this.startTime) / 1000);

    const metadata: ReplayMetadata = {
      replayId,
      userId,
      lobbyName: this.lobbyName,
      createdAt: Date.now(),
      duration,
      totalTicks: this.currentTick,
      winner,
      playerCount: this.initialState.players.length,
      gridSize: this.initialState.gridSize,
    };

    const replayData: ReplayData = {
      metadata,
      initialState: this.initialState,
      actions: this.actions,
      events: this.events,
    };

    // Save replay to file system
    await ReplayService.saveReplayToFile(replayData);

    // Associate replay with user
    await ReplayService.addReplayToUser(userId, replayId, metadata);

    return replayId;
  }

  stopRecording() {
    this.isRecording = false;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

class ReplayServiceClass {
  private replayStoragePath: string;
  private userStoragePath: string;

  constructor() {
    // Store replays in server/api/replays directory
    this.replayStoragePath = join(process.cwd(), 'server', 'api', 'replays', 'data');
    this.userStoragePath = join(process.cwd(), 'server', 'api', 'replays', 'users');
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(this.replayStoragePath, { recursive: true });
      await fs.mkdir(this.userStoragePath, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize replay storage:', error);
    }
  }

  async saveReplayToFile(replayData: ReplayData): Promise<void> {
    const filePath = join(this.replayStoragePath, `${replayData.metadata.replayId}.json`);
    await fs.writeFile(filePath, JSON.stringify(replayData, null, 2), 'utf-8');
  }

  async loadReplay(replayId: string): Promise<ReplayData | null> {
    try {
      const filePath = join(this.replayStoragePath, `${replayId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as ReplayData;
    } catch (error) {
      console.error(`Failed to load replay ${replayId}:`, error);
      return null;
    }
  }

  async deleteReplay(replayId: string): Promise<void> {
    const filePath = join(this.replayStoragePath, `${replayId}.json`);
    await fs.unlink(filePath);
  }

  async addReplayToUser(userId: string, replayId: string, metadata: ReplayMetadata): Promise<void> {
    const userFilePath = join(this.userStoragePath, `${userId}.json`);
    
    let userReplays: UserReplayList;
    
    try {
      const content = await fs.readFile(userFilePath, 'utf-8');
      userReplays = JSON.parse(content);
    } catch {
      // User file doesn't exist, create new one
      userReplays = {
        userId,
        replays: [],
      };
    }

    // Add new replay to the beginning of the list
    const { userId: _, ...metadataWithoutUserId } = metadata;
    userReplays.replays.unshift({
      replayId,
      metadata: metadataWithoutUserId,
    });

    // Limit to 50 replays per user
    if (userReplays.replays.length > 50) {
      const removedReplays = userReplays.replays.splice(50);
      // Delete old replay files
      for (const replay of removedReplays) {
        try {
          await this.deleteReplay(replay.replayId);
        } catch (error) {
          console.error(`Failed to delete old replay ${replay.replayId}:`, error);
        }
      }
    }

    await fs.writeFile(userFilePath, JSON.stringify(userReplays, null, 2), 'utf-8');
  }

  async getUserReplays(userId: string): Promise<UserReplayList['replays']> {
    try {
      const userFilePath = join(this.userStoragePath, `${userId}.json`);
      const content = await fs.readFile(userFilePath, 'utf-8');
      const userReplays: UserReplayList = JSON.parse(content);
      return userReplays.replays;
    } catch {
      return [];
    }
  }

  async removeReplayFromUser(userId: string, replayId: string): Promise<void> {
    const userFilePath = join(this.userStoragePath, `${userId}.json`);
    
    try {
      const content = await fs.readFile(userFilePath, 'utf-8');
      const userReplays: UserReplayList = JSON.parse(content);
      
      userReplays.replays = userReplays.replays.filter(r => r.replayId !== replayId);
      
      await fs.writeFile(userFilePath, JSON.stringify(userReplays, null, 2), 'utf-8');
      
      // Delete the replay file
      await this.deleteReplay(replayId);
    } catch (error) {
      console.error(`Failed to remove replay ${replayId} from user ${userId}:`, error);
      throw error;
    }
  }

  createRecorder(): ReplayRecorder {
    return new ReplayRecorder();
  }
}

export const ReplayService = new ReplayServiceClass();
export { ReplayRecorder };

