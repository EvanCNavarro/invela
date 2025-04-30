/**
 * Form Submission Test Page
 * 
 * This page provides a simple testing interface for the form submission workflow.
 * It includes buttons to trigger different submission states and a display area to
 * show the received WebSocket events.
 */

import React, { useState, useEffect } from 'react';
import { FormSubmissionEvent, useFormSubmissionEvents } from '@/hooks/use-form-submission-events';
import FormSubmissionListener from '@/components/forms/FormSubmissionListener';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';

const FormSubmissionTestPage: React.FC = () => {
  // State for form fields
  const [taskId, setTaskId] = useState<number>(690); // Default to KY3P task
  const [formType, setFormType] = useState<string>('ky3p'); // Default to KY3P form
  const [companyId, setCompanyId] = useState<number>(255); // Default company
  const [lastEvent, setLastEvent] = useState<FormSubmissionEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<FormSubmissionEvent[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  
  // Initialize form submission event hook
  const { lastEvent: hookLastEvent, eventHistory: hookEventHistory } = useFormSubmissionEvents({
    taskId,
    formType,
    onSuccess: (event) => {
      console.log('[FormSubmissionTest] Success event received:', event);
      setShowSuccessModal(true);
      toast({
        title: 'Success',
        description: `Form submission successful: ${event.formType} for task ${event.taskId}`,
        variant: 'success',
      });
    },
    onError: (event) => {
      console.log('[FormSubmissionTest] Error event received:', event);
      toast({
        title: 'Error',
        description: `Form submission failed: ${event.error || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
    onInProgress: (event) => {
      console.log('[FormSubmissionTest] In Progress event received:', event);
      toast({
        title: 'In Progress',
        description: `Form submission in progress: ${event.formType} for task ${event.taskId}`,
        variant: 'info',
      });
    },
  });
  
  // Update our local state when hook state changes
  useEffect(() => {
    if (hookLastEvent) {
      setLastEvent(hookLastEvent);
    }
    if (hookEventHistory && hookEventHistory.length > 0) {
      setEventHistory(hookEventHistory);
    }
  }, [hookLastEvent, hookEventHistory]);
  
  // Test function to trigger form submission endpoint
  const testFormSubmission = async (status: 'success' | 'error' | 'in_progress') => {
    try {
      const response = await fetch(`/api/test/form-submission/broadcast?taskId=${taskId}&formType=${formType}&companyId=${companyId}&status=${status}`);
      const data = await response.json();
      
      console.log(`[FormSubmissionTest] Test endpoint response (${status}):`, data);
      
      if (!data.success) {
        throw new Error(data.message || 'Unknown error');
      }
      
      toast({
        title: 'Test Started',
        description: `Form submission test (${status}) triggered for task ${taskId}`,
      });
    } catch (error) {
      console.error('[FormSubmissionTest] Error triggering test:', error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to trigger test',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Form Submission Workflow Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">Test Controls</h2>
          
          <div className="space-y-4">
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
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">WebSocket Events</h2>
          
          <div className="border rounded-md p-4 h-64 overflow-y-auto bg-gray-50">
            {eventHistory.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No events received yet. Trigger a test to see events here.
              </div>
            ) : (
              <div className="space-y-4">
                {eventHistory.map((event, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md text-sm ${
                      event.status === 'success' ? 'bg-green-50 border border-green-200' : 
                      event.status === 'error' ? 'bg-red-50 border border-red-200' : 
                      'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="font-medium">
                      {event.status === 'success' ? '✅ Success' : 
                       event.status === 'error' ? '❌ Error' : 
                       '⏳ In Progress'}
                    </div>
                    <div className="mt-1 text-xs">
                      <div><strong>Task ID:</strong> {event.taskId}</div>
                      <div><strong>Form Type:</strong> {event.formType}</div>
                      <div><strong>Timestamp:</strong> {event.submissionDate || new Date().toISOString()}</div>
                      {event.error && (
                        <div className="text-red-600"><strong>Error:</strong> {event.error}</div>
                      )}
                      {event.unlockedTabs && event.unlockedTabs.length > 0 && (
                        <div><strong>Unlocked Tabs:</strong> {event.unlockedTabs.join(', ')}</div>
                      )}
                      {event.fileName && (
                        <div><strong>File:</strong> {event.fileName}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* Add the FormSubmissionListener component for real-time updates */}
      <FormSubmissionListener
        taskId={taskId}
        formType={formType}
        showToasts
      />
      
      {/* Success Modal */}
      {lastEvent && lastEvent.status === 'success' && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="Form Submission Successful"
          message={`Your ${formType.toUpperCase()} form has been successfully submitted.`}
          fileName={lastEvent.fileName}
          fileId={lastEvent.fileId}
          returnPath="/task-center"
          returnLabel="Return to Task Center"
          taskType={formType}
          actions={[
            {
              type: 'form_submitted',
              description: `${formType.toUpperCase()} form submitted successfully`
            },
            ...(lastEvent.unlockedTabs ? [
              {
                type: 'tabs_unlocked',
                description: `Unlocked tabs: ${lastEvent.unlockedTabs.join(', ')}`
              }
            ] : []),
            ...(lastEvent.fileName ? [
              {
                type: 'file_generated',
                description: `Generated submission file: ${lastEvent.fileName}`,
                fileId: lastEvent.fileId
              }
            ] : [])
          ]}
        />
      )}
    </div>
  );
};

export default FormSubmissionTestPage;