// WebSocket-related types shared between composables

export type MessageHandler = (data: { type: string; payload: any }) => void

