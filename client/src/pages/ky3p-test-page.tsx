/**
 * KY3P Test Page
 * 
 * This page is used to test the enhanced KY3P form service functionality.
 * It allows the user to enter a task ID and view the test form for that task.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import KY3PTestForm from '@/components/ky3p-test-form';
import { useToast } from '@/hooks/use-toast';

// Default task ID for testing
export default function KY3PTestPage() {
  const [taskId, setTaskId] = useState<number | null>(662);
  const [inputTaskId, setInputTaskId] = useState('662');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedTaskId = parseInt(inputTaskId, 10);
      if (isNaN(parsedTaskId)) {
        throw new Error('Task ID must be a number');
      }
      setTaskId(parsedTaskId);
      toast({
        title: 'Loading Task',
        description: `Now testing task ID: ${parsedTaskId}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Enhanced KY3P Form Service Test</h1>
      <p className="text-gray-600">
        This page tests the new enhanced KY3P form service with standardized string-based field keys and improved form clearing functionality.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Enter KY3P Task ID</CardTitle>
          <CardDescription>
            Enter a KY3P task ID to test the form service with that task. The default task ID is 662.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="taskId" className="block text-sm font-medium mb-1">
                Task ID
              </label>
              <Input
                id="taskId"
                type="text"
                value={inputTaskId}
                onChange={(e) => setInputTaskId(e.target.value)}
                placeholder="Enter task ID (e.g., 662)"
              />
            </div>
            <Button type="submit">Load Task</Button>
          </form>
        </CardContent>
      </Card>

      {taskId && (
        <div className="mt-8">
          <KY3PTestForm taskId={taskId} />
        </div>
      )}
    </div>
  );
}
