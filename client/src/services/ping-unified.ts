/**
 * ========================================
 * Unified Ping Service
 * ========================================
 * 
 * Consolidates the 53+ ping implementations into a single service
 * to eliminate duplicate heartbeat functionality and reduce WebSocket overhead.
 * 
 * @module services/ping-unified
 * @version 1.0.0
 * @since 2025-05-30
 */

import { unifiedWebSocketService } from './websocket-unified';

// ========================================
// UNIFIED PING SERVICE
// ========================================

class UnifiedPingService {
  private static instance: UnifiedPingService | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  
  private constructor() {}
  
  static getInstance(): UnifiedPingService {
    if (!UnifiedPingService.instance) {
      UnifiedPingService.instance = new UnifiedPingService();
    }
    return UnifiedPingService.instance;
  }
  
  // ========================================
  // PING MANAGEMENT
  // ========================================
  
  start(): void {
    if (this.isActive) {
      return; // Already running
    }
    
    this.isActive = true;
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (unifiedWebSocketService.isConnected()) {
        unifiedWebSocketService.send('ping', {
          timestamp: new Date().toISOString(),
          source: 'unified-ping-service'
        });
      }
    }, 30000);
    
    console.log('[UnifiedPing] Heartbeat service started');
  }
  
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.isActive = false;
    console.log('[UnifiedPing] Heartbeat service stopped');
  }
  
  // ========================================
  // STATUS METHODS
  // ========================================
  
  isRunning(): boolean {
    return this.isActive;
  }
}

// ========================================
// EXPORTS
// ========================================

export const unifiedPingService = UnifiedPingService.getInstance();