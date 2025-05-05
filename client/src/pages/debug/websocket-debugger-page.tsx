import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WebSocketTester } from '@/components/tasks/WebSocketTester';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { BellRing, Terminal, TerminalSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useWebSocketService } from '@/providers/websocket-provider';
import type { TaskUpdateEvent, ConnectionStatusEvent, SystemNotificationEvent } from '@/lib/websocket-types';

export default function WebsocketDebuggerPage() {
  const [taskId, setTaskId] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [progress, setProgress] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  type ResultType = { success: boolean; message: string; details?: any };
  
  const [result, setResult] = useState<ResultType | null>(null);
  const wsService = useWebSocketService();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<TaskUpdateEvent | ConnectionStatusEvent | SystemNotificationEvent | null>(null);
  const [lastTaskUpdate, setLastTaskUpdate] = useState<TaskUpdateEvent['payload'] | null>(null);
  
  // Set up WebSocket subscribers
  useEffect(() => {
    // Track subscriptions to clean up
    const subscriptions: (() => void)[] = [];
    
    // Connection status subscription
    const connectionSub = wsService.subscribe('connection_status', (data: ConnectionStatusEvent) => {
      if (data && typeof data === 'object') {
        // Handle both payload or direct format
        const status = data.status;
        setConnected(status === 'connected');
        
        // Also track this for the last message panel
        setLastMessage(data);
      }
    });
    subscriptions.push(connectionSub);
    
    // Add a subscription for any task related events
    const taskMessageSub = wsService.subscribe('task_update', (data: TaskUpdateEvent) => {
      setLastMessage(data);
    });
    subscriptions.push(taskMessageSub);
    
    // Add a subscription for any system notifications
    const systemNotificationSub = wsService.subscribe('system_notification', (data: SystemNotificationEvent) => {
      setLastMessage(data);
    });
    subscriptions.push(systemNotificationSub);
    
    // Track task updates specifically
    const taskUpdateSub = wsService.subscribe('task_update', (data: TaskUpdateEvent) => {
      // Extract task data from the payload
      setLastTaskUpdate(data.payload);
    });
    subscriptions.push(taskUpdateSub);
    
    // Set initial connection state
    setConnected(wsService.isConnected);
    
    return () => {
      // Clean up all subscriptions
      subscriptions.forEach(unsub => unsub());
    };
  }, [wsService]);
  
  const sendTestNotification = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest('/api/websocket/test-notification', 'POST', {
        taskId,
        status,
        progress: parseInt(progress.toString(), 10)
      });
      
      setResult({
        success: true,
        message: 'Test notification sent successfully',
        details: response
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendPing = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('/api/websocket/ping', 'POST', {});
      
      setResult({
        success: true,
        message: 'Ping sent successfully',
        details: response
      });
    } catch (error) {
      console.error('Error sending ping:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <DashboardLayout>
      <div className="container py-8">
        <PageHeader
          title="WebSocket Debugger"
          description="Test and debug WebSocket event handling"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{connected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={sendPing}
                    disabled={isLoading || !connected}
                  >
                    Send Ping
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5" />
                  Task Update Simulator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="taskId">Task ID</Label>
                    <Input
                      id="taskId"
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                      placeholder="Enter task ID"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="ready_for_submission">Ready for Submission</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="progress">Progress</Label>
                    <Input
                      id="progress"
                      type="number"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                    />
                  </div>
                  
                  <Button 
                    onClick={sendTestNotification} 
                    disabled={isLoading || !taskId}
                  >
                    {isLoading ? 'Sending...' : 'Send Test Notification'}
                  </Button>
                  
                  {result && (
                    <div className={`p-3 rounded text-sm ${result.success ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'}`}>
                      <p className="font-medium">{result.message}</p>
                      {result.details && (
                        <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5" />
                  Last Received Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastMessage ? (
                  <div className="space-y-4">
                    <div>
                      <Badge>{lastMessage.type}</Badge>
                      <div className="mt-2">
                        <pre className="text-xs overflow-auto max-h-64 p-3 bg-muted rounded whitespace-pre-wrap">
                          {JSON.stringify(lastMessage, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No messages received yet
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5" />
                  Last Task Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lastTaskUpdate ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-sm font-medium">Task ID</span>
                        <p>{lastTaskUpdate.id}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Status</span>
                        <p>{lastTaskUpdate.status}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Progress</span>
                        <p>{lastTaskUpdate.progress}%</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <span className="text-sm font-medium">Full Payload</span>
                      <pre className="mt-2 text-xs overflow-auto max-h-64 p-3 bg-muted rounded whitespace-pre-wrap">
                        {JSON.stringify(lastTaskUpdate, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    No task updates received yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}