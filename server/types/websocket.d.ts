/**
 * WebSocket Type Declarations
 * 
 * This file provides type declarations for the WebSocket utilities
 * to ensure proper type checking and module resolution.
 */

declare module '../websocket' {
  export interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp?: string;
    sender?: string | number;
    receiver?: string | number;
    metadata?: Record<string, any>;
  }

  export function broadcastMessage(message: WebSocketMessage): void;
  export function sendMessageToUser(userId: number, message: WebSocketMessage): void;
  export function sendMessageToCompany(companyId: number, message: WebSocketMessage): void;
  export function initializeWebSocketServer(server: any): void;
  export function getConnectedClients(): Record<string, any>;
} 