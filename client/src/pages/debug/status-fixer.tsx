import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

export default function TaskStatusFixer() {
  const [taskId, setTaskId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  
  const checkTask = async () => {
    if (!taskId || isNaN(parseInt(taskId))) {
      toast({
        title: "Invalid task ID",
        description: "Please enter a valid task ID",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/debug/task/${taskId}`);
      setResult(response.data);
      
      if (response.data?.hasSubmissionDate && response.data?.statusInfo?.current !== 'submitted') {
        toast({
          title: "Task status mismatch detected",
          description: "Task has submission date but status is not 'submitted'",
        });
      }
    } catch (error) {
      console.error('Error checking task:', error);
      toast({
        title: "Error",
        description: "Failed to check task status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fixTask = async () => {
    if (!taskId || isNaN(parseInt(taskId))) {
      toast({
        title: "Invalid task ID",
        description: "Please enter a valid task ID",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`/api/debug/force-submit/${taskId}`);
      
      toast({
        title: "Success",
        description: "Task status fixed successfully",
      });
      
      // Refresh task data
      await checkTask();
    } catch (error) {
      console.error('Error fixing task:', error);
      toast({
        title: "Error",
        description: "Failed to fix task status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Task Status Debugger</h1>
      
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Input
            type="text"
            placeholder="Enter task ID"
            value={taskId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskId(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={checkTask} disabled={loading}>
            {loading ? 'Checking...' : 'Check Task'}
          </Button>
          <Button onClick={fixTask} disabled={loading} variant="secondary">
            {loading ? 'Fixing...' : 'Force Submit'}
          </Button>
        </div>
      </div>
      
      {result && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Info</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">ID:</span> {result.task?.id}</div>
                  <div><span className="font-medium">Type:</span> {result.task?.task_type}</div>
                  <div><span className="font-medium">Status:</span> {result.task?.status}</div>
                  <div><span className="font-medium">Progress:</span> {result.task?.progress}%</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Submission Status</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">Has Submission Date:</span> {result.hasSubmissionDate ? 'Yes' : 'No'}</div>
                  {result.metadata?.submissionDate && (
                    <div><span className="font-medium">Submission Date:</span> {new Date(result.metadata.submissionDate).toLocaleString()}</div>
                  )}
                  <div><span className="font-medium">Has Submitted Flag:</span> {result.hasSubmittedFlag ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Is Terminal State:</span> {result.isTerminalState ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Metadata</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-gray-500">
              {result.hasSubmissionDate && result.task?.status !== 'submitted' ? (
                <span className="text-red-500 font-medium">Status Mismatch: Task has submission date but status is not 'submitted'</span>
              ) : (
                <span className="text-green-500 font-medium">Status is consistent with submission state</span>
              )}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}