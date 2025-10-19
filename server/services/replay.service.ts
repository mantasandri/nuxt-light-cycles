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
} from '../types/replay.types'
import { nanoid } from 'nanoid'

class ReplayRecorder {
  private actions: PlayerAction[] = []
  private events: GameEvent[] = []
  private initialState: ReplayInitialState | null = null
  private startTime: number = 0
  private currentTick: number = 0
  private lobbyName: string = ''
  private isRecording: boolean = false

  startRecording(initialState: ReplayInitialState, lobbyName: string) {
    this.actions = []
    this.events = []
    this.initialState = initialState
    this.startTime = Date.now()
    this.currentTick = 0
    this.lobbyName = lobbyName
    this.isRecording = true
  }

  recordAction(action: Omit<PlayerAction, 'tick' | 'timestamp'>) {
    if (!this.isRecording) return
    
    this.actions.push({
      ...action,
      tick: this.currentTick,
      timestamp: Date.now() - this.startTime,
    })
  }

  recordEvent(event: Omit<GameEvent, 'tick' | 'timestamp'>) {
    if (!this.isRecording) return
    
    this.events.push({
      ...event,
      tick: this.currentTick,
      timestamp: Date.now() - this.startTime,
    })
  }

  incrementTick() {
    if (this.isRecording) {
      this.currentTick++
    }
  }

  async saveReplay(userId: string, winner: ReplayMetadata['winner']): Promise<string> {
    // Check if we have recorded data (recording was started, even if no actions were recorded)
    if (!this.initialState) {
      throw new Error('No recording was started')
    }
    
    // Allow saving even if no actions were recorded (e.g., very short game)
    console.log(`[ReplayRecorder] Saving replay with ${this.actions.length} actions and ${this.events.length} events`)
    
    if (this.events.length === 0) {
      throw new Error('No game events recorded')
    }

    const replayId = nanoid(12)
    const duration = Math.floor((Date.now() - this.startTime) / 1000)

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
    }

    const replayData: ReplayData = {
      metadata,
      initialState: this.initialState,
      actions: this.actions,
      events: this.events,
    }

    try {
      console.log(`[ReplayRecorder] Saving replay ${replayId} for user ${userId}`)
      // Save replay to file system
      await ReplayService.saveReplayToFile(replayData)
      console.log(`[ReplayRecorder] Replay data saved successfully`)

      // Associate replay with user
      await ReplayService.addReplayToUser(userId, replayId, metadata)
      console.log(`[ReplayRecorder] Replay associated with user successfully`)
    } catch (error) {
      console.error(`[ReplayRecorder] Error saving replay:`, error)
      throw error
    }

    return replayId
  }

  stopRecording() {
    this.isRecording = false
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }
}

class ReplayServiceClass {
  async saveReplayToFile(replayData: ReplayData): Promise<void> {
    try {
      const storage = useStorage()
      const key = `replays:data:${replayData.metadata.replayId}`
      console.log(`[ReplayService] Attempting to save replay with key: ${key}`)
      await storage.setItem(key, replayData)
      console.log(`[ReplayService] Successfully saved replay data`)
    } catch (error) {
      console.error(`[ReplayService] Error in saveReplayToFile:`, error)
      throw error
    }
  }

  async loadReplay(replayId: string): Promise<ReplayData | null> {
    try {
      const storage = useStorage()
      const key = `replays:data:${replayId}`
      const data = await storage.getItem<ReplayData>(key)
      return data
    } catch (error) {
      console.error(`Failed to load replay ${replayId}:`, error)
      return null
    }
  }

  async deleteReplay(replayId: string): Promise<void> {
    const storage = useStorage()
    const key = `replays:data:${replayId}`
    await storage.removeItem(key)
  }

  async addReplayToUser(userId: string, replayId: string, metadata: ReplayMetadata): Promise<void> {
    try {
      const storage = useStorage()
      const userKey = `replays:users:${userId}`
      console.log(`[ReplayService] Adding replay to user with key: ${userKey}`)
      
      let userReplays: UserReplayList
      
      try {
        const data = await storage.getItem<UserReplayList>(userKey)
        userReplays = data || {
          userId,
          replays: [],
        }
        console.log(`[ReplayService] Loaded existing user replays, count: ${userReplays.replays.length}`)
      } catch {
        // User file doesn't exist, create new one
        userReplays = {
          userId,
          replays: [],
        }
        console.log(`[ReplayService] Creating new user replay list`)
      }

      // Add new replay to the beginning of the list
      const { userId: _, ...metadataWithoutUserId } = metadata
      userReplays.replays.unshift({
        replayId,
        metadata: metadataWithoutUserId,
      })

      // Limit to 50 replays per user
      if (userReplays.replays.length > 50) {
        const removedReplays = userReplays.replays.splice(50)
        // Delete old replay files
        for (const replay of removedReplays) {
          try {
            await this.deleteReplay(replay.replayId)
          } catch (error) {
            console.error(`Failed to delete old replay ${replay.replayId}:`, error)
          }
        }
      }

      console.log(`[ReplayService] Saving user replay list with ${userReplays.replays.length} replays`)
      await storage.setItem(userKey, userReplays)
      console.log(`[ReplayService] Successfully saved user replay list`)
    } catch (error) {
      console.error(`[ReplayService] Error in addReplayToUser:`, error)
      throw error
    }
  }

  async getUserReplays(userId: string): Promise<UserReplayList['replays']> {
    try {
      const storage = useStorage()
      const userKey = `replays:users:${userId}`
      const userReplays = await storage.getItem<UserReplayList>(userKey)
      return userReplays?.replays || []
    } catch {
      return []
    }
  }

  async removeReplayFromUser(userId: string, replayId: string): Promise<void> {
    const storage = useStorage()
    const userKey = `replays:users:${userId}`
    
    try {
      const userReplays = await storage.getItem<UserReplayList>(userKey)
      
      if (userReplays) {
        userReplays.replays = userReplays.replays.filter(r => r.replayId !== replayId)
        await storage.setItem(userKey, userReplays)
      }
      
      // Delete the replay file
      await this.deleteReplay(replayId)
    } catch (error) {
      console.error(`Failed to remove replay ${replayId} from user ${userId}:`, error)
      throw error
    }
  }

  createRecorder(): ReplayRecorder {
    return new ReplayRecorder()
  }
}

export const ReplayService = new ReplayServiceClass()
export { ReplayRecorder }

