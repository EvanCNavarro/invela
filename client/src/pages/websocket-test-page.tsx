/**
 * WebSocket Test Page
 * 
 * This page provides a simple UI for testing WebSocket events,
 * particularly form submission events. It allows testing the 
 * global deduplication mechanism across components.
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormSubmissionListener } from '@/components/forms/FormSubmissionListener';
import { useFormSubmissionEvents } from '@/hooks/use-form-submission-events';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  testFormSubmissionSuccess,
  testFormSubmissionError,
  testFormSubmissionInProgress
} from '@/utils/test-form-submission';

export default function WebSocketTestPage() {
  const [taskId, setTaskId] = useState<number>(690);
  const [formType, setFormType] = useState<string>('kyb');
  const [progress, setProgress] = useState<number>(50);
  const [errorMessage, setErrorMessage] = useState<string>('Test form submission error');
  
  // Setup form submission events listener
  const { lastEvent: hookEvent } = useFormSubmissionEvents({
    taskId,
    formType,
    onSuccess: (event) => {
      console.log('useFormSubmissionEvents onSuccess called with:', event);
    },
    onError: (event) => {
      console.log('useFormSubmissionEvents onError called with:', event);
    },
    onInProgress: (event) => {
      console.log('useFormSubmissionEvents onInProgress called with:', event);
    }
  });
  
  // Component event handlers for FormSubmissionListener
  const handleSuccess = (event: any) => {
    console.log('FormSubmissionListener onSuccess called with:', event);
  };
  
  const handleError = (event: any) => {
    console.log('FormSubmissionListener onError called with:', event);
  };
  
  const handleInProgress = (event: any) => {
    console.log('FormSubmissionListener onInProgress called with:', event);
  };
  
  return (
    <div className="container py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>WebSocket Form Submission Test</CardTitle>
          <CardDescription>
            Test WebSocket form submission events and verify deduplication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="taskId">Task ID</Label>
              <Input 
                id="taskId" 
                type="number" 
                value={taskId} 
                onChange={(e) => setTaskId(parseInt(e.target.value))} 
              />
            </div>
            <div>
              <Label htmlFor="formType">Form Type</Label>
              <Input 
                id="formType" 
                value={formType} 
                onChange={(e) => setFormType(e.target.value)} 
              />
            </div>
          </div>
          
          <Tabs defaultValue="success">
            <TabsList className="mb-4">
              <TabsTrigger value="success">Success</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
              <TabsTrigger value="progress">In Progress</TabsTrigger>
            </TabsList>
            
            <TabsContent value="success">
              <Button 
                onClick={() => testFormSubmissionSuccess(taskId, formType)}
                className="w-full"
              >
                Test Success Event
              </Button>
            </TabsContent>
            
            <TabsContent value="error">
              <div className="mb-4">
                <Label htmlFor="errorMessage">Error Message</Label>
                <Input 
                  id="errorMessage" 
                  value={errorMessage} 
                  onChange={(e) => setErrorMessage(e.target.value)} 
                />
              </div>
              <Button 
                onClick={() => testFormSubmissionError(taskId, formType, errorMessage)}
                className="w-full"
                variant="destructive"
              >
                Test Error Event
              </Button>
            </TabsContent>
            
            <TabsContent value="progress">
              <div className="mb-4">
                <Label htmlFor="progress">Progress (0-100)</Label>
                <Input 
                  id="progress" 
                  type="number" 
                  min="0"
                  max="100"
                  value={progress} 
                  onChange={(e) => setProgress(parseInt(e.target.value))} 
                />
              </div>
              <Button 
                onClick={() => testFormSubmissionInProgress(taskId, formType, progress)}
                className="w-full"
                variant="secondary"
              >
                Test In-Progress Event
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            This page includes both FormSubmissionListener and useFormSubmissionEvents to verify that
            events are not duplicated between these components. Check the console for logs.
          </p>
        </CardFooter>
      </Card>
      
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Form Submission Listener</CardTitle>
            <CardDescription>
              Using FormSubmissionListener component
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              Listening for events for task {taskId} ({formType})
            </p>
            <FormSubmissionListener
              taskId={taskId}
              formType={formType}
              onSuccess={handleSuccess}
              onError={handleError}
              onInProgress={handleInProgress}
              showToasts={false}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Form Submission Hook</CardTitle>
            <CardDescription>
              Using useFormSubmissionEvents hook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              Listening for events for task {taskId} ({formType})
            </p>
            {hookEvent ? (
              <div className="text-sm bg-gray-100 p-3 rounded-md">
                <div><strong>Status:</strong> {hookEvent.status}</div>
                <div><strong>TaskID:</strong> {hookEvent.taskId}</div>
                <div><strong>FormType:</strong> {hookEvent.formType}</div>
                <div><strong>Time:</strong> {new Date(hookEvent.timestamp).toLocaleTimeString()}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No events received yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}