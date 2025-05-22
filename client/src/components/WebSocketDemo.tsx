import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  direction: 'sent' | 'received';
}

/**
 * WebSocketDemo Component
 * 
 * A simple component to demonstrate WebSocket functionality
 * with real-time message sending and receiving.
 */
export function WebSocketDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const { status, sendMessage, subscribe, reconnect } = useWebSocket();
  
  // Subscribe to messages from the server
  useEffect(() => {
    // Subscribe to all message types
    const unsubscribe = subscribe('message', (data) => {
      addMessage({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'message',
        content: data.content || JSON.stringify(data),
        timestamp: data.timestamp || new Date().toISOString(),
        direction: 'received'
      });
    });
    
    // Also subscribe to pong responses
    const unsubPong = subscribe('pong', (data) => {
      addMessage({
        id: `pong-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'pong',
        content: 'Server responded to ping',
        timestamp: data.timestamp || new Date().toISOString(),
        direction: 'received'
      });
    });
    
    return () => {
      unsubscribe();
      unsubPong();
    };
  }, [subscribe]);
  
  // Add a message to the messages list
  const addMessage = (message: Message) => {
    setMessages(prevMessages => [...prevMessages, message].slice(-100)); // Keep only the last 100 messages
  };
  
  // Send a message to the server
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const success = sendMessage('message', { content: inputMessage });
    
    if (success) {
      // Add the sent message to the list
      addMessage({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'message',
        content: inputMessage,
        timestamp: new Date().toISOString(),
        direction: 'sent'
      });
      
      // Clear the input
      setInputMessage('');
    }
  };
  
  // Send a ping to test the connection
  const handleSendPing = () => {
    const success = sendMessage('ping', { 
      timestamp: new Date().toISOString() 
    });
    
    if (success) {
      addMessage({
        id: `ping-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'ping',
        content: 'Sent ping to server',
        timestamp: new Date().toISOString(),
        direction: 'sent'
      });
    }
  };
  
  // Get status color for the connection status badge
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 hover:bg-green-100/80';
      case 'connecting':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100/80';
      case 'disconnected':
        return 'bg-slate-100 text-slate-800 hover:bg-slate-100/80';
      case 'error':
        return 'bg-red-100 text-red-800 hover:bg-red-100/80';
      default:
        return 'bg-slate-100 text-slate-800 hover:bg-slate-100/80';
    }
  };
  
  // Get status icon
  const StatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 mr-1" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 mr-1 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 mr-1" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return <WifiOff className="h-4 w-4 mr-1" />;
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>WebSocket Demo</CardTitle>
          <Badge 
            variant="outline" 
            className={`capitalize px-2 py-1 ${getStatusColor()}`}
          >
            <StatusIcon />
            {status}
          </Badge>
        </div>
        <CardDescription>
          Real-time communication using WebSockets
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="bg-slate-50 rounded-md p-3 h-64 overflow-y-auto flex flex-col-reverse mb-4">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No messages yet. Send a message to get started.
              </div>
            ) : (
              messages.map(message => (
                <div 
                  key={message.id}
                  className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      message.direction === 'sent' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    {message.type === 'ping' || message.type === 'pong' ? (
                      <div className="flex items-center text-xs opacity-80">
                        <span className="font-medium">{message.content}</span>
                      </div>
                    ) : (
                      <div>
                        <p>{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={status !== 'connected'}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={status !== 'connected' || !inputMessage.trim()} 
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleSendPing}
          disabled={status !== 'connected'}
        >
          Send Ping
        </Button>
        
        <Button 
          variant="outline" 
          onClick={reconnect}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reconnect
        </Button>
      </CardFooter>
    </Card>
  );
}