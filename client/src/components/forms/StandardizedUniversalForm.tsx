/**
 * StandardizedUniversalForm Component
 * 
 * An enhanced version of the UniversalForm component that uses the standardized 
 * approach for demo auto-fill and batch updates across different form types.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormSection, FormField, FormServiceInterface } from '@/services/formService';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { StandardizedFormField } from './StandardizedFormField.tsx';
import { handleUniversalDemoAutoFill } from './universal-demo-autofill.ts';
import { Progress } from '@/components/ui/progress';
import { getFormServiceForTaskType } from '@/services/standardized-service-registry';
import { standardizedBulkUpdate } from './standardized-ky3p-update.ts';
import { fixedUniversalSaveProgress } from './fix-universal-bulk-save.ts';
import getLogger from '@/utils/logger';
import submissionTracker from '@/utils/submission-tracker';

const logger = getLogger('StandardizedUniversalForm');

interface StandardizedUniversalFormProps {
  taskId?: number;
  taskType: string;
  formService: FormServiceInterface | null;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  onSuccess?: (fileId: number) => void;
  autoSave?: boolean;
  disabled?: boolean;
  showDemoAutoFill?: boolean;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  submitButtonText?: string;
  accordionDefaultValue?: string;
  showProgress?: boolean;
}

export function StandardizedUniversalForm({
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
}: StandardizedUniversalFormProps) {
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
  }, [formService, taskId]);

  // Save progress to the server using the standardized approach
  const saveProgress = useCallback(async () => {
    if (!formService || !taskId) return;
    
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
  }, [formService, taskId, taskType, formData]);

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
    if (!formService) return;
    
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
  }, [formService, taskId, taskType, autoSave]);

  // Reset the form with new data
  const resetForm = useCallback((data: Record<string, any>) => {
    if (!formService) return;
    
    // Update the local form data
    setFormData(data);
    
    // Also update the form service data
    formService.loadFormData(data);
    
    // Calculate and update the progress
    const calculatedProgress = formService.calculateProgress();
    setProgress(calculatedProgress);
  }, [formService]);

  // Add type declaration for onSuccess to accept any types
  type OnSuccessType = (fileIdOrResult: number | any) => void;

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
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
          } as any);
          setLoading(false);
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
          
          if (errorField) {
            const errorSection = sections.find(s => s.id === errorField.sectionId || s.id === errorField.section);
            
            toast({
              title: 'Validation Error',
              description: `${errorField.label || errorField.key}: ${errors[errorKey]}`,
              variant: 'destructive',
            } as any);
            
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
            } as any);
          }
          
          submissionTracker.stopTracking(0); // Add parameter to fix LSP error
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
            // Cast result to any to handle various response types
            onSuccess(result as any);
          }
          
          toast({
            title: 'Form Submitted',
            description: 'Your form has been submitted successfully.',
          } as any);
          
          // Refresh the form status
          submissionTracker.trackEvent('Refreshing form status');
          await refreshStatus();
          submissionTracker.trackEvent('Form status refreshed');
        } else {
          throw new Error('Form submission failed');
        }
      }
      
      submissionTracker.trackEvent('Form submission completed successfully');
    } catch (error) {
      submissionTracker.trackEvent('Error during form submission', { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error submitting form:', error);
      toast({
        title: 'Error Submitting Form',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      } as any);
    } finally {
      setLoading(false);
      submissionTracker.stopTracking(0); // Add parameter to fix LSP error
    }
  }, [formService, formData, sections, saveProgress, onSubmit, onSuccess, taskId, taskType, refreshStatus]);

  // Handle demo auto-fill
  const handleDemoAutoFill = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      setDemoLoading(true);
      
      const standardizedService = getFormServiceForTaskType(taskType, taskId);
      
      await handleUniversalDemoAutoFill({
        taskId,
        taskType,
        form: formData,
        resetForm,
        updateField,
        refreshStatus,
        saveProgress,
        onProgress: setProgress,
        formService: standardizedService || formService,
        setForceRerender,
      });
    } catch (error) {
      logger.error('Error in demo auto-fill:', error);
    } finally {
      setDemoLoading(false);
    }
  }, [formService, taskId, taskType, formData, resetForm, updateField, refreshStatus, saveProgress]);

  // Render field based on type
  const renderField = (field: FormField) => {
    return (
      <StandardizedFormField
        key={field.key}
        field={field}
        value={formData[field.key]}
        onChange={(value) => updateField(field.key, value)}
        disabled={disabled || loading}
      />
    );
  };

  if (!formService) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Form Completion</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      {/* Form sections */}
      <Accordion
        type="multiple"
        defaultValue={accordionDefaultValue ? [accordionDefaultValue] : sections.map(s => s.id)}
        className="space-y-4"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            id={`section-${section.id}`}
            className="border rounded-md overflow-hidden bg-card"
          >
            <AccordionTrigger className="px-4 py-2 hover:bg-accent/50 font-medium">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="px-4 py-4 border-t space-y-4">
              {section.description && (
                <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
              )}
              <div className="space-y-6">
                {section.fields.map(renderField)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      {/* Form actions */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          {showResetButton && (
            <Button 
              variant="outline" 
              onClick={refreshStatus}
              disabled={loading || !taskId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Reset
            </Button>
          )}
          
          {showDemoAutoFill && (
            <Button 
              variant="outline" 
              onClick={handleDemoAutoFill}
              disabled={demoLoading || !taskId}
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <span className="mr-2">🧪</span>
              )}
              Demo Auto-Fill
            </Button>
          )}
        </div>
        
        {showSubmitButton && (
          <Button 
            onClick={handleSubmit}
            disabled={loading || saving || !taskId}
          >
            {(loading || saving) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}