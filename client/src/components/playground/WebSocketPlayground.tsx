import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocketContext } from "@/providers/websocket-provider";
import { WebSocketStatus } from "@/components/websocket-status";
import { WebSocketDemo } from "@/components/websocket-demo";
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
  const { connect, disconnect, isConnected, status } = useWebSocketContext();
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
                {status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Current User:</p>
              <Badge variant="outline" className="text-xs">
                {user ? user.email : "Not authenticated"}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={disconnect}
            disabled={!isConnected}
          >
            Disconnect
          </Button>
          <Button 
            onClick={connect}
            disabled={isConnected}
          >
            Connect
          </Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="demo" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="demo">Demo</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="demo" className="space-y-4">
          <WebSocketDemo />
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
{`// Import the hook
import { useWebSocketContext } from "@/providers/websocket-provider";

// In your component
function MyComponent() {
  const { subscribe, send, isConnected } = useWebSocketContext();
  
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