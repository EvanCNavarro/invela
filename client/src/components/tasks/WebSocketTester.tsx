import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { ArrowUpFromLine, BellRing, TerminalSquare } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface WebSocketTesterProps {
  // The current task ID to send updates for
  taskId?: number;
  // Whether this is in debug mode (shows more detailed controls)
  debugMode?: boolean;
  // Label for the test button
  buttonLabel?: string;
}

export function WebSocketTester({ 
  taskId, 
  debugMode = false,
  buttonLabel = 'Test Real-Time Updates'
}: WebSocketTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(50);
  const [customTaskId, setCustomTaskId] = useState(taskId?.toString() || '');
  
  // Send a test notification for the task
  const sendTestNotification = async () => {
    if (!taskId && !customTaskId) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest('/api/websocket/test-notification', 'POST', {
        taskId: taskId || customTaskId,
        progress: progress,
        // Don't change the status in basic mode
        status: debugMode ? 'in_progress' : undefined
      });
      
      setResult({
        success: true,
        message: 'Test notification sent',
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
  
  // The debug version has more detailed controls
  if (debugMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TerminalSquare className="h-5 w-5" />
            WebSocket Task Update Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="taskId">Task ID</Label>
              <Input
                id="taskId"
                value={customTaskId}
                onChange={(e) => setCustomTaskId(e.target.value)}
                placeholder="Enter task ID"
              />
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="progress">Progress</Label>
                <Badge variant="outline">{progress}%</Badge>
              </div>
              <Slider
                id="progress"
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>
            
            <Button 
              onClick={sendTestNotification} 
              disabled={isLoading || (!taskId && !customTaskId)}
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </Button>
            
            {result && (
              <div className={`p-3 rounded text-sm ${result.success ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'}`}>
                <p className="font-medium">{result.message}</p>
                {result.details && (
                  <pre className="mt-2 text-xs overflow-auto max-h-24">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Simple version just for testing in production
  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={sendTestNotification}
        disabled={isLoading || !taskId}
      >
        <BellRing className="h-3.5 w-3.5" />
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        {isLoading ? 'Sending...' : buttonLabel}
      </Button>
    </div>
  );
}