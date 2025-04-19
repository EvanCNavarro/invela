import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

export function WebSocketDebugger() {
  const { connected, lastMessage, sendMessage, lastTaskUpdate } = useWebSocket();
  const [taskId, setTaskId] = useState<string>('');
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogMessages(prev => [message, ...prev.slice(0, 9)]);
  };

  const handleSendPing = () => {
    sendMessage('ping');
    addLog(`Sent ping message at ${new Date().toISOString()}`);
  };

  const handleSendTestNotification = async () => {
    if (!taskId || isNaN(parseInt(taskId))) {
      addLog('Please enter a valid task ID');
      return;
    }

    try {
      addLog(`Sending test notification for task ${taskId}...`);
      const response = await apiRequest(`/api/kyb/test-notification`, {
        method: 'POST',
        body: { taskId: parseInt(taskId) }
      });
      
      addLog(`Server response: ${JSON.stringify(response)}`);
    } catch (error) {
      addLog(`Error sending test notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WebSocket Debugger</CardTitle>
        <CardDescription>
          Test WebSocket connection and notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {lastTaskUpdate && (
          <div className="space-y-2 border p-3 rounded-md">
            <h4 className="font-semibold">Last Task Update</h4>
            <p>Task ID: {lastTaskUpdate.id}</p>
            <p>Status: {lastTaskUpdate.status}</p>
            <p>Progress: {lastTaskUpdate.progress}%</p>
            {lastTaskUpdate.metadata && (
              <p>Last Updated: {lastTaskUpdate.metadata.lastUpdated || 'N/A'}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="taskId">Task ID:</Label>
          <Input
            id="taskId"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="Enter task ID"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Log Messages</h4>
          <div className="h-32 overflow-y-auto border rounded-md p-2 text-sm">
            {logMessages.length > 0 ? (
              <ul className="space-y-1">
                {logMessages.map((message, index) => (
                  <li key={index} className="text-xs border-b pb-1 mb-1">
                    {message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-center pt-10">No logs yet</p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleSendPing}>
          Send Ping
        </Button>
        <Button onClick={handleSendTestNotification}>
          Test Notification
        </Button>
      </CardFooter>
    </Card>
  );
}