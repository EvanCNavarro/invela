import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TaskFix() {
  const [taskId, setTaskId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string; task?: any} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!taskId || isNaN(parseInt(taskId))) {
      setError('Please enter a valid task ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/fix-task-status/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'An error occurred while fixing the task');
      }
    } catch (err) {
      setError('Failed to communicate with the server. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Task Status Fix Tool</CardTitle>
          <CardDescription>
            Fix task status inconsistencies such as:
            <ul className="list-disc pl-5 mt-2">
              <li>KY3P tasks showing "Submitted" but 0% progress</li>
              <li>Open Banking tasks with incorrect submission status</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="taskId">Task ID</label>
              <Input 
                id="taskId" 
                value={taskId} 
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Enter the task ID (e.g., 883)"
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>{result.success ? 'Success' : 'Failed'}</AlertTitle>
                <AlertDescription>
                  {result.message}
                  {result.task && (
                    <div className="mt-2 text-sm">
                      <div><strong>Task ID:</strong> {result.task.id}</div>
                      <div><strong>Status:</strong> {result.task.status}</div>
                      <div><strong>Progress:</strong> {result.task.progress}%</div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Fix Task Status'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}