/**
 * WebSocket Test Page
 * 
 * This page provides a simple UI for testing WebSocket functionality for form submission events.
 * It includes controls to test success, error, and in-progress events.
 */

import React, { useState } from 'react';
import { 
  testFormSubmissionBroadcast, 
  testFormErrorBroadcast, 
  testFormInProgressBroadcast,
  sendWebSocketTestMessage
} from '../services/formSubmissionService';
import { Textarea } from '@/components/ui/textarea';
import FormSubmissionListener from '../components/forms/FormSubmissionListener';
import { FormSubmissionEvent } from '../hooks/use-form-submission-events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const WebSocketTestPage: React.FC = () => {
  // State for test parameters and results
  const [taskId, setTaskId] = useState<number>(620);
  const [formType, setFormType] = useState<string>('kyb');
  const [companyId, setCompanyId] = useState<number>(254);
  const [errorMessage, setErrorMessage] = useState<string>('Test error message');
  const [result, setResult] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [eventType, setEventType] = useState<'success' | 'error' | 'in_progress' | null>(null);
  
  // Test a successful form submission broadcast
  const handleSuccessTest = async () => {
    setResult('Sending success test...');
    try {
      const response = await testFormSubmissionBroadcast(taskId, formType, companyId);
      setResult(`Success test sent: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`Error sending success test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Test an error form submission broadcast
  const handleErrorTest = async () => {
    setResult('Sending error test...');
    try {
      const response = await testFormErrorBroadcast(taskId, formType, companyId, errorMessage);
      setResult(`Error test sent: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`Error sending error test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Test an in-progress form submission broadcast
  const handleInProgressTest = async () => {
    setResult('Sending in-progress test...');
    try {
      const response = await testFormInProgressBroadcast(taskId, formType, companyId);
      setResult(`In-progress test sent: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`Error sending in-progress test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Event handlers for FormSubmissionListener
  const handleSuccess = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    setEventType('success');
  };
  
  const handleError = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    setEventType('error');
  };
  
  const handleInProgress = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    setEventType('in_progress');
  };
  
  // State for custom message
  const [messageType, setMessageType] = useState<string>('custom_message');
  const [messagePayload, setMessagePayload] = useState<string>('{"key": "value"}');
  
  // Send a custom WebSocket message
  const handleCustomMessage = async () => {
    setResult('Sending custom message...');
    try {
      // Parse the JSON payload
      let payload;
      try {
        payload = JSON.parse(messagePayload);
      } catch (error) {
        setResult(`Invalid JSON payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      const response = await sendWebSocketTestMessage(messageType, payload);
      setResult(`Custom message sent: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`Error sending custom message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Form Submission Test</CardTitle>
          <CardDescription>
            Test WebSocket functionality for form submission events. This page allows you to test the connection
            and verify that form submission events are properly broadcasted and received.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Test Parameters Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskId">Task ID</Label>
              <Input 
                id="taskId" 
                type="number" 
                value={taskId} 
                onChange={(e) => setTaskId(parseInt(e.target.value, 10))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="formType">Form Type</Label>
              <Input 
                id="formType" 
                value={formType} 
                onChange={(e) => setFormType(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID</Label>
              <Input 
                id="companyId" 
                type="number" 
                value={companyId} 
                onChange={(e) => setCompanyId(parseInt(e.target.value, 10))} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="errorMessage">Error Message (for error test)</Label>
              <Input 
                id="errorMessage" 
                value={errorMessage} 
                onChange={(e) => setErrorMessage(e.target.value)} 
              />
            </div>
          </div>
          
          {/* Test Actions */}
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Button onClick={handleSuccessTest} variant="default" className="bg-green-600 hover:bg-green-700">
              Test Success Event
            </Button>
            
            <Button onClick={handleErrorTest} variant="destructive">
              Test Error Event
            </Button>
            
            <Button onClick={handleInProgressTest}>
              Test In-Progress Event
            </Button>
          </div>
          
          {/* Result display */}
          {result && (
            <div className="mt-4 p-4 bg-muted rounded">
              <p className="text-sm font-mono whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Custom Message Test */}
      <Card>
        <CardHeader>
          <CardTitle>Custom WebSocket Message Test</CardTitle>
          <CardDescription>
            Send a custom WebSocket message with a specified type and payload.
            This can be used to test any kind of WebSocket communication.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="messageType">Message Type</Label>
              <Input 
                id="messageType" 
                value={messageType} 
                onChange={(e) => setMessageType(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="messagePayload">Message Payload (JSON)</Label>
              <Textarea 
                id="messagePayload" 
                rows={5}
                value={messagePayload} 
                onChange={(e) => setMessagePayload(e.target.value)} 
                className="font-mono text-sm"
              />
            </div>
          </div>
          
          {/* Custom message action */}
          <div className="flex justify-center mt-4">
            <Button onClick={handleCustomMessage} variant="outline">
              Send Custom Message
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Event listener and display */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Event Listener</CardTitle>
          <CardDescription>
            This section displays form submission events received from the WebSocket connection.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* The listener component */}
          <FormSubmissionListener
            taskId={taskId}
            formType={formType}
            onSuccess={handleSuccess}
            onError={handleError}
            onInProgress={handleInProgress}
            showToasts={true}
          >
            {/* Empty children, just using callbacks */}
          </FormSubmissionListener>
          
          {/* Event display */}
          {lastEvent ? (
            <div className="mt-4">
              {eventType === 'success' && (
                <Alert className="border-green-600 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Success Event Received</AlertTitle>
                  <AlertDescription>
                    Received success event for task {lastEvent.taskId}
                  </AlertDescription>
                </Alert>
              )}
              
              {eventType === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Event Received</AlertTitle>
                  <AlertDescription>
                    {lastEvent.error || 'Unknown error'}
                  </AlertDescription>
                </Alert>
              )}
              
              {eventType === 'in_progress' && (
                <Alert>
                  <div className="animate-spin mr-2">
                    {/* Use an appropriate loading icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </div>
                  <AlertTitle>In Progress Event Received</AlertTitle>
                  <AlertDescription>
                    Form submission is in progress for task {lastEvent.taskId}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4 p-4 bg-muted rounded">
                <p className="font-bold mb-2">Event Details:</p>
                <pre className="text-xs overflow-auto max-h-60">
                  {JSON.stringify(lastEvent, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No events received yet. Try one of the test actions above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketTestPage;