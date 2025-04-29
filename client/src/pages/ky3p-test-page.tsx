/**
 * KY3P Test Page
 * 
 * This page demonstrates the enhanced KY3P form service functionality
 * with standardized field keys and improved batch update operations.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import KY3PTestForm from '@/components/ky3p-test-form';
import { useToast } from '@/hooks/use-toast';

export default function KY3PTestPage() {
  const [taskId, setTaskId] = useState<number | null>(null);
  const [inputTaskId, setInputTaskId] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseInt(inputTaskId);
    
    if (isNaN(parsedId) || parsedId <= 0) {
      toast({
        title: 'Invalid Task ID',
        description: 'Please enter a valid task ID number.',
        variant: 'destructive'
      });
      return;
    }
    
    setTaskId(parsedId);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">KY3P Form Test</CardTitle>
          <CardDescription>
            Test the standardized KY3P form service with improved batch update and field clearing.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter KY3P Task ID"
              value={inputTaskId}
              onChange={(e) => setInputTaskId(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit">Load Form</Button>
          </form>
        </CardContent>
      </Card>
      
      <Separator className="my-6" />
      
      {taskId ? (
        <KY3PTestForm taskId={taskId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Task Selected</CardTitle>
            <CardDescription>
              Please enter a KY3P task ID above to load the form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The form will display once you enter a valid task ID.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
