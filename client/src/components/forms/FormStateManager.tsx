/**
 * Form State Manager
 * 
 * Manages the state transitions of a form throughout its lifecycle:
 * - Editing
 * - Submitting
 * - Submitted (read-only)
 * - Error states
 * 
 * Provides clear visual indicators for each state and handles form
 * submission with proper UI feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SubmissionSuccessModal } from '../modals/SubmissionSuccessModal';
import { notify } from '@/providers/notification-provider';
import submissionTracker from '@/utils/submission-tracker';
import rollbackManager from '@/utils/rollback-manager';

export type FormState = 
  | 'idle'
  | 'editing'
  | 'validating'
  | 'submitting'
  | 'submitted'
  | 'error'
  | 'read-only';

type FormStateManagerProps = {
  taskId: number;
  taskType: string;
  children: React.ReactNode;
  onSubmit: (formData: any) => Promise<{success: boolean; message: string; fileId?: string;}>;
  onReset?: () => void;
  initialState?: FormState;
  formData: any;
  isValid: boolean;
  showSuccessModal?: boolean;
  successModalProps?: Record<string, any>;
  preventSubmitWhenErrors?: boolean;
  disabled?: boolean;
  showSubmitButton?: boolean;
  customButtons?: React.ReactNode;
  readOnly?: boolean;
  className?: string;
};

export function FormStateManager({
  taskId,
  taskType,
  children,
  onSubmit,
  onReset,
  initialState = 'idle',
  formData,
  isValid,
  showSuccessModal = true,
  successModalProps = {},
  preventSubmitWhenErrors = true,
  disabled = false,
  showSubmitButton = true,
  customButtons,
  readOnly = false,
  className = '',
}: FormStateManagerProps) {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    fileId: number | null;
    message: string | null;
    timestamp: string | Date | null;
  }>({ fileId: null, message: null, timestamp: null });
  const [showSuccessModalState, setShowSuccessModalState] = useState(false);
  const { toast } = useToast();
  const hasBeenMounted = useRef(false);
  
  // Handle initial state based on props
  useEffect(() => {
    if (!hasBeenMounted.current) {
      hasBeenMounted.current = true;
      
      if (readOnly) {
        setFormState('read-only');
      } else if (initialState !== 'idle') {
        setFormState(initialState);
      } else {
        setFormState('editing');
      }
    }
  }, [initialState, readOnly]);
  
  // Handle submission
  const handleSubmit = async () => {
    // Don't allow submission if already submitting
    if (formState === 'submitting') {
      return;
    }
    
    // Don't allow submission if there are validation errors
    if (preventSubmitWhenErrors && !isValid) {
      notify.error('Validation Failed', 'Please correct errors before submitting');
      setFormState('error');
      return;
    }
    
    try {
      // Start tracking the submission
      submissionTracker.startTracking(taskId, taskType);
      submissionTracker.trackEvent('Starting form submission process');
      
      // Update state
      setFormState('submitting');
      setError(null);
      
      // Submit the form
      submissionTracker.trackEvent('Calling onSubmit handler');
      const result = await onSubmit(formData);
      
      // Handle success
      if (result.success) {
        submissionTracker.trackEvent('Submission succeeded', {
          fileId: result.fileId,
          message: result.message,
        });
        
        setFormState('submitted');
        setSuccess(true);
        setSubmissionResult({
          fileId: result.fileId ? Number(result.fileId) : null,
          message: result.message || 'Submission successful',
          timestamp: new Date(),
        });
        
        // Show success notification
        toast({
          title: 'Form Submitted Successfully',
          description: result.message || 'Your form has been submitted successfully.',
          variant: 'success',
        });
        
        // Show success modal if enabled
        if (showSuccessModal) {
          setShowSuccessModalState(true);
        }
        
        // Cancel any pending rollbacks since submission succeeded
        if (rollbackManager.hasPendingRollbacks(taskId)) {
          rollbackManager.cancelAllForTask(taskId);
        }
        
        // Stop tracking with success status
        submissionTracker.stopTracking();
      } else {
        // Handle failed submission
        submissionTracker.trackEvent('Submission returned error', {
          message: result.message,
        }, true);
        
        // Set error state
        setFormState('error');
        setError(result.message || 'An unknown error occurred');
        
        // Show error notification
        toast({
          title: 'Submission Failed',
          description: result.message || 'An error occurred while submitting the form.',
          variant: 'info',
        });
        
        // Stop tracking with error code
        submissionTracker.stopTracking(1, result.message);
        
        // Check if we need to execute rollbacks
        if (rollbackManager.hasPendingRollbacks(taskId)) {
          await rollbackManager.executeRollbackForTask(taskId);
        }
      }
    } catch (err) {
      // Handle exception
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      submissionTracker.trackEvent('Exception during submission', {
        error: errorMessage,
      }, true);
      
      // Update state
      setFormState('error');
      setError(errorMessage);
      
      // Show error notification
      toast({
        title: 'Submission Error',
        description: errorMessage,
        variant: 'warning',
      });
      
      // Stop tracking with error code
      submissionTracker.stopTracking(2, errorMessage);
      
      // Execute rollbacks if any
      if (rollbackManager.hasPendingRollbacks(taskId)) {
        await rollbackManager.executeRollbackForTask(taskId);
      }
    }
  };
  
  // Handle reset
  const handleReset = () => {
    // Reset form state
    setFormState('editing');
    setError(null);
    setSuccess(false);
    
    // Call onReset if provided
    if (onReset) {
      onReset();
    }
  };
  
  // Render submit button based on form state
  const renderSubmitButton = () => {
    if (!showSubmitButton) {
      return null;
    }
    
    if (formState === 'read-only' || formState === 'submitted') {
      return null;
    }
    
    if (formState === 'submitting') {
      return (
        <Button disabled className="relative">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </Button>
      );
    }
    
    return (
      <Button 
        onClick={handleSubmit} 
        disabled={disabled || (preventSubmitWhenErrors && !isValid)}
        className="relative"
      >
        {formState === 'error' ? 'Try Again' : 'Submit'}
        {formState === 'error' && <AlertCircle className="ml-2 h-4 w-4" />}
      </Button>
    );
  };
  
  // Render cancel button
  const renderCancelButton = () => {
    if (formState === 'read-only' || formState === 'submitted') {
      return null;
    }
    
    return (
      <Button 
        variant="outline" 
        onClick={handleReset} 
        disabled={formState === 'submitting' || disabled}
        className="ml-2"
      >
        Cancel
      </Button>
    );
  };
  
  // Handle success modal close
  const handleSuccessModalClose = () => {
    setShowSuccessModalState(false);
  };
  
  return (
    <div className={`form-state-manager form-state-${formState} ${className}`}>
      {/* Apply read-only class to children if in read-only or submitted state */}
      <div className={`form-content ${
        (formState === 'read-only' || formState === 'submitted') ? 'form-read-only' : ''
      }`}>
        {children}
      </div>
      
      {/* Error message */}
      {error && (
        <Card className="bg-red-50 border-red-200 p-3 my-4">
          <div className="flex">
            <AlertCircle className="text-red-600 h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <div className="text-red-800 font-medium">Error</div>
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Form actions */}
      <div className="form-actions mt-6 flex justify-end">
        {customButtons || (
          <>
            {renderSubmitButton()}
            {renderCancelButton()}
          </>
        )}
      </div>
      
      {/* Success modal */}
      {showSuccessModal && showSuccessModalState && (
        <SubmissionSuccessModal
          open={showSuccessModalState}
          onClose={handleSuccessModalClose}
          taskId={taskId}
          taskType={taskType}
          fileId={submissionResult.fileId}
          message={submissionResult.message || 'Your form has been submitted successfully.'}
          timestamp={submissionResult.timestamp}
          {...successModalProps}
        />
      )}
    </div>
  );
}
