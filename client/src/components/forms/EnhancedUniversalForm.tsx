/**
 * EnhancedUniversalForm Component
 * 
 * An improved version of StandardizedUniversalForm that uses the FormStateManager
 * to handle form state transitions properly. This component ensures consistent
 * behavior for form submissions, read-only states, and error handling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormSection, FormField, FormServiceInterface } from '@/services/formService';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Save, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ReadOnlyFormField } from './ReadOnlyFormField';
import { FormStateManager, useFormState } from './FormStateManager';
import { handleUniversalDemoAutoFill } from './universal-demo-autofill';
import { standardizedBulkUpdate } from './standardized-ky3p-update';
import { fixedUniversalSaveProgress } from './fix-universal-bulk-save';
import getLogger from '@/utils/logger';
import submissionTracker from '@/utils/submission-tracker';

const logger = getLogger('EnhancedUniversalForm');

interface EnhancedUniversalFormProps {
  taskId?: number;
  taskType: string;
  formService: FormServiceInterface | null;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  onSuccess?: (fileId: number | any) => void;
  autoSave?: boolean;
  disabled?: boolean;
  showDemoAutoFill?: boolean;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  submitButtonText?: string;
  accordionDefaultValue?: string;
  showProgress?: boolean;
  initialFormState?: 'editable' | 'read-only' | 'disabled';
}

// The main component that wraps the form with FormStateManager
export function EnhancedUniversalForm(props: EnhancedUniversalFormProps) {
  return (
    <FormStateManager initialState={props.initialFormState || 'editable'} taskId={props.taskId}>
      <EnhancedUniversalFormContent {...props} />
    </FormStateManager>
  );
}

// The inner component that uses the FormStateManager context
function EnhancedUniversalFormContent({
  taskId,
  taskType,
  formService,
  onSubmit,
  onSuccess,
  autoSave = true,
  disabled = false,
  showDemoAutoFill = true,
  showSubmitButton = true,
  showResetButton = false,
  submitButtonText = 'Submit',
  accordionDefaultValue,
  showProgress = true,
}: EnhancedUniversalFormProps) {
  // Get form state from context
  const { formState, setFormState, isReadOnly, setSubmissionData } = useFormState();
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<FormSection[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [forceRerender, setForceRerender] = useState<boolean>(false);
  const [demoLoading, setDemoLoading] = useState<boolean>(false);

  // Initialize the form
  useEffect(() => {
    if (formService && !initialized) {
      try {
        const initialSections = formService.getSections();
        setSections(initialSections);
        
        if (taskId) {
          // Load progress if we have a task ID
          loadProgress();
        } else {
          // Otherwise use the initial form data
          setFormData(formService.getFormData());
        }
        
        setInitialized(true);
      } catch (error) {
        logger.error('Error initializing form:', error);
        toast({
          title: 'Error initializing form',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }
  }, [formService, initialized, taskId, forceRerender]);

  // Load progress from the server
  const loadProgress = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      setLoading(true);
      logger.info(`Loading progress for task ${taskId}`);
      
      const data = await formService.loadProgress(taskId);
      setFormData(data);
      
      // Also update the form service data
      formService.loadFormData(data);
      
      // Calculate and update the progress
      const calculatedProgress = formService.calculateProgress();
      setProgress(calculatedProgress);
      
      // If progress is 100%, set the form to read-only
      if (calculatedProgress === 100) {
        setFormState('read-only');
        // Also try to get submission timestamp if available
        if (formService.getSubmissionData) {
          try {
            const submissionData = await formService.getSubmissionData(taskId);
            if (submissionData) {
              setSubmissionData({
                timestamp: submissionData.submittedAt ? new Date(submissionData.submittedAt) : undefined,
                submittedBy: submissionData.submittedBy,
                taskId: taskId
              });
            }
          } catch (e) {
            logger.warn('Could not load submission metadata:', e);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading progress:', error);
      toast({
        title: 'Error loading form progress',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [formService, taskId, setFormState, setSubmissionData]);

  // Save progress to the server using the standardized approach
  const saveProgress = useCallback(async () => {
    if (!formService || !taskId || isReadOnly) return;
    
    try {
      setSaving(true);
      logger.info(`Saving progress for task ${taskId} using unified approach`);
      
      let success = false;
      
      // Use the appropriate save method based on task type
      if (taskType.toLowerCase() === 'ky3p') {
        // For KY3P forms, use standardizedBulkUpdate which is optimized for KY3P
        success = await standardizedBulkUpdate(taskId, formData, {
          preserveProgress: true,
          source: 'bulk-save'
        });
      } else {
        // For all other form types, use the unified save function
        success = await fixedUniversalSaveProgress(taskId, taskType, formData, {
          preserveProgress: true,
          source: 'bulk-save'
        });
      }
      
      if (success) {
        logger.info(`Successfully saved progress for ${taskType} task ${taskId}`);
      } else {
        logger.error(`Failed to save progress for ${taskType} task ${taskId}`);
        throw new Error(`Failed to save form progress`);
      }
      
      // Calculate and update the progress
      const calculatedProgress = formService.calculateProgress();
      setProgress(calculatedProgress);
    } catch (error) {
      logger.error('Error saving progress:', error);
      toast({
        title: 'Error saving form progress',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [formService, taskId, taskType, formData, isReadOnly]);

  // Refresh progress and form status
  const refreshStatus = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      setLoading(true);
      logger.info(`Refreshing status for task ${taskId}`);
      
      // Load fresh progress data
      await loadProgress();
      
      // Calculate and update the progress
      const calculatedProgress = formService.calculateProgress();
      setProgress(calculatedProgress);
    } catch (error) {
      logger.error('Error refreshing status:', error);
    } finally {
      setLoading(false);
    }
  }, [formService, taskId, loadProgress]);

  // Update a field in the form data
  const updateField = useCallback(async (fieldKey: string, value: any) => {
    if (!formService || isReadOnly) return;
    
    // Update the local form data
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value,
    }));
    
    // Also update the form service data
    if (typeof formService.updateFormData === 'function') {
      // Check if it accepts a third parameter or not
      if (formService.updateFormData.length >= 3) {
        formService.updateFormData(fieldKey, value, 0); // Use 0 instead of false for the taskId parameter
      } else {
        formService.updateFormData(fieldKey, value);
      }
    }
    
    // If auto-save is enabled and we have a task ID, save the progress
    if (autoSave && taskId) {
      try {
        logger.info(`Auto-saving field ${fieldKey} for ${taskType} task ${taskId}`);
        
        // Use the appropriate save method based on task type
        let success = false;
        
        if (taskType.toLowerCase() === 'ky3p') {
          // For KY3P forms, use standardizedBulkUpdate which is optimized for KY3P
          success = await standardizedBulkUpdate(taskId, {
            [fieldKey]: value
          }, {
            source: 'auto-save'
          });
        } else {
          // For all other form types, use the unified save function
          success = await fixedUniversalSaveProgress(taskId, taskType, {
            [fieldKey]: value
          }, {
            source: 'auto-save'
          });
        }
        
        if (success) {
          logger.info(`Successfully saved field ${fieldKey}`);
        } else {
          logger.error(`Failed to auto-save field ${fieldKey}`);
        }
        
        // Calculate and update the progress
        const calculatedProgress = formService.calculateProgress();
        setProgress(calculatedProgress);
      } catch (error) {
        logger.error(`Error auto-saving field ${fieldKey}:`, error);
      }
    }
  }, [formService, taskId, taskType, autoSave, isReadOnly]);

  // Reset the form with new data
  const resetForm = useCallback((data: Record<string, any>) => {
    if (!formService || isReadOnly) return;
    
    // Update the local form data
    setFormData(data);
    
    // Also update the form service data
    formService.loadFormData(data);
    
    // Calculate and update the progress
    const calculatedProgress = formService.calculateProgress();
    setProgress(calculatedProgress);
  }, [formService, isReadOnly]);

  // Handle form submission with state transition management
  const handleSubmit = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      // Update form state to submitting
      setFormState('submitting');
      setLoading(true);
      
      // Start submission tracking
      submissionTracker.startTracking(taskId, taskType);
      submissionTracker.trackEvent('Submit button clicked');
      
      // Get current progress to check if form is already submitted - critical check
      try {
        submissionTracker.trackEvent('Checking form submission status');
        // Require getProgress to be implemented
        if (!formService.getProgress) {
          throw new Error('Form service does not implement getProgress method');
        }
        
        const progressData = await formService.getProgress(taskId);
        logger.info('Form status check result:', progressData);
        
        // More specific status check to prevent any resubmission attempts
        if (progressData && 
            (progressData.status === 'submitted' || 
             progressData.status === 'completed' || 
             progressData.status === 'approved')) {
          submissionTracker.trackEvent('Form already submitted, preventing resubmission');
          toast({
            title: 'Form Already Submitted',
            description: 'This form has already been submitted and cannot be submitted again.',
            variant: 'warning',
          });
          setLoading(false);
          setFormState('read-only'); // Set to read-only instead of editable
          submissionTracker.stopTracking(0); // Add parameter to fix LSP error
          return;
        }
      } catch (progressError) {
        // Log detailed error but continue with submission if we can't check the status
        logger.warn('Could not check form submission status:', progressError);
        submissionTracker.trackEvent(`Error checking form status: ${progressError instanceof Error ? progressError.message : 'unknown error'}`);
      }
      
      // Validate the form data
      submissionTracker.trackEvent('Running form validation');
      const validationResult = formService.validate(formData);
      
      if (validationResult !== true) {
        // Find the first section with an error
        const errors = validationResult as Record<string, string>;
        const errorKeys = Object.keys(errors);
        
        if (errorKeys.length > 0) {
          const errorKey = errorKeys[0];
          const errorField = sections.flatMap(s => s.fields).find(f => f.key === errorKey);
          
          submissionTracker.trackEvent('Validation failed', { errorKey, errorMessage: errors[errorKey] });
          
          // Set form state back to editable so user can fix the errors
          setFormState('editable');
          
          if (errorField) {
            const errorSection = sections.find(s => s.id === errorField.sectionId || s.id === errorField.section);
            
            toast({
              title: 'Validation Error',
              description: `${errorField.label || errorField.key}: ${errors[errorKey]}`,
              variant: 'destructive',
            });
            
            // Scroll to the section with the error
            if (errorSection) {
              const sectionElement = document.getElementById(`section-${errorSection.id}`);
              if (sectionElement) {
                sectionElement.scrollIntoView({ behavior: 'smooth' });
              }
            }
          } else {
            toast({
              title: 'Form Validation Failed',
              description: 'Please check the form for errors and try again.',
              variant: 'destructive',
            });
          }
          
          submissionTracker.stopTracking(0); // Add parameter to fix LSP error
          setLoading(false);
          return;
        }
      }
      
      submissionTracker.trackEvent('Validation passed');
      
      // Save progress first
      submissionTracker.trackEvent('Saving progress before submission');
      await saveProgress();
      submissionTracker.trackEvent('Progress saved successfully');
      
      // If onSubmit is provided, call it
      if (onSubmit) {
        submissionTracker.trackEvent('Calling custom onSubmit handler');
        await onSubmit(formData);
        submissionTracker.trackEvent('Custom onSubmit handler completed');
      } else {
        // Otherwise, use the form service submit method with enhanced status tracking
        submissionTracker.trackEvent('Calling enhanced form service submit method', { taskType, taskId });
        
        // Log detailed submission intent for debugging
        logger.info('Starting form submission with enhanced status tracking', {
          taskId,
          taskType,
          fieldsCount: Object.keys(formData).length,
          timestamp: new Date().toISOString()
        });
        
        // Execute the submission with enhanced error handling
        const result = await formService.submit({ 
          taskId,
          explicitSubmission: true // Add flag to ensure submission is tracked properly
        });
        
        submissionTracker.trackEvent('Form service submit completed', { 
          result: typeof result === 'object' ? JSON.stringify(result) : result 
        });
        
        // Check if we've got a structured result with success property
        const success = typeof result === 'object' && result !== null ? result.success : result;
        
        // Type guard for result object properties
        const resultObj = result as {success?: boolean; taskId?: number; fileId?: number};
        
        // Additional logging for status tracking
        logger.info('Form submission result received', {
          success,
          resultType: typeof result,
          hasTaskId: typeof result === 'object' && result !== null ? !!(resultObj.taskId) : false,
          timestamp: new Date().toISOString()
        });
        
        // If success is true, show toast and continue
        if (success) {
          // Check if we have a fileId in the response (needed for success modal)
          const fileId = typeof result === 'object' && result !== null ? result.fileId : undefined;
          
          // Set the submission timestamp
          setSubmissionData({
            timestamp: new Date(),
            taskId: taskId
          });
          
          // Log the response structure for debugging
          logger.info('Form submission successful, response:', result);
          
          // If we have a fileId, call onSuccess with it
          if (fileId && onSuccess) {
            logger.info('Calling onSuccess with fileId:', fileId);
            onSuccess(fileId);
          } else if (onSuccess) {
            // If there's no fileId but we have a response object, call onSuccess with result
            // This is needed for KYB forms which may not return a fileId directly
            logger.info('No fileId found but calling onSuccess with result object');
            onSuccess(result);
          }
          
          toast({
            title: 'Form Submitted',
            description: 'Your form has been submitted successfully.',
          });
          
          // Set form state to read-only after successful submission
          setFormState('read-only');
          
          // Refresh the form status
          await refreshStatus();
        } else {
          // Handle submission failure
          setFormState('error');
          
          logger.error('Form submission failed', {
            taskId,
            taskType,
            timestamp: new Date().toISOString()
          });
          
          toast({
            title: 'Form Submission Failed',
            description: 'There was an error submitting the form. Please try again.',
            variant: 'destructive',
          });
          
          // Set form back to editable after error display
          setTimeout(() => {
            setFormState('editable');
          }, 5000); // Wait 5 seconds before allowing edits again
        }
      }
      
      // Track submission completion
      submissionTracker.trackEvent('Submission workflow completed');
      submissionTracker.stopTracking(0); // Add parameter to fix LSP error
    } catch (error) {
      logger.error('Error submitting form:', error);
      submissionTracker.trackEvent(`Submission error: ${error instanceof Error ? error.message : 'unknown error'}`);
      submissionTracker.stopTracking(1); // Add error code parameter to fix LSP error
      
      // Set form state to error
      setFormState('error');
      
      toast({
        title: 'Error Submitting Form',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      
      // Set form back to editable after error display
      setTimeout(() => {
        setFormState('editable');
      }, 5000); // Wait 5 seconds before allowing edits again
    } finally {
      setLoading(false);
    }
  }, [formService, formData, sections, saveProgress, onSubmit, onSuccess, taskId, taskType, refreshStatus, setFormState, setSubmissionData]);

  // Handle demo auto-fill
  const handleDemoFill = useCallback(async () => {
    if (!formService || !taskId || isReadOnly) return;
    
    try {
      setDemoLoading(true);
      logger.info(`Running demo auto-fill for ${taskType} task ${taskId}`);
      
      const demoResult = await handleUniversalDemoAutoFill(taskId, taskType);
      
      if (demoResult.success) {
        // Force reload the form data
        await loadProgress();
        
        toast({
          title: 'Demo Data Added',
          description: 'The form has been filled with demo data.',
        });
      } else {
        toast({
          title: 'Demo Auto-Fill Failed',
          description: demoResult.message || 'There was an error filling the form with demo data.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error with demo auto-fill:', error);
      toast({
        title: 'Demo Auto-Fill Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setDemoLoading(false);
    }
  }, [formService, taskId, taskType, loadProgress, isReadOnly]);

  // Generate public interface for child components
  const formMethods = {
    resetForm,
    updateField,
    refreshStatus,
    saveProgress,
    handleSubmit,
    handleDemoFill,
  };

  return (
    <div className="enhanced-universal-form space-y-6">
      {/* Progress indicator */}
      {showProgress && taskId && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-medium">Progress: {progress}%</h3>
            {!isReadOnly && showSubmitButton && progress === 100 && (
              <div className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Ready to Submit
              </div>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {/* Form content */}
      <Accordion
        type="single"
        collapsible
        defaultValue={accordionDefaultValue}
        className="w-full space-y-4"
      >
        {sections.map((section, index) => (
          <AccordionItem
            key={section.id} 
            value={section.id}
            className="border rounded-lg overflow-hidden"
            id={`section-${section.id}`}
          >
            <AccordionTrigger className="px-4 py-2 hover:bg-accent/20">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{section.title}</span>
                {section.description && (
                  <span className="text-sm text-muted-foreground">{section.description}</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-2">
              <div className="space-y-6">
                {section.fields?.map((field) => (
                  <ReadOnlyFormField
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                    disabled={disabled || loading || saving}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-4 mt-6">
        {showSubmitButton && !isReadOnly && (
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || saving || disabled || formState === 'submitting'}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        )}
        
        {/* Only show save button in editable state */}
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={saveProgress}
            disabled={loading || saving || disabled}
            className="min-w-[100px]"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        )}
        
        {/* Demo auto-fill button */}
        {showDemoAutoFill && !isReadOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoFill}
            disabled={loading || saving || demoLoading || disabled}
            className="min-w-[160px]"
          >
            {demoLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Demo...
              </>
            ) : (
              'Demo Auto-Fill'
            )}
          </Button>
        )}
        
        {/* Refresh button */}
        <Button
          type="button"
          variant="outline"
          onClick={refreshStatus}
          disabled={loading || disabled}
          className="min-w-[100px]"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
}
