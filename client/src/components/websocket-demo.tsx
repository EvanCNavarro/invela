import { useState, useEffect } from "react";
import { useWebSocketContext } from "@/providers/websocket-provider";
import { WebSocketStatus } from "@/components/websocket-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderCircle, Send } from "lucide-react";

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  direction: "incoming" | "outgoing";
}

export function WebSocketDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { status, isConnected, send, subscribe, unsubscribe } = useWebSocketContext();

  useEffect(() => {
    // Function to handle incoming messages
    const handleMessage = (data: any) => {
      console.log("WebSocket message received:", data);
      
      // Add received message to the messages array
      const newMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: data.type || "unknown",
        content: JSON.stringify(data),
        timestamp: new Date().toISOString(),
        direction: "incoming"
      };
      
      setMessages(prev => [...prev, newMessage]);
    };

    // Subscribe to all message types
    const types = ["task_update", "task_created", "task_deleted", "connection_established", "pong"];
    const unsubscribers = types.map(type => subscribe(type, handleMessage));
    
    // Generic message handler for all other message types
    const genericUnsubscriber = subscribe("", handleMessage);
    
    return () => {
      // Cleanup subscriptions when component unmounts
      unsubscribers.forEach(unsub => unsub());
      genericUnsubscriber();
    };
  }, [subscribe, unsubscribe]);

  // Handle connection status changes
  useEffect(() => {
    if (status === "connected") {
      // Add connection status message
      const connectionMessage: Message = {
        id: `conn-${Date.now()}`,
        type: "system",
        content: "Connected to WebSocket server",
        timestamp: new Date().toISOString(),
        direction: "incoming"
      };
      setMessages(prev => [...prev, connectionMessage]);
    } else if (status === "disconnected" || status === "error") {
      // Add disconnection status message
      const disconnectionMessage: Message = {
        id: `disconn-${Date.now()}`,
        type: "system",
        content: `Disconnected from WebSocket server. Status: ${status}`,
        timestamp: new Date().toISOString(),
        direction: "incoming"
      };
      setMessages(prev => [...prev, disconnectionMessage]);
    }
  }, [status]);

  // Send a message
  const sendMessage = () => {
    if (!messageInput.trim() || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      // Try to parse as JSON first, otherwise send as string
      let messageType = "message";
      let messagePayload: any;
      
      try {
        // Try to parse as JSON
        const parsedContent = JSON.parse(messageInput);
        
        // If it's an object with a type property, use that
        if (parsedContent && typeof parsedContent === 'object') {
          if (parsedContent.type) {
            messageType = parsedContent.type;
            delete parsedContent.type; // Remove type from payload
            messagePayload = parsedContent;
          } else {
            // No type specified, use entire object as payload
            messagePayload = parsedContent;
          }
        } else {
          // It's a primitive value parsed from JSON
          messagePayload = { value: parsedContent };
        }
      } catch {
        // Not valid JSON, treat as text message
        messagePayload = { text: messageInput };
      }
      
      // Send the message
      send(messageType, messagePayload);
      
      // Add sent message to the messages array
      const sentMessage: Message = {
        id: `sent-${Date.now()}`,
        type: messageType,
        content: JSON.stringify({ type: messageType, payload: messagePayload }),
        timestamp: new Date().toISOString(),
        direction: "outgoing"
      };
      
      setMessages(prev => [...prev, sentMessage]);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "error",
        content: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        direction: "outgoing"
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get badge variant based on message type
  const getMessageBadgeVariant = (type: string) => {
    switch (type) {
      case "system":
        return "secondary";
      case "error":
        return "destructive";
      case "task_update":
      case "task_created":
      case "task_deleted":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>WebSocket Demo</CardTitle>
          <WebSocketStatus showTooltip showLabel />
        </div>
        <CardDescription>
          Test real-time communication with the server
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] p-4 border-y">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p>No messages yet. Start by sending a message below.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.direction === "outgoing" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.direction === "outgoing"
                        ? "bg-primary text-primary-foreground"
                        : message.type === "system"
                        ? "bg-muted"
                        : message.type === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getMessageBadgeVariant(message.type)}>
                        {message.type}
                      </Badge>
                      <span className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words">
                      {message.content}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="p-4 pt-3">
        <div className="flex w-full gap-2">
          <Input
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isConnected ? "Type a message or JSON..." : "Connect to send messages..."}
            disabled={!isConnected || isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!isConnected || isLoading || !messageInput.trim()}
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">Send</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default WebSocketDemo;