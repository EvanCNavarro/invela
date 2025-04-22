import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { FormService } from '@/services/form-service';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, File, Download } from 'lucide-react';
import { FormNavigationTabs } from '@/components/forms/navigation/FormNavigationTabs';
import { FieldRenderer } from '@/components/forms/field-renderers/FieldRenderer';
import { FormSection, FormField } from '@/types/forms';
import { createEmptyFormData, convertSectionsToNavigationSections } from '@/utils/form-utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { getFormStatusMapping, FormStatus } from '@/utils/formStatusUtils';
import { 
  NavigationState, 
  FormData, 
  NavigationFormField, 
  NavigationFormSection,
  SubmissionResult
} from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { FormClearingService } from '@/services/form-clearing-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type FormSection = NavigationFormSection;

/**
 * Helper function to convert service-specific sections to navigation sections
 */
function prepareFormSections(sections: any[]): FormSection[] {
  return convertSectionsToNavigationSections(sections);
}

interface UniversalFormProps {
  taskId?: number;
  taskType: string;
  taskStatus?: string;
  taskMetadata?: Record<string, any>;
  initialData?: FormData;
  taskTitle?: string; // Title of the task from task-page
  companyName?: string; // Company name for display in the header
  fileId?: number | null; // For download functionality
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
  onSuccess?: () => void; // Callback when form is successfully submitted
  onDownload?: (format: 'json' | 'csv' | 'txt') => void; // Function to handle downloads
}

/**
 * An improved UniversalForm component with reliable data management and status tracking
 */
export const UniversalForm: React.FC<UniversalFormProps> = ({
  taskId,
  taskType,
  taskStatus,
  taskMetadata,
  initialData,
  taskTitle,
  companyName,
  fileId,
  onSubmit,
  onCancel,
  onProgress,
  onSuccess,
  onDownload,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>('draft');
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentSection: 0,
    visitedSections: new Set([0]),
  });
  const [sections, setSections] = useState<FormSection[]>([]);
  const [formInitialized, setFormInitialized] = useState(false);
  const [formService, setFormService] = useState<FormService | null>(null);
  const [fields, setFields] = useState<NavigationFormField[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const previousSavingValue = useRef(false);

  // Prepare react-hook-form
  const form = useForm({
    defaultValues: initialData || {},
    mode: 'onChange',
  });

  // Reset function to clear form fields
  const resetForm = useCallback(() => {
    form.reset({});
  }, [form]);

  // Handle field updates
  const updateField = useCallback(
    async (key: string, value: any) => {
      if (!formService || !taskId) return;
      setSaving(true);
      try {
        await formService.updateField(key, value, taskId);
        return true;
      } catch (error) {
        console.error('[UniversalForm] Error updating field:', error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [formService, taskId]
  );

  // Handle section navigation
  const setActiveSection = useCallback(
    (sectionIndex: number) => {
      setNavigationState((prev) => {
        const visitedSections = new Set(prev.visitedSections);
        visitedSections.add(sectionIndex);
        return {
          currentSection: sectionIndex,
          visitedSections,
        };
      });
    },
    []
  );

  // Initialize form service based on task type
  useEffect(() => {
    const initializeFormService = async () => {
      setLoading(true);
      try {
        logger.info(`[UniversalForm] Initializing form service for task type: ${taskType}`);
        const { registerServiceForTaskType } = await import('@/services/registerServices');
        const service = await registerServiceForTaskType(taskType);
        
        if (!service) {
          throw new Error(`No form service found for task type: ${taskType}`);
        }

        setFormService(service);
        
        // Initialize the service and get sections
        if (taskId) {
          await service.initialize(taskId);
        }
        
        const serviceSections = await service.getSections();
        const formattedSections = prepareFormSections(serviceSections);
        setSections(formattedSections);
        
        // Extract and flatten all fields for easier access
        const allFields = formattedSections.flatMap((s) => s.fields);
        setFields(allFields);
        
        // Initialize form data
        const formData = initialData || createEmptyFormData(allFields);
        form.reset(formData);
        
        // Set form initialized
        setFormInitialized(true);
        
        // Update form status
        if (taskStatus) {
          setFormStatus(taskStatus as FormStatus);
        } else {
          refreshStatus();
        }
        
        // Update progress
        const progress = await service.getProgress();
        if (typeof progress === 'number') {
          setOverallProgress(progress);
          if (onProgress) {
            onProgress(progress);
          }
        }
      } catch (error) {
        console.error('[UniversalForm] Initialization error:', error);
        toast({
          variant: "destructive",
          title: "Form Error",
          description: "Failed to initialize form. Please try refreshing the page."
        });
      } finally {
        setLoading(false);
      }
    };

    if (taskType) {
      initializeFormService();
    }
  }, [taskId, taskType, initialData, form, taskStatus, onProgress, toast]);

  // Refresh status function
  const refreshStatus = useCallback(async () => {
    if (!formService || !taskId) return;
    
    try {
      const status = await formService.getStatus();
      setFormStatus(status);
    } catch (error) {
      console.error('[UniversalForm] Error refreshing status:', error);
    }
  }, [formService, taskId]);

  // Save progress function with debounce
  const saveProgress = useCallback(async () => {
    if (!formService || !formInitialized || !taskId) return;
    
    setSaving(true);
    try {
      const formData = form.getValues();
      const success = await formService.saveFormData(formData, taskId);
      if (success) {
        // Update the progress and status
        const progress = await formService.getProgress();
        setOverallProgress(progress);
        if (onProgress) {
          onProgress(progress);
        }
        
        await refreshStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[UniversalForm] Error saving progress:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, formService, formInitialized, taskId, onProgress, refreshStatus]);

  // Handle saving indicator
  useEffect(() => {
    if (saving !== previousSavingValue.current) {
      previousSavingValue.current = saving;
      
      if (saving) {
        // Show saving toast
        toast({
          title: "Saving changes...",
          description: "Form data is being saved",
          duration: 1000,
        });
      }
    }
  }, [saving, toast]);

  // Form submission logic
  const checkForEmptyValues = useCallback((data: FormData): string[] => {
    const requiredFields = fields.filter(field => field.required);
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      const value = data[field.key];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field.label || field.key);
      }
    }
    
    return missingFields;
  }, [fields]);

  const handleSubmit = useCallback(async (data: FormData) => {
    if (!formService || !taskId) return;
    
    setSubmitting(true);
    try {
      // Check for required fields first
      const missingFields = checkForEmptyValues(data);
      
      if (missingFields.length > 0) {
        // Show warning about missing fields
        const warningSubmissionResult: SubmissionResult = {
          success: false,
          errorType: 'validation',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          conflicts: [],
        };
        
        toast({
          variant: "warning",
          title: "Validation Warning",
          description: warningSubmissionResult.message,
        });
        
        setSubmitting(false);
        return;
      }
      
      // Proceed with submission
      const result = await formService.submitForm(data, taskId);
      
      if (result.success) {
        // Show success message
        toast({
          title: "Form Submitted",
          description: "Your form has been submitted successfully",
          variant: "success",
        });
        
        // Update form status
        await refreshStatus();
        
        // Update progress
        const progress = await formService.getProgress();
        setOverallProgress(progress);
        if (onProgress) {
          onProgress(progress);
        }
        
        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle errors based on type
        switch (result.errorType) {
          case 'validation':
            toast({
              variant: "destructive",
              title: "Validation Error",
              description: result.message || "Please check your form inputs",
            });
            break;
          case 'conflict':
            toast({
              variant: "destructive",
              title: "Conflict Error",
              description: "There was a conflict with your submission. Please try again.",
            });
            break;
          default:
            toast({
              variant: "destructive",
              title: "Submission Error",
              description: result.message || "An error occurred during submission",
            });
        }
      }
      
      // Call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data);
      }
    } catch (error) {
      console.error('[UniversalForm] Submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [formService, taskId, onSubmit, checkForEmptyValues, toast, refreshStatus, onProgress, onSuccess]);

  // Calculate the number of completed steps
  const completedSteps = useCallback(() => {
    if (!fields || fields.length === 0) return 0;
    
    const formData = form.getValues();
    return fields.filter(field => {
      if (!field.required) return true;
      
      const value = formData[field.key];
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [fields, form]);

  // Handle download functionality
  const handleDownload = useCallback((format: 'json' | 'csv' | 'txt' = 'json') => {
    if (!onDownload) {
      // If no custom download handler is provided, implement default behavior
      if (fileId) {
        window.open(`/api/files/${fileId}/download`, '_blank');
      } else {
        toast({
          variant: "warning",
          title: "Download Unavailable",
          description: "No file is associated with this form",
        });
      }
      return;
    }
    
    // Use the provided download handler
    onDownload(format);
  }, [onDownload, fileId, toast]);

  // State for demo fill loading indicator
  const [demoFillLoading, setDemoFillLoading] = useState(false);
  
  // Handle KY3P-specific demo auto-fill
  const handleKY3PAutofill = async () => {
    try {
      logger.info(`[UniversalForm] Using standalone direct API solution for KY3P task ${taskId}`);
      
      // Call the standalone endpoint
      const response = await fetch(`/api/ky3p/apply-demo-data/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          toast({
            variant: "destructive", 
            title: "Auto-Fill Restricted",
            description: "Auto-fill is only available for demo companies."
          });
          return false;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply demo data');
      }
      
      const result = await response.json();
      
      logger.info(`[UniversalForm] KY3P direct API response:`, {
        success: result.success,
        fieldsProcessed: result.successCount,
        progress: result.progress
      });
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to apply demo data');
      }
      
      // Reset the form first to clear existing fields
      if (resetForm) {
        resetForm();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Update form UI with the values from the response
      const demoData = result.data || {};
      for (const [key, value] of Object.entries(demoData)) {
        if (value !== null && value !== undefined) {
          form.setValue(key, value, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
          });
        }
      }
      
      // Invalidate queries to refresh UI
      const { queryClient } = await import('@/lib/queryClient');
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ky3p/progress'] });
      
      // Show success toast
      toast({
        title: "Auto-Fill Complete",
        description: `Applied demo data to ${result.successCount} fields`,
        duration: 3000,
      });
      
      // Refresh status
      if (refreshStatus) {
        refreshStatus();
      }
      
      // Update progress indicator
      if (onProgress) {
        onProgress(100);
      }
      
      return true;
    } catch (error) {
      logger.error(`[UniversalForm] KY3P standalone demo fill failed:`, error);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: error instanceof Error ? error.message : "Failed to auto-fill form",
      });
      return false;
    }
  };
  
  // Main demo auto-fill function
  const handleDemoAutoFill = useCallback(async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: "No task ID available for auto-fill",
      });
      return false;
    }
    
    setDemoFillLoading(true);
    
    try {
      logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Special handling for KY3P forms using completely standalone approach
      if (taskType === 'sp_ky3p_assessment') {
        const result = await handleKY3PAutofill();
        setDemoFillLoading(false);
        return result;
      }
      
      // For non-KY3P forms, use the original approach
      let demoData: Record<string, any> = {};
      let endpoint;
      
      if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
      } else {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
      }
      
      logger.info(`[UniversalForm] Using form-specific demo auto-fill endpoint: ${endpoint} for task type: ${taskType}`);
      const demoDataResponse = await fetch(endpoint);
      
      if (!demoDataResponse.ok) {
        if (demoDataResponse.status === 403) {
          toast({
            variant: "destructive",
            title: "Auto-Fill Restricted",
            description: "Auto-fill is only available for demo companies.",
          });
          setDemoFillLoading(false);
          return false;
        } else {
          toast({
            variant: "destructive",
            title: "Auto-Fill Failed",
            description: "Could not load demo data from server.",
          });
          setDemoFillLoading(false);
          return false;
        }
      }
      
      demoData = await demoDataResponse.json();
      
      logger.info(`[UniversalForm] Retrieved ${Object.keys(demoData).length} demo fields for auto-fill`);
      
      // Combine demo data with existing form data for a more complete set
      const currentValues = form.getValues();
      const completeData = {
        ...currentValues,
        ...demoData,
      };
      
      // Reset the form first to clear any existing fields
      if (resetForm) {
        resetForm();
      }
      
      // Add a small delay to allow the form to reset
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Different handling based on form type
      if (taskType === 'sp_ky3p_assessment') {
        // KY3P forms are now handled by the completely standalone approach at the beginning of this function
        // This code path should never be reached for KY3P forms, but we'll log a warning just in case
        logger.warn(`[UniversalForm] WARNING: Unexpected code path for KY3P form. This should not happen.`);
        toast({
          variant: "warning",
          title: "Unexpected Behavior",
          description: "The form is using an unexpected processing path. Please contact support.",
        });
        setDemoFillLoading(false);
        return false;
      }
      else if (taskType === 'kyb' || taskType === 'company_kyb') {
        // For KYB forms, use the proven batched approach
        logger.info(`[UniversalForm] Using enhanced individual field updates for ${taskType}`);
        
        let fieldsUpdated = 0;
        const fieldEntries = Object.entries(completeData).filter(
          ([_, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
        );
        
        // First, update all form values in the UI
        for (const [fieldName, fieldValue] of fieldEntries) {
          form.setValue(fieldName, fieldValue, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
          });
        }
        
        // Wait for form values to be updated in UI
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Apply server-side updates in batches of 5 with longer delays
        // This approach reduces the chance of race conditions
        const batchSize = 5;
        for (let i = 0; i < fieldEntries.length; i += batchSize) {
          const batch = fieldEntries.slice(i, i + batchSize);
          
          // Process each batch in parallel for speed, but with controlled timing
          await Promise.all(batch.map(async ([fieldName, fieldValue]) => {
            if (typeof updateField === 'function') {
              await updateField(fieldName, fieldValue);
              fieldsUpdated++;
            }
          }));
          
          // Add a substantial delay between batches
          logger.info(`[UniversalForm] Processed batch ${i/batchSize + 1} of ${Math.ceil(fieldEntries.length/batchSize)}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Add final delay for form reconciliation
        logger.info(`[UniversalForm] All batches complete. Updated ${fieldsUpdated} fields. Waiting for final reconciliation.`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      // For Open Banking forms, use the form service's bulkUpdate method
      else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        logger.info(`[UniversalForm] Using form service bulkUpdate for ${taskType}`);
        
        // Filter out empty values to get valid responses for bulk update
        const validResponses: Record<string, any> = {};
        let fieldCount = 0;
        
        for (const [fieldKey, fieldValue] of Object.entries(completeData)) {
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            // Add to valid responses
            validResponses[fieldKey] = fieldValue;
            fieldCount++;
            
            // Update the UI form state
            form.setValue(fieldKey, fieldValue, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true
            });
          }
        }
        
        if (fieldCount === 0) {
          logger.warn(`[UniversalForm] No valid responses found for auto-fill`);
          toast({
            variant: "warning",
            title: "No Data Available",
            description: "No valid demo data was found for this form type.",
          });
          setDemoFillLoading(false);
          return false;
        }
        
        try {
          if ((taskType === 'open_banking' || taskType === 'open_banking_survey') && formService && 'bulkUpdate' in formService) {
            logger.info(`[UniversalForm] Using Open Banking form service's bulkUpdate method for task ${taskId} with ${fieldCount} fields`);
            
            const success = await (formService as any).bulkUpdate(validResponses, taskId);
            
            if (!success) {
              throw new Error('The Open Banking form service bulkUpdate method failed');
            }
            
            logger.info(`[UniversalForm] Open Banking form service bulk update successful`);
          }
          else {
            // Fallback to direct API call as a last resort
            logger.warn(`[UniversalForm] No bulkUpdate method found in form service, using direct API call instead`);
            
            throw new Error('Form service does not support bulkUpdate method. Please check implementation.');
          }
          
          // Force query refresh
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        } catch (error) {
          logger.error('[UniversalForm] Error during bulk update:', error);
          
          toast({
            variant: "destructive",
            title: "Auto-Fill Failed",
            description: "Could not update form with demo data. Please try again or contact support.",
          });
          
          setDemoFillLoading(false);
          return false;
        }
      } else {
        // No other form types to handle
        logger.warn(`[UniversalForm] Unsupported form type: ${taskType}. No auto-fill implementation available.`);
        toast({
          variant: "warning",
          title: "Auto-Fill Unavailable",
          description: `No auto-fill implementation is available for ${taskType} forms.`,
        });
        setDemoFillLoading(false);
        return false;
      }
      
      // Save progress
      if (saveProgress) {
        await saveProgress();
      }
      
      // Show success message
      toast({
        title: "Auto-Fill Complete",
        description: "Demo data has been loaded successfully.",
        variant: "success",
      });
      
      // Refresh status and set progress to 100%
      if (refreshStatus) {
        refreshStatus();
      }
      if (onProgress) {
        onProgress(100);
      }
      
      setDemoFillLoading(false);
      return true;
    } catch (err) {
      logger.error('[UniversalForm] Auto-fill error:', err);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: err instanceof Error ? err.message : "There was an error loading demo data",
      });
      setDemoFillLoading(false);
      return false;
    }
  }, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService, toast]);

  // Rest of the component code...
  
  // Render function
  return (
    <div className="w-full">
      {/* Form header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{taskTitle || 'Form'}</h2>
          {companyName && (
            <p className="text-muted-foreground mt-1">Company: {companyName}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge status={formStatus} />
          <div className="text-sm font-medium">
            {overallProgress > 0 && `${Math.round(overallProgress)}% complete`}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading form...</span>
        </div>
      ) : (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-12 gap-6">
              {/* Navigation column */}
              <div className="col-span-12 lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Sections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormNavigationTabs
                      sections={sections}
                      currentSection={navigationState.currentSection}
                      visitedSections={navigationState.visitedSections}
                      onSectionChange={setActiveSection}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Main form content */}
              <div className="col-span-12 lg:col-span-9">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {sections[navigationState.currentSection]?.title || 'Form Fields'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sections[navigationState.currentSection]?.fields.map((field) => (
                      <div key={field.key} className="mb-6">
                        <FieldRenderer
                          field={field}
                          form={form}
                          onUpdate={updateField}
                        />
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => {
                          if (onCancel) onCancel();
                        }}
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={saveProgress}
                        disabled={submitting || saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Progress'
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload('json')}
                              disabled={!fileId}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download document</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDemoAutoFill}
                        disabled={demoFillLoading || submitting}
                      >
                        {demoFillLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Auto-filling...
                          </>
                        ) : (
                          'Demo Auto-Fill'
                        )}
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit'
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};