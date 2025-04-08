import React from 'react';
import { WebSocketProvider } from '@/providers/websocket-provider';
import WebSocketPlayground from '@/components/playground/WebSocketPlayground';

/**
 * Page component for WebSocket playground
 */
export default function PlaygroundPage() {
  return (
    <WebSocketProvider>
      <WebSocketPlayground />
    </WebSocketProvider>
  );
}