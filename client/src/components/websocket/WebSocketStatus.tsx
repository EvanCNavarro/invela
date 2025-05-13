/**
 * WebSocket Status Component
 * 
 * This component displays the current status of the WebSocket connection
 * and provides controls to connect, disconnect, and send test messages.
 */

import React, { useState, useEffect } from "react";
import useWebSocket from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const WebSocketStatus: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [connectionLabel, setConnectionLabel] = useState("Disconnected");
  const [labelColor, setLabelColor] = useState("text-red-500");

  // Set up event handlers
  const handlePongMessage = (data: any) => {
    console.log("Received pong message:", data);
  };

  const handleTaskUpdate = (data: any) => {
    console.log("Received task update:", data);
  };

  // Use the WebSocket hook
  const {
    isConnected,
    connect,
    disconnect,
    send,
    lastMessage,
    connectionState,
  } = useWebSocket(
    {
      pong: handlePongMessage,
      task_updated: handleTaskUpdate,
    },
    {
      autoConnect: true,
      pingInterval: 30000,
    }
  );

  // Update connection status label
  useEffect(() => {
    if (isConnected) {
      setConnectionLabel("Connected");
      setLabelColor("text-green-500");
    } else {
      if (connectionState === 0) {
        setConnectionLabel("Connecting...");
        setLabelColor("text-yellow-500");
      } else if (connectionState === 2) {
        setConnectionLabel("Closing...");
        setLabelColor("text-orange-500");
      } else {
        setConnectionLabel("Disconnected");
        setLabelColor("text-red-500");
      }
    }
  }, [isConnected, connectionState]);

  // Add new messages to the list
  useEffect(() => {
    if (lastMessage) {
      setMessages((prevMessages) => [
        { 
          id: Date.now(), 
          timestamp: new Date().toISOString(),
          data: lastMessage 
        },
        ...prevMessages.slice(0, 19), // Keep only the last 20 messages
      ]);
    }
  }, [lastMessage]);

  // Send a ping message
  const handleSendPing = () => {
    send("ping");
  };

  // Send a task update simulation
  const handleSimulateTaskUpdate = () => {
    send("simulate_task_update", {
      taskId: Math.floor(Math.random() * 1000),
      progress: Math.floor(Math.random() * 100),
      status: ["pending", "in_progress", "completed"][Math.floor(Math.random() * 3)],
    });
  };

  // Clear message history
  const handleClearMessages = () => {
    setMessages([]);
  };

  // Get the right connection status badge color
  const getConnectionBadgeVariant = () => {
    if (isConnected) return "success";
    if (connectionState === 0) return "warning";
    return "destructive";
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>WebSocket Status</span>
          <Badge variant={getConnectionBadgeVariant()}>
            {connectionLabel}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={connect}
            disabled={isConnected || connectionState === 0}
            variant="outline"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!isConnected}
            variant="outline"
          >
            Disconnect
          </Button>
          <Button
            onClick={handleSendPing}
            disabled={!isConnected}
            variant="outline"
          >
            Send Ping
          </Button>
          <Button
            onClick={handleSimulateTaskUpdate}
            disabled={!isConnected}
            variant="outline"
          >
            Simulate Task Update
          </Button>
          <Button
            onClick={handleClearMessages}
            variant="outline"
            className="ml-auto"
          >
            Clear Messages
          </Button>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-2">Message History</h3>
          <ScrollArea className="h-[300px] w-full rounded-md border p-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No messages yet
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-md border p-2 text-sm"
                  >
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Type: {msg.data.type}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(msg.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground">
        <div>WebSocket Path: /ws • Connection State: {connectionState}</div>
      </CardFooter>
    </Card>
  );
};

export default WebSocketStatus;