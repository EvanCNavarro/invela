/**
 * WebSocket Real-time Communication Demo Page
 * 
 * Provides a demonstration interface for testing WebSocket real-time communication
 * between client and server. Multiple browser instances will receive synchronized
 * messages, showcasing the platform's real-time capabilities.
 * 
 * @author Enterprise Risk Assessment Platform
 * @version 1.0.0
 * @since 2025-05-23
 * 
 * Dependencies:
 * - WebSocketDemo: Core WebSocket demonstration component
 * - React: UI framework for component rendering
 * 
 * Key Features:
 * - Real-time message broadcasting across multiple clients
 * - Live connection status monitoring
 * - Interactive message sending interface
 * - Multi-window synchronization demonstration
 */

import React from 'react';
import { WebSocketDemo } from '@/components/WebSocketDemo';

/**
 * WebSocket Demo Page Component
 * 
 * Renders the WebSocket demonstration interface with proper layout and context.
 * Provides clear instructions and houses the interactive WebSocket demo component.
 * 
 * @returns JSX element containing the complete WebSocket demo page
 */
export default function WebSocketDemoPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">WebSocket Real-time Communication Demo</h1>
      <p className="text-muted-foreground mb-8">
        This page demonstrates real-time communication between the client and server using WebSockets.
        Multiple browser windows will receive the same messages in real-time.
      </p>
      
      <WebSocketDemo />
    </div>
  );
}