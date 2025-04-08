import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import WebSocketStatus from './websocket-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Trash } from 'lucide-react';

/**
 * Component to demonstrate WebSocket functionality
 */
export default function WebSocketDemo() {
  const { isConnected, send } = useWebSocket();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ text: string; sent: boolean; timestamp: Date }[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim() || !isConnected) return;
    
    // Send the message to the server
    send({
      type: 'chat_message',
      text: message,
      timestamp: new Date().toISOString()
    });
    
    // Add the message to the local messages list
    setMessages(prev => [
      ...prev,
      { text: message, sent: true, timestamp: new Date() }
    ]);
    
    // Clear the input
    setMessage('');
  };
  
  // Handle pressing Enter to send a message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // Clear all messages
  const handleClearMessages = () => {
    setMessages([]);
  };
  
  // Set up message listener for received messages
  useEffect(() => {
    const handleReceivedMessage = (data: any) => {
      if (data.type === 'chat_message') {
        setMessages(prev => [
          ...prev,
          { text: data.text, sent: false, timestamp: new Date(data.timestamp) }
        ]);
      }
    };
    
    // Add and remove message listener
    useWebSocket().addMessageListener('chat_message', handleReceivedMessage);
    
    return () => {
      useWebSocket().removeMessageListener('chat_message', handleReceivedMessage);
    };
  }, []);
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <Card className="w-full max-w-md mx-auto border rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>WebSocket Chat</CardTitle>
            <CardDescription>
              Send and receive real-time messages
            </CardDescription>
          </div>
          <WebSocketStatus className="ml-auto" />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.sent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm">{msg.text}</div>
                    <div className="mt-1 text-xs opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2 pt-3">
        <div className="flex w-full space-x-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !message.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-between w-full">
          <Badge variant="outline" className="text-xs">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </Badge>
          
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMessages}
              className="h-7 px-2 text-xs"
            >
              <Trash className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}