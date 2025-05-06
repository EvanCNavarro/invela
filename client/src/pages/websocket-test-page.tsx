/**
 * WebSocket Test Page
 * 
 * This page is used to test WebSocket functionality, specifically for
 * form submission and task update events. It demonstrates how the
 * FormSubmissionListener responds to various event types.
 */

import React, { useState } from 'react';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import WebSocketTester from '@/components/WebSocketTester';
import FormSubmissionListener, { FormSubmissionEvent } from '@/components/forms/FormSubmissionListener';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

// WebSocket test page
export default function WebSocketTestPage() {
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [showListener, setShowListener] = useState(true);

  // Handle different form submission events
  const handleSuccess = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    toast({
      title: 'Form submission successful',
      description: 'The form was submitted successfully',
      variant: 'success',
    });
  };

  const handleError = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    toast({
      title: 'Form submission failed',
      description: event.error || 'Unknown error',
      variant: 'destructive',
    });
  };

  const handleInProgress = (event: FormSubmissionEvent) => {
    setLastEvent(event);
    toast({
      title: 'Form submission in progress',
      description: 'Please wait while the form is being processed',
      variant: 'default',
    });
  };

  // Toggle the listener component for testing
  const toggleListener = () => {
    setShowListener(prev => !prev);
  };

  // Reset the last event
  const resetLastEvent = () => {
    setLastEvent(null);
  };

  return (
    <Container className="py-8">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebSocket Testing</h1>
          <p className="text-muted-foreground mb-4">
            This page demonstrates WebSocket functionality, focusing on form submission and task update events.
          </p>

          <Alert>
            <AlertTitle>Testing Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Use the WebSocket Tester below to send test messages</li>
                <li>The FormSubmissionListener will intercept messages for task ID 999</li>
                <li>Watch for toast notifications when events are received</li>
                <li>The Last Received Event card will show event details</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button variant={showListener ? "default" : "outline"} onClick={toggleListener}>
            {showListener ? 'Disable Listener' : 'Enable Listener'}
          </Button>
          <Button variant="outline" onClick={resetLastEvent} disabled={!lastEvent}>
            Clear Last Event
          </Button>
        </div>

        {showListener && (
          <FormSubmissionListener
            taskId={999}
            formType="kyb"
            onSuccess={handleSuccess}
            onError={handleError}
            onInProgress={handleInProgress}
            showToasts={false}
          />
        )}

        <Separator />
        
        <div className="grid gap-8 md:grid-cols-2">
          <WebSocketTester />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Last Received Event
                {lastEvent && (
                  <Badge variant={
                    lastEvent.status === 'success' ? 'success' :
                    lastEvent.status === 'error' ? 'destructive' : 'default'
                  }>
                    {lastEvent.status}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                The last event received by the FormSubmissionListener
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lastEvent ? (
                <pre className="bg-muted p-4 rounded-md text-xs overflow-auto h-80">
                  {JSON.stringify(lastEvent, null, 2)}
                </pre>
              ) : (
                <div className="text-center text-muted-foreground py-8 h-80 flex items-center justify-center">
                  No events received yet
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              {lastEvent && (
                <span>Received at: {new Date().toLocaleTimeString()}</span>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Container>
  );
}