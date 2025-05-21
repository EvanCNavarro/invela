import React from 'react';
import { WebSocketDemo } from '@/components/WebSocketDemo';

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