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
import { StandardizedFormField } from './StandardizedFormField';
import { handleUniversalDemoAutoFill } from './universal-demo-autofill';
import { Progress } from '@/components/ui/progress';
import { getFormServiceForTaskType } from '@/services/standardized-service-registry';
import { standardizedBulkUpdate } from './standardized-ky3p-update';
import { fixedUniversalSaveProgress } from './fix-universal-bulk-save';
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

  // Save progress to the server
  const saveProgress = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      setSaving(true);
      logger.info(`Saving progress for task ${taskId} using fixed universal implementation`);
      
      // First try our fixed implementation
      try {
        const success = await fixedUniversalSaveProgress(taskId, taskType, formData);
        
        if (success) {
          logger.info(`Successfully saved progress for task ${taskId} using fixed implementation`);
          
          // Calculate and update the progress
          const calculatedProgress = formService.calculateProgress();
          setProgress(calculatedProgress);
          return;
        }
      } catch (fixedError) {
        logger.warn('Fixed implementation failed:', fixedError);
      }
      
      // Fallback to the form service implementation
      logger.info(`Falling back to form service saveProgress for task ${taskId}`);
      await formService.saveProgress(taskId);
      
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
    formService.updateFormData(fieldKey, value, false); // Don't auto-save within the form service
    
    // If auto-save is enabled and we have a task ID, save the progress
    if (autoSave && taskId) {
      try {
        // First try our fixed implementation for single field update
        const success = await fixedUniversalSaveProgress(taskId, taskType, {
          [fieldKey]: value
        });
        
        if (success) {
          logger.info(`Successfully saved field ${fieldKey} using fixed implementation`);
        } else {
          // Fallback to standardized bulk update
          const altSuccess = await standardizedBulkUpdate(taskId, {
            [fieldKey]: value
          });
          
          if (!altSuccess) {
            logger.error(`Failed to auto-save field ${fieldKey}`);
          }
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

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      setLoading(true);
      
      // Start submission tracking
      submissionTracker.startTracking(taskId, taskType);
      submissionTracker.trackEvent('Submit button clicked');
      
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
          
          submissionTracker.stopTracking();
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
        // Otherwise, use the form service submit method
        submissionTracker.trackEvent('Calling form service submit method', { taskType, taskId });
        const result = await formService.submit({ taskId });
        submissionTracker.trackEvent('Form service submit completed', { result });
        
        // Check if we've got a structured result with success property (e.g., from KY3P)
        const success = typeof result === 'object' && result !== null ? result.success : result;
        
        // If success is true, show toast and continue
        if (success) {
          // Check if we have a fileId in the response (for KY3P forms)
          const fileId = typeof result === 'object' && result !== null ? result.fileId : undefined;
          
          // If we have a fileId, call onSuccess with it (needed for KY3P success modal)
          if (fileId && onSuccess) {
            onSuccess(fileId);
          }
          
          toast({
            title: 'Form Submitted',
            description: 'Your form has been submitted successfully.',
          });
          
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
      });
    } finally {
      setLoading(false);
      submissionTracker.stopTracking();
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