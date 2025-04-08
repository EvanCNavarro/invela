import React from 'react';
import { WebSocketProvider } from '@/providers/websocket-provider';
import WebSocketDemo from '@/components/websocket-demo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Playground component for demonstrating WebSocket functionality
 */
export default function WebSocketPlayground() {
  return (
    <div className="container py-8">
      <Card className="mb-8 w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>WebSocket Playground</CardTitle>
          <CardDescription>
            Test real-time communication with WebSockets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-muted-foreground">
            This playground demonstrates WebSocket communication. Connect multiple browser windows to see real-time chat in action.
          </p>
          
          <WebSocketProvider>
            <WebSocketDemo />
          </WebSocketProvider>
        </CardContent>
      </Card>
    </div>
  );
}