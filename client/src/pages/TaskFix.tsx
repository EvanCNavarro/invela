import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Task Fix Page
 * 
 * This page provides an interface to fix tasks with inconsistent status/progress.
 * It allows fixing individual tasks or running a batch fix operation.
 */
export default function TaskFixPage() {
  const [taskId, setTaskId] = useState<string>('');
  const { toast } = useToast();

  // Query to load tasks with potential inconsistencies
  const { data: tasks, isLoading: tasksLoading } = useQuery({ 
    queryKey: ['/api/tasks'],
    select: (data) => {
      // Find tasks with potential inconsistencies
      return data.filter((task: any) => {
        // Status is "submitted" but progress is not 100%
        const isSubmittedNotComplete = task.status === 'submitted' && task.progress !== 100;
        
        // Progress is 100% but status is not "submitted"
        const isCompleteNotSubmitted = task.progress === 100 && task.status !== 'submitted';
        
        return isSubmittedNotComplete || isCompleteNotSubmitted;
      });
    }
  });

  // Mutation to fix a single task
  const fixTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/task-fix/${id}`, { method: 'GET' });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Task Fixed',
        description: data.message || 'Task status and progress synchronized successfully',
        variant: 'default',
      });
      // Invalidate task cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fix task',
        variant: 'destructive',
      });
    }
  });

  // Mutation to fix all inconsistent tasks in batch
  const fixAllTasksMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      const response = await apiRequest('/api/task-fix/batch', {
        method: 'POST',
        data: { taskIds }
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Batch Fix Complete',
        description: `Fixed ${data.results.filter((r: any) => r.success).length} tasks successfully`,
        variant: 'default',
      });
      // Invalidate task cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform batch fix',
        variant: 'destructive',
      });
    }
  });

  // Handle fixing a specific task
  const handleFixTask = (id: string) => {
    fixTaskMutation.mutate(id);
  };

  // Handle fixing all inconsistent tasks
  const handleFixAllTasks = () => {
    if (!tasks || tasks.length === 0) return;
    
    const taskIds = tasks.map((task: any) => task.id);
    fixAllTasksMutation.mutate(taskIds);
  };

  // Handle the "Fix" button for the task ID input
  const handleFixInputTask = () => {
    if (!taskId) {
      toast({
        title: 'Error',
        description: 'Please enter a task ID',
        variant: 'destructive',
      });
      return;
    }
    
    handleFixTask(taskId);
  };

  // Determine if we have inconsistent tasks
  const hasInconsistentTasks = tasks && tasks.length > 0;

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Task Fix Tool</h1>
        <Link href="/">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Fix Individual Task</CardTitle>
          <CardDescription>
            Enter a task ID to fix status/progress inconsistencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter task ID"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="max-w-md"
            />
            <Button 
              onClick={handleFixInputTask}
              disabled={fixTaskMutation.isPending}
            >
              {fixTaskMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing...</>
              ) : (
                <>Fix Task</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks with Inconsistent Status/Progress</CardTitle>
          <CardDescription>
            These tasks have either status="submitted" but progress≠100%, or progress=100% but status≠"submitted"
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasInconsistentTasks ? (
            <Alert className="bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>No Inconsistencies Found</AlertTitle>
              <AlertDescription>
                All tasks have consistent status and progress values.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                {tasks.map((task: any) => (
                  <div key={task.id} className="border rounded-md p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-lg">
                        Task #{task.id}: {task.title}
                      </h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={task.status === 'submitted' ? 'default' : 'outline'}>
                          Status: {task.status}
                        </Badge>
                        <Badge variant={task.progress === 100 ? 'success' : 'outline'}>
                          Progress: {task.progress}%
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {task.status === 'submitted' && task.progress !== 100 ? (
                          <div className="flex items-center text-amber-600">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Task marked as submitted but progress is not 100%
                          </div>
                        ) : task.progress === 100 && task.status !== 'submitted' ? (
                          <div className="flex items-center text-amber-600">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Task progress is 100% but not marked as submitted
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleFixTask(task.id.toString())}
                      disabled={fixTaskMutation.isPending}
                      size="sm"
                    >
                      {fixTaskMutation.isPending && fixTaskMutation.variables === task.id.toString() ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing...</>
                      ) : (
                        <>Fix <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button 
                  onClick={handleFixAllTasks} 
                  className="w-full"
                  disabled={fixAllTasksMutation.isPending}
                >
                  {fixAllTasksMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing All Tasks...</>
                  ) : (
                    <>Fix All {tasks.length} Tasks</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            This tool ensures that tasks with status="submitted" always have progress=100% 
            and tasks with progress=100% are always marked as "submitted".
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}