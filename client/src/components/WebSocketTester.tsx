/**
 * WebSocket Tester Component
 * 
 * This component helps test WebSocket connections and message handling
 * in our application, especially for task updates and form submissions.
 */

import React, { useState, useEffect, useContext } from 'react';
import { WebSocketContext } from '@/providers/websocket-provider';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Component to test WebSocket connections and messages
export const WebSocketTester: React.FC = () => {
  const { socket, isConnected } = useContext(WebSocketContext);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  
  // Listen for WebSocket messages
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Message handler
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [data, ...prev].slice(0, 50)); // Keep latest 50 messages
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Add event listener
    socket.addEventListener('message', handleMessage);
    
    // Cleanup
    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected]);
  
  // Send a test task update message
  const sendTestTaskUpdate = () => {
    if (!socket || !isConnected) return;
    
    try {
      socket.send(JSON.stringify({
        type: 'test_task_update',
        taskId: 999,
        status: 'submitted',
        progress: 100,
        formType: 'kyb',
        timestamp: new Date().toISOString(),
        message: 'This is a test task update'
      }));
    } catch (error) {
      console.error('Error sending test message:', error);
    }
  };
  
  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Filter messages based on selected filter
  const filteredMessages = messageFilter === 'all' 
    ? messages 
    : messages.filter(msg => msg.type === messageFilter);
  
  // Extract all message types for filter options
  const messageTypes = Array.from(new Set(messages.map(msg => msg.type)));
  
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          WebSocket Tester
          <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-green-500 hover:bg-green-600" : ""}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test WebSocket connections and message handling in the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Button onClick={sendTestTaskUpdate} disabled={!isConnected}>
            Send Test Task Update
          </Button>
          <Button variant="outline" onClick={clearMessages}>
            Clear Messages
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="all" onClick={() => setMessageFilter('all')}>
              All Messages
            </TabsTrigger>
            {messageTypes.map(type => (
              <TabsTrigger 
                key={type} 
                value={type}
                onClick={() => setMessageFilter(type)}
              >
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={messageFilter} className="mt-0">
            <ScrollArea className="h-80 rounded-md border p-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages received yet
                </div>
              ) : (
                filteredMessages.map((msg, i) => (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{msg.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                      {JSON.stringify(msg, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Total messages: {messages.length}
      </CardFooter>
    </Card>
  );
};

export default WebSocketTester;