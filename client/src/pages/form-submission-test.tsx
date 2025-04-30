/**
 * Form Submission Test Page
 * 
 * This page allows testing the WebSocket-based form submission events
 * without having to go through the full form submission process.
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormSubmissionListener from '@/components/forms/FormSubmissionListener';
import { FormSubmissionEvent } from '@/hooks/use-form-submission-events';
import { useToast } from '@/hooks/use-toast';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';

export default function FormSubmissionTestPage() {
  const { toast } = useToast();
  const [taskId, setTaskId] = useState<number>(690); // Default to task ID 690
  const [formType, setFormType] = useState<string>('ky3p'); // Default to KY3P form type
  const [companyId, setCompanyId] = useState<number>(255); // Default to company ID 255
  
  // State for the success modal
  const [showModal, setShowModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionEvent | null>(null);
  
  // Use refs to prevent duplicate modals and toasts
  const modalShownRef = useRef(false);
  
  // Handle WebSocket form submission events
  const handleSuccess = (event: FormSubmissionEvent) => {
    console.log('Received WebSocket form submission success event:', event);
    
    // Prevent duplicate modals
    if (!modalShownRef.current) {
      setSubmissionResult(event);
      setShowModal(true);
      modalShownRef.current = true;
      
      toast({
        title: "Form Submitted Successfully",
        description: `Your ${formType} form has been successfully submitted.`,
        variant: "success",
      });
    }
  };
  
  const handleError = (event: FormSubmissionEvent) => {
    console.error('Received WebSocket form submission error event:', event);
    
    toast({
      title: "Form Submission Failed",
      description: event.error || "An error occurred during form submission.",
      variant: "destructive",
    });
  };
  
  const handleInProgress = (event: FormSubmissionEvent) => {
    console.log('Received WebSocket form submission in-progress event:', event);
    
    toast({
      title: "Form Submission In Progress",
      description: `Your ${formType} form is being processed...`,
      variant: "info",
    });
  };
  
  // Reset modal state when modal is closed
  const handleModalClose = () => {
    setShowModal(false);
    modalShownRef.current = false;
    
    // Optionally add a small delay before allowing new modals
    // This prevents rapid reopening if multiple events arrive
    setTimeout(() => {
      modalShownRef.current = false;
    }, 500);
  };
  
  // Send test events
  const sendTestEvent = async (eventType: 'success' | 'error' | 'in-progress') => {
    let endpoint = '';
    
    switch (eventType) {
      case 'success':
        endpoint = '/api/test/websocket/broadcast-form-submission';
        break;
      case 'error':
        endpoint = '/api/test/websocket/broadcast-form-error';
        break;
      case 'in-progress':
        endpoint = '/api/test/websocket/broadcast-in-progress';
        break;
    }
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: Number(taskId),
          formType,
          companyId: Number(companyId),
          errorMessage: eventType === 'error' ? 'Test error message' : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Test Event Sent",
          description: `Successfully sent ${eventType} test event`,
          variant: "success",
        });
      } else {
        toast({
          title: "Failed to Send Test Event",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending test event:', error);
      toast({
        title: "Error",
        description: "Failed to send test event",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Form Submission WebSocket Test</h1>
      
      {/* WebSocket Listener - This will listen for WebSocket events */}
      <FormSubmissionListener
        taskId={Number(taskId)}
        formType={formType}
        onSuccess={handleSuccess}
        onError={handleError}
        onInProgress={handleInProgress}
        showToasts={false} // We handle toasts manually above
      />
      
      {/* Configuration Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure the test parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskId">Task ID</Label>
              <Input
                id="taskId"
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(Number(e.target.value))}
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
                onChange={(e) => setCompanyId(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Events</CardTitle>
          <CardDescription>Trigger WebSocket events to test the form submission flow</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Click on the buttons below to send test events. The events will be broadcast via WebSocket
            and received by the FormSubmissionListener component.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-4">
          <Button
            onClick={() => sendTestEvent('success')}
            className="bg-green-600 hover:bg-green-700"
          >
            Test Success Event
          </Button>
          <Button
            onClick={() => sendTestEvent('error')}
            variant="destructive"
          >
            Test Error Event
          </Button>
          <Button
            onClick={() => sendTestEvent('in-progress')}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            Test In-Progress Event
          </Button>
        </CardFooter>
      </Card>
      
      {/* Success Modal - will be shown when a success event is received */}
      {submissionResult && (
        <SubmissionSuccessModal
          open={showModal}
          onClose={handleModalClose}
          title="Form Submitted Successfully"
          message={`Your ${formType} form has been successfully submitted.`}
          actions={submissionResult.actions || []}
          fileName={submissionResult.fileName}
          fileId={submissionResult.fileId}
          returnPath="/task-center"
          returnLabel="Return to Task Center"
          taskType={formType}
          onDownload={() => {
            // Handle download functionality if needed
            if (submissionResult.fileId) {
              window.open(`/api/files/${submissionResult.fileId}/download`, '_blank');
            }
          }}
        />
      )}
    </div>
  );
}