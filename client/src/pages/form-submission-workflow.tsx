/**
 * Form Submission Workflow Page
 * 
 * A complete demonstration page for form submission using WebSockets
 * This page shows the entire form submission lifecycle:
 * 1. Submit form
 * 2. Show in-progress state
 * 3. Handle success/error responses
 * 4. Display appropriate UI feedback
 * 5. Update form state based on response
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import FormSubmissionListener, { FormSubmissionEvent } from '@/components/forms/FormSubmissionListener';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';
import { unifiedWebSocketService } from '@/services/websocket-unified';

export default function FormSubmissionWorkflowPage() {
  // Form state
  const [taskId, setTaskId] = useState<number>(690); // Default to a known KY3P task
  const [companyId, setCompanyId] = useState<number>(255); // Default to a known company
  const [formType, setFormType] = useState<string>('ky3p');
  const [formData, setFormData] = useState<Record<string, any>>({
    field1: 'Test Value 1',
    field2: 'Test Value 2',
    agreement_confirmation: true,
    submissionDate: new Date().toISOString()
  });
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  
  // Unified WebSocket integration
  const { isConnected } = useUnifiedWebSocket();
  
  // Reset form to initial state
  const resetForm = useCallback(() => {
    setIsSubmitting(false);
    setSubmissionComplete(false);
    setLastEvent(null);
    setShowSuccessModal(false);
    
    // Reset form data but keep the task/company IDs
    setFormData({
      field1: 'Test Value 1',
      field2: 'Test Value 2',
      agreement_confirmation: true,
      submissionDate: new Date().toISOString()
    });
    
    toast({
      title: 'Form Reset',
      description: 'Form has been reset to initial state.',
    });
  }, []);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      toast({
        title: 'Submitting Form',
        description: 'Starting form submission process...',
      });
      
      // Add task ID and form type to the form data
      const submissionData = {
        ...formData,
        taskId,
        taskType: formType,
        companyId,
        timestamp: new Date().toISOString(),
        agreement_confirmation: true,
        explicitSubmission: true
      };
      
      // Submit form via standard API endpoint
      const response = await fetch(`/api/${formType}/submit/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: `${formType}_submission_${taskId}_${Date.now()}.json`,
          formData: submissionData,
          taskId,
          explicitSubmission: true
        })
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Note: We don't need to manually update UI state here as the WebSocket events
      // will trigger the appropriate state changes via FormSubmissionListener
      
      console.log('Form submission initiated successfully');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error toast
      toast({
        title: 'Form Submission Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      
      // Reset submission state
      setIsSubmitting(false);
    }
  }, [taskId, formType, companyId, formData]);
  
  // Handle submission success event from WebSocket
  const handleSubmissionSuccess = useCallback((event: any) => {
    console.log('Submission success event received:', event);
    
    // Update state
    setIsSubmitting(false);
    setSubmissionComplete(true);
    setLastEvent(event);
    setShowSuccessModal(true);
    
    // No need to show toast as FormSubmissionListener will handle that
  }, []);
  
  // Handle submission error event from WebSocket
  const handleSubmissionError = useCallback((event: any) => {
    console.log('Submission error event received:', event);
    
    // Update state
    setIsSubmitting(false);
    setSubmissionComplete(false);
    setLastEvent(event);
    
    // No need to show toast as FormSubmissionListener will handle that
  }, []);
  
  // Handle submission in-progress event from WebSocket
  const handleSubmissionInProgress = useCallback((event: any) => {
    console.log('Submission in-progress event received:', event);
    
    // Update state
    setIsSubmitting(true);
    setSubmissionComplete(false);
    setLastEvent(event);
    
    // No need to show toast as FormSubmissionListener will handle that
  }, []);
  
  // Test form submission via the test API
  const testFormSubmission = async (status: 'success' | 'error' | 'in_progress') => {
    try {
      const response = await fetch(
        `/api/test/form-submission/broadcast?taskId=${taskId}&formType=${formType}&companyId=${companyId}&status=${status}`
      );
      
      const data = await response.json();
      console.log(`Test form submission (${status}) response:`, data);
      
      toast({
        title: 'Test Triggered',
        description: `Form submission test (${status}) triggered for task ${taskId}`,
      });
    } catch (error) {
      console.error('Error triggering test form submission:', error);
      
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to trigger test',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Form Submission Workflow</h1>
      
      <Tabs defaultValue="submit" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="submit">Submit Form</TabsTrigger>
          <TabsTrigger value="test">Test Events</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="submit">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Form</CardTitle>
                <CardDescription>
                  Complete this form and submit it to test the form submission workflow
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="companyId">Company ID</Label>
                      <Input
                        id="companyId"
                        type="number"
                        value={companyId}
                        onChange={(e) => setCompanyId(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="formType">Form Type</Label>
                    <Select 
                      value={formType} 
                      onValueChange={setFormType}
                    >
                      <SelectTrigger id="formType">
                        <SelectValue placeholder="Select form type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kyb">KYB</SelectItem>
                        <SelectItem value="ky3p">KY3P</SelectItem>
                        <SelectItem value="open_banking">Open Banking</SelectItem>
                        <SelectItem value="card">Card Industry Questionnaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="field1">Sample Field 1</Label>
                    <Input
                      id="field1"
                      value={formData.field1}
                      onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="field2">Sample Field 2</Label>
                    <Input
                      id="field2"
                      value={formData.field2}
                      onChange={(e) => setFormData({ ...formData, field2: e.target.value })}
                    />
                  </div>
                  
                  <div className="pt-4 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={isSubmitting}
                    >
                      Reset
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={isSubmitting || submissionComplete}
                      className="ml-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Submitting...
                        </>
                      ) : submissionComplete ? (
                        'Submitted'
                      ) : (
                        'Submit Form'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>
                  Real-time status of your form submission
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${
                      isSubmitting 
                        ? 'bg-blue-500 animate-pulse' 
                        : submissionComplete 
                          ? 'bg-green-500' 
                          : 'bg-gray-200'
                    }`} />
                    <span className="font-medium">
                      {isSubmitting 
                        ? 'Submission in progress...' 
                        : submissionComplete 
                          ? 'Submission complete!' 
                          : 'Not submitted'}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  {lastEvent && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Last Event:</h3>
                      <div className={`p-3 rounded-md text-sm ${
                        lastEvent.status === 'success' ? 'bg-green-50 border border-green-200' : 
                        lastEvent.status === 'error' ? 'bg-red-50 border border-red-200' : 
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="font-medium">
                          {lastEvent.status === 'success' ? '✅ Success' : 
                          lastEvent.status === 'error' ? '❌ Error' : 
                          '⏳ In Progress'}
                        </div>
                        <div className="mt-1 text-xs">
                          <div><strong>Task ID:</strong> {lastEvent.taskId}</div>
                          <div><strong>Form Type:</strong> {lastEvent.formType}</div>
                          <div><strong>Timestamp:</strong> {lastEvent.submissionDate || new Date().toISOString()}</div>
                          {lastEvent.error && (
                            <div className="text-red-600"><strong>Error:</strong> {lastEvent.error}</div>
                          )}
                          {lastEvent.unlockedTabs && lastEvent.unlockedTabs.length > 0 && (
                            <div><strong>Unlocked Tabs:</strong> {lastEvent.unlockedTabs.join(', ')}</div>
                          )}
                          {lastEvent.fileName && (
                            <div><strong>File:</strong> {lastEvent.fileName}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test WebSocket Events</CardTitle>
              <CardDescription>
                Trigger different form submission events to test the UI
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Use these buttons to simulate different form submission events without actually submitting a form.
                  This is useful for testing how the UI responds to different scenarios.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    variant="default" 
                    onClick={() => testFormSubmission('success')}
                  >
                    Test Success
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={() => testFormSubmission('error')}
                  >
                    Test Error
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => testFormSubmission('in_progress')}
                  >
                    Test In Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events">
          {/* This tab will be populated by events from the FormSubmissionListener */}
          <Card>
            <CardHeader>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>
                WebSocket events received from the server
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div id="event-log" className="h-64 overflow-y-auto p-4 border rounded-md bg-gray-50">
                {lastEvent ? (
                  <div className="space-y-4">
                    <div className={`p-3 rounded-md text-sm ${
                      lastEvent.status === 'success' ? 'bg-green-50 border border-green-200' : 
                      lastEvent.status === 'error' ? 'bg-red-50 border border-red-200' : 
                      'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="font-medium">
                        {lastEvent.status === 'success' ? '✅ Success' : 
                        lastEvent.status === 'error' ? '❌ Error' : 
                        '⏳ In Progress'}
                      </div>
                      <div className="mt-1 text-xs">
                        <div><strong>Task ID:</strong> {lastEvent.taskId}</div>
                        <div><strong>Form Type:</strong> {lastEvent.formType}</div>
                        <div><strong>Timestamp:</strong> {lastEvent.submissionDate || new Date().toISOString()}</div>
                        {lastEvent.error && (
                          <div className="text-red-600"><strong>Error:</strong> {lastEvent.error}</div>
                        )}
                        {lastEvent.unlockedTabs && lastEvent.unlockedTabs.length > 0 && (
                          <div><strong>Unlocked Tabs:</strong> {lastEvent.unlockedTabs.join(', ')}</div>
                        )}
                        {lastEvent.fileName && (
                          <div><strong>File:</strong> {lastEvent.fileName}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    No events received yet. Submit a form or trigger a test to see events here.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add the FormSubmissionListener component for real-time updates */}
      <FormSubmissionListener
        taskId={taskId}
        formType={formType}
        onSuccess={handleSubmissionSuccess}
        onError={handleSubmissionError}
        onInProgress={handleSubmissionInProgress}
        showToasts={false} // Disable toasts here since we're showing a modal
      />
      
      {/* Success Modal */}
      {lastEvent && lastEvent.status === 'success' && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Form Submission Successful"
          message={`Your ${formType} form has been successfully submitted.`}
          fileName={lastEvent.fileName as string | undefined}
          fileId={Number(lastEvent.fileId) || undefined}
          returnPath="/task-center"
          returnLabel="Return to Task Center"
          taskType={formType}
          // Add File Vault button if we have a file
          showFileVaultButton={Boolean(lastEvent.fileName && lastEvent.fileId)}
          fileVaultPath="/file-vault"
          fileVaultLabel="View in File Vault"
          actions={[
            {
              type: 'form_submitted',
              description: `${formType.toUpperCase()} form submitted successfully`
            },
            ...(lastEvent.unlockedTabs && Array.isArray(lastEvent.unlockedTabs) && lastEvent.unlockedTabs.length > 0 ? [
              {
                type: 'tabs_unlocked',
                description: `Unlocked tabs: ${lastEvent.unlockedTabs.join(', ')}`
              }
            ] : []),
            ...(lastEvent.fileName ? [
              {
                type: 'file_generated',
                description: `Generated submission file: ${lastEvent.fileName as string}`,
                fileId: Number(lastEvent.fileId) || undefined
              }
            ] : [])
          ]}
        />
      )}
    </div>
  );
}