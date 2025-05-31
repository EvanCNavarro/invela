import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { unifiedWebSocketService } from "@/services/websocket-unified";
import { WebSocketStatus } from "@/components/websocket-status";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function WebSocketPlayground() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    setIsConnected(unifiedWebSocketService.isConnected());
    unifiedWebSocketService.connect().catch(console.error);
    
    const unsubscribeConnection = unifiedWebSocketService.subscribe('connection_status', (data: any) => {
      setIsConnected(data.connected === true);
    });
    
    return unsubscribeConnection;
  }, []);
  const [activeTab, setActiveTab] = useState("demo");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebSocket Playground</h1>
          <p className="text-muted-foreground">
            Test and explore real-time communication features
          </p>
        </div>
        <WebSocketStatus showTooltip showLabel className="scale-125" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WebSocket Connection</CardTitle>
          <CardDescription>
            Manage your connection to the real-time server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div>
              <p className="text-sm font-medium mb-1">Connection Status:</p>
              <Badge 
                variant={isConnected ? "default" : "secondary"}
                className="text-xs"
              >
                {isConnected ? "CONNECTED" : "DISCONNECTED"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Current User:</p>
              <Badge variant="outline" className="text-xs">
                {user ? user.email : "Not authenticated"}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Connection is managed automatically by the unified WebSocket service.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="demo" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Demo</CardTitle>
              <CardDescription>
                Demo functionality has been consolidated into the unified WebSocket system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The WebSocket demo has been removed as part of the unified WebSocket migration. 
                All real-time features now use the single, efficient unified connection.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How to Use WebSockets</CardTitle>
              <CardDescription>
                Quick guide to integrate WebSockets in your components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Basic Setup</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
{`// Import the unified hook
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";

// In your component
function MyComponent() {
  const { subscribe, send, isConnected } = useUnifiedWebSocket();
  
  useEffect(() => {
    // Subscribe to events
    const unsubscribe = subscribe("task_update", (data) => {
      console.log("Task updated:", data);
    });
    
    // Clean up
    return () => unsubscribe();
  }, [subscribe]);
  
  // Send a message
  const sendMessage = () => {
    if (isConnected) {
      send({ type: "my_event", data: { value: "test" } });
    }
  };
  
  return (...);
}`}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Available Events</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <code className="bg-muted px-1">task_update</code> - 
                    When a task's status or progress changes
                  </li>
                  <li>
                    <code className="bg-muted px-1">task_created</code> - 
                    When a new task is created
                  </li>
                  <li>
                    <code className="bg-muted px-1">task_deleted</code> - 
                    When a task is deleted
                  </li>
                  <li>
                    <code className="bg-muted px-1">connection_established</code> - 
                    When connection is first established
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WebSocketPlayground;