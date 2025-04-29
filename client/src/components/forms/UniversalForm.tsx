import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { componentFactory } from '@/services/componentFactory';
import { FormServiceInterface, FormData, FormSection as ServiceFormSection } from '@/services/formService';
import type { FormField as ServiceFormField } from '@/services/formService';
import { TaskTemplateService, TaskTemplateWithConfigs } from '@/services/taskTemplateService';
import { sortFields, sortSections } from '@/utils/formUtils';
import getLogger from '@/utils/logger';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  ArrowRight,
  Eye,
  Check,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Import our new improved hooks and components
import { useFormDataManager } from '@/hooks/form/use-form-data-manager';
import { useFormStatus, SectionStatus } from '@/hooks/form/use-form-status';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import FormProgressBar from './FormProgressBar';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { useUser } from '@/hooks/useUser';
import { useCurrentCompany } from '@/hooks/use-current-company';

import SectionContent from './SectionContent';

// Import utility functions
import { handleDemoAutoFill } from './handleDemoAutoFill';
import { handleClearFieldsUtil } from './handleClearFields';

// Create a type alias for form sections
type FormSection = NavigationFormSection;

// Logger instance for this component
const logger = getLogger('UniversalForm', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

/**
 * Helper function to convert service-specific sections to navigation sections
 */
const toNavigationSections = (serviceSections: ServiceFormSection[]): NavigationFormSection[] => {
  return serviceSections.map(section => {
    logger.debug(`Processing section ${section.id} (${section.title}) with ${section.fields?.length || 0} fields`);
    
    return {
      id: section.id,
      title: section.title,
      order: section.order || 0,
      collapsed: section.collapsed || false,
      description: section.description,
      fields: section.fields || []
    };
  });
};

// Props for the UniversalForm component
interface UniversalFormProps {
  taskId?: number;
  taskType: string;
  initialData?: FormData;
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
}

/**
 * An improved UniversalForm component with reliable data management and status tracking
 */
export const UniversalForm: React.FC<UniversalFormProps> = ({
  taskId,
  taskType,
  initialData = {},
  onSubmit,
  onCancel,
  onProgress
}) => {
  // Get user and company data for the consent section
  const { user } = useUser();
  const { company } = useCurrentCompany();
  
  // Core state for form initialization
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TaskTemplateWithConfigs | null>(null);
  const [formService, setFormService] = useState<FormServiceInterface | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<ServiceFormField[]>([]);
  const [forceRerender, setForceRerender] = useState(false);
  
  // Use our new form data manager hook to handle form data
  const {
    form,
    formData,
    isLoading: isDataLoading,
    hasLoaded: dataHasLoaded,
    error: dataError,
    updateField,
    saveProgress,
    resetForm
  } = useFormDataManager({
    formService,
    taskId,
    initialData,
    fields,
    onDataChange: (data) => {
      logger.debug(`Form data changed: ${Object.keys(data).length} fields`);
    }
  });
  
  // Make sure agreement_confirmation is set to false by default
  useEffect(() => {
    if (dataHasLoaded && form) {
      // Initialize agreement to false if undefined
      const currentValue = form.getValues('agreement_confirmation');
      
      // If value is undefined in the form, initialize it to false
      if (currentValue === undefined) {
        form.setValue('agreement_confirmation', false, { shouldValidate: false });
      }
    }
  }, [dataHasLoaded, form]);
  
  // Function to get current form values for status calculation
  const getFormValues = useCallback(() => {
    return formService ? formService.getFormData() : formData;
  }, [formService, formData]);
  
  // Use our new form status hook to track section and overall progress
  const {
    sectionStatuses,
    completedSections,
    overallProgress,
    activeSection,
    setActiveSection,
    refreshStatus
  } = useFormStatus({
    sections,
    getFormValues,
    fields,
    requiredOnly: true,
    onChange: onProgress
  });
  
  // Create and manage the Review & Submit section
  const [allSections, setAllSections] = useState<FormSection[]>([]);
  
  // Update sections when main form sections change to include the Review & Submit section
  useEffect(() => {
    if (sections.length > 0) {
      // Create a Review & Submit section to be added at the end
      const reviewSection: FormSection = {
        id: 'review-section',
        title: 'Review & Submit',
        order: sections.length,
        description: 'Review your answers and submit the form',
      };
      
      // Combine regular sections with review section
      setAllSections([...sections, reviewSection]);
    } else {
      setAllSections([]);
    }
  }, [sections]);
  
  // Load template and form configuration - step 1: fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        logger.info(`Fetching template for task type: ${taskType}`);
        setLoading(true);
        setError(null);
        
        // Map task types to their database equivalents if needed
        const taskTypeMap: Record<string, string> = {
          'kyb': 'company_kyb',
          'card': 'company_card',
          'security': 'security_assessment'
        };
        
        // Use the mapped task type for API requests if available
        const dbTaskType = taskTypeMap[taskType] || taskType;
        
        try {
          // Fetch template configuration
          const templateData = await TaskTemplateService.getTemplateByTaskType(dbTaskType);
          logger.info(`Template loaded: ID=${templateData.id}, Name=${templateData.name}`);
          setTemplate(templateData);
        } catch (err) {
          logger.warn(`Could not load template for ${dbTaskType}:`, err);
          logger.info('Will try to continue with available services');
        }
        
        // Find the appropriate form service
        logger.debug(`Looking for form service for task type: ${taskType}`);
        let service = componentFactory.getFormService(taskType);
        
        if (!service) {
          // Try with mapped DB task type
          logger.debug(`No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
          service = componentFactory.getFormService(dbTaskType);
        }
        
        if (!service) {
          throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
        }
        
        logger.info(`Found form service: ${service.constructor.name}`);
        setFormService(service);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load form template';
        logger.error('Template fetch error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [taskType]);
  
  // Step 2: Initialize form with fields and sections from template or service
  useEffect(() => {
    const initializeForm = async () => {
      if (!formService) return;
      
      try {
        // First try to get fields and sections from the service
        logger.info('Initializing form structure with form service');
        
        // ENHANCED DIAGNOSTICS: Check if form service is properly initialized
        logger.info(`Form service type: ${formService.constructor.name}`);
        logger.info(`Form service has initialize method: ${typeof formService.initialize === 'function'}`);
        
        // Initialize service with template if needed
        if (template && typeof formService.initialize === 'function') {
          try {
            logger.info(`Initializing form service with template ID: ${template.id}`);
            await formService.initialize(template.id);
            logger.info(`Form service initialization completed`);
          } catch (initError) {
            logger.error('Error initializing form service:', initError);
          }
        }
        
        // Fetch fields from the service with ENHANCED DIAGNOSTICS
        logger.info(`Fetching fields from form service...`);
        try {
          const serviceFields = formService.getFields();
          logger.info(`Fields result type: ${typeof serviceFields}`);
          logger.info(`Is fields array: ${Array.isArray(serviceFields)}`);
          
          if (serviceFields && serviceFields.length > 0) {
            logger.info(`Loaded ${serviceFields.length} fields from form service`);
            logger.info(`Sample field: ${JSON.stringify(serviceFields[0])}`);
            setFields(sortFields(serviceFields));
          } else {
            logger.warn('No fields returned from form service (empty array or null)');
            setFields([]);
          }
        } catch (fieldError) {
          logger.error('Error getting fields from form service:', fieldError);
          setFields([]);
        }
        
        // Fetch sections from the service with ENHANCED DIAGNOSTICS
        logger.info(`Fetching sections from form service...`);
        try {
          // Handle async getSections method
          const serviceSections = await Promise.resolve(formService.getSections());
          logger.info(`Sections result type: ${typeof serviceSections}`);
          logger.info(`Is sections array: ${Array.isArray(serviceSections)}`);
          
          if (serviceSections && Array.isArray(serviceSections) && serviceSections.length > 0) {
            logger.info(`Loaded ${serviceSections.length} sections from form service`);
            logger.info(`Sample section: ${JSON.stringify(serviceSections[0])}`);
            
            // Convert to navigation sections and sort
            const navigationSections = toNavigationSections(serviceSections);
            setSections(sortSections(navigationSections));
          } else {
            logger.warn('No sections returned from form service (empty array or null)');
            setSections([]);
          }
        } catch (sectionError) {
          logger.error('Error getting sections from form service:', sectionError);
          setSections([]);
        }
        
        // Mark loading as complete when we have both fields and sections
        setLoading(false);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize form';
        logger.error('Form initialization error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    initializeForm();
  }, [formService]);
  
  // Track first load state to only auto-navigate once
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  
  // Auto-navigate to review section (when status is "ready_for_submission") or first incomplete field
  useEffect(() => {
    // Only run this effect once on initial data load and never again
    if (sections.length > 0 && !loading && fields.length > 0 && dataHasLoaded && !hasAutoNavigated) {
      logger.info('Auto-navigating form on initial load based on task status and completion');
      
      // Mark that we've performed the auto-navigation
      setHasAutoNavigated(true);
      
      // Get task status to check for ready_for_submission
      const isReadyForSubmission = taskId && taskType && window.location.search.includes('review=true');
      
      // If task is ready for submission, navigate to the Review & Submit section
      if (isReadyForSubmission && allSections.length > 0) {
        logger.info('Task is ready for submission, navigating to review section');
        // The last section is the Review & Submit section
        setActiveSection(allSections.length - 1);
        return;
      }
      
      // If form is 100% complete, navigate to the last section
      if (overallProgress === 100) {
        logger.info('Form is complete, navigating to last section');
        setActiveSection(sections.length - 1);
        return;
      }
      
      // Find the first section with incomplete fields
      const firstIncompleteSectionIndex = sectionStatuses.findIndex(
        status => status.status !== 'completed'
      );
      
      if (firstIncompleteSectionIndex !== -1) {
        logger.info(`Found incomplete section at index ${firstIncompleteSectionIndex}, navigating there`);
        setActiveSection(firstIncompleteSectionIndex);
      }
    }
  }, [sections.length, loading, fields.length, dataHasLoaded, overallProgress, sectionStatuses, setActiveSection, hasAutoNavigated, taskId, taskType, allSections.length]);
  
  // Handle field change events
  const handleFieldChange = useCallback((name: string, value: any) => {
    logger.debug(`Field change: ${name} = ${value}`);
    updateField(name, value);
    
    // Refresh status after a short delay to allow form data to update
    setTimeout(() => {
      refreshStatus();
    }, 100);
  }, [updateField, refreshStatus]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormData) => {
    try {
      // Verify form is complete before submitting
      if (overallProgress < 100) {
        toast({
          title: "Form incomplete",
          description: "Please complete all required fields before submitting.",
          variant: "warning",
        });
        return;
      }
      
      logger.info('Form submitted');
      
      // Show submission toast
      toast({
        title: 'Submitting Form',
        description: 'Please wait while we process your submission...',
      });
      
      // First save the current progress
      const saveResult = await saveProgress();
      logger.info('Form progress saved, moving to submit phase');
      
      // Force the UI to show the review tab by manually setting active section to the last tab
      // This ensures the form shows as "submitted" with the review content visible
      if (allSections.length > 0) {
        setActiveSection(allSections.length - 1);
      }
      
      // Wait a moment for the UI to update before triggering any callbacks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // CRITICAL: This is where we need to handle the actual form submission
      logger.info('Initiating final submission process - critical step');
      
      // Then call the onSubmit callback if provided - THIS IS THE MOST IMPORTANT PART
      // This makes sure we call the parent component's submission handler which contains
      // the actual API call to /api/kyb/submit endpoint
      if (onSubmit) {
        logger.info('Calling onSubmit callback from parent component to trigger actual submission');
        onSubmit(data);
      } else {
        // Only show this toast if we don't have an onSubmit handler
        // Otherwise the parent component will handle success messaging
        toast({
          title: 'Form submitted',
          description: 'Your form has been successfully submitted.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Form submission failed';
      logger.error('Form submission error:', message);
      
      toast({
        title: 'Submission failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [saveProgress, onSubmit, overallProgress, allSections, setActiveSection]);
  
  // Handle cancellation
  const handleCancel = useCallback(() => {
    logger.info('Form cancelled');
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);
  
  // Handle demo auto-fill
  const handleDemoAutoFillClick = useCallback(async () => {
    if (!taskId) {
      toast({
        title: 'Demo Auto-Fill Error',
        description: 'Cannot auto-fill without a task ID',
        variant: 'destructive',
      });
      return;
    }
    
    // Create promise-wrapped versions of the callbacks to match expected types
    const updateFieldAsync = async (fieldKey: string, value: any): Promise<void> => {
      updateField(fieldKey, value, true);
      return Promise.resolve();
    };
    
    const refreshStatusAsync = async (): Promise<void> => {
      refreshStatus();
      return Promise.resolve();
    };
    
    const saveProgressAsync = async (): Promise<void> => {
      await saveProgress();
      return Promise.resolve();
    };
    
    await handleDemoAutoFill({
      taskId,
      taskType,
      form,
      resetForm,
      updateField: updateFieldAsync,
      refreshStatus: refreshStatusAsync,
      saveProgress: saveProgressAsync,
      onProgress,
      formService,
      setForceRerender
    });
  }, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService]);
  
  // Handle clear fields
  /**
   * Handle clearing all form fields
   * 
   * This function uses the improved handleClearFields utility which
   * properly handles different field identifiers across form types.
   */
  const handleClearFields = useCallback(async () => {
    if (!formService || !fields.length) {
      toast({
        title: 'Clear Fields Error',
        description: 'Cannot clear fields: form service or fields not available',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // No confirmation dialog - just clear the fields directly
      logger.info('[ClearFields] Starting clear operation without confirmation');
      
      // Show loading toast
      toast({
        title: 'Clear Fields',
        description: 'Clearing all form fields...',
        variant: 'default',
      });
      
      // Log the current section where the clear operation was initiated from
      logger.info(`[ClearFields] Current section: ${activeSection}, will navigate to first section after clearing`);
      
      // We'll navigate to the first section AFTER clearing the fields (moved to end of function)
      
      // Enhanced logging for better debugging
      logger.info('[ClearFields] Starting clear operation', {
        fieldsCount: fields.length,
        formServiceType: formService.constructor.name,
        formDataFields: Object.keys(formService.getFormData()).length
      });
      
      // Use the direct approach for all form types
      if (taskId) {
        try {
          // Import dynamically to avoid circular dependencies
          const clearFieldsModule = await import('./handleClearFields');
          const { directClearFields } = clearFieldsModule;
          
          logger.info(`[ClearFields] Using direct clear approach for task ${taskId} (${taskType})`);
          
          // Call the direct clear function that works for all form types
          const result = await directClearFields(taskId, taskType);
          logger.info('[ClearFields] Direct clear result:', result);
          
          // Clear the form UI (this doesn't trigger API calls, it just updates the UI)
          fields.forEach(field => {
            const fieldId = field.key || (field as any).name || String((field as any).id) || (field as any).field_key || '';
            if (!fieldId) return;
            
            try {
              // Choose appropriate empty value based on field type
              const emptyValue = field.type === 'boolean' ? false : 
                                field.type === 'number' ? null : '';
              
              // Update the field value in our form state
              updateField(fieldId, emptyValue);
              
              // Also update the form library state if available
              if (form) {
                try {
                  form.setValue(fieldId, emptyValue, { shouldValidate: false, shouldDirty: true });
                } catch (e) {
                  // Ignore setValue errors
                }
              }
            } catch (e) {
              logger.warn(`[ClearFields] Error clearing field ${fieldId} in UI:`, e);
            }
          });
          
          // Clear form service cache if available
          if (typeof formService.clearCache === 'function') {
            formService.clearCache();
          }
          
          // Trigger UI refresh
          setForceRerender(prev => !prev);
          
          // Refresh task status to get updated progress
          await refreshStatus();
          
          // Show success toast
          toast({
            title: 'Fields cleared successfully',
            variant: 'default',
          });
          
          // Navigate to the first section AFTER successfully clearing the fields
          if (sections && sections.length > 0) {
            logger.info('[ClearFields] Successfully cleared fields, navigating to first section');
            // Use setTimeout to ensure this happens after the UI has updated
            setTimeout(() => {
              setActiveSection(0);
              logger.info('[ClearFields] Navigation to first section completed');
            }, 150);
          }
          
          return;
        } catch (directClearError) {
          logger.error('[ClearFields] Direct clear failed, falling back to standard method:', directClearError);
          // Continue to standard method as fallback
        }
      }
      
      // Standard approach for non-KY3P forms
      const clearFieldsModule = await import('./handleClearFields');
      const success = await clearFieldsModule.handleClearFieldsUtil(
        formService, 
        fields, 
        // Pass callback to update field value in form
        (fieldId: string, value: any) => {
          try {
            // Call the update function from the hook
            updateField(fieldId, value);
            
            // Also update the form directly with setValue if available
            if (form) {
              try {
                form.setValue(fieldId, value, { shouldValidate: false, shouldDirty: true });
              } catch (formError) {
                // Don't let setValue errors block the process
                logger.warn(`[ClearFields] Unable to set form value for ${fieldId}:`, formError);
              }
            }
          } catch (updateError) {
            logger.error(`[ClearFields] Field update error for ${fieldId}:`, updateError);
          }
        }
      );
      
      if (success) {
        // Force a re-render to update the UI
        setForceRerender(prev => !prev);
        
        // Refresh status and save progress in sequence
        try {
          logger.info('[ClearFields] Refreshing form status...');
          await refreshStatus();
          
          logger.info('[ClearFields] Saving progress with cleared fields...');
          await saveProgress();
          
          // Calculate new progress to show in toast
          const newProgress = formService.calculateProgress();
          
          // Show success message
          toast({
            title: 'Fields Cleared',
            description: `Successfully cleared all form fields. Form progress: ${newProgress}%`,
            variant: 'success',
          });
          
          // Navigate to the first section AFTER successfully clearing the fields
          if (sections && sections.length > 0) {
            logger.info('[ClearFields] Successfully cleared fields (standard method), navigating to first section');
            // Use setTimeout to ensure this happens after the UI has updated
            setTimeout(() => {
              setActiveSection(0);
              logger.info('[ClearFields] Navigation to first section completed (standard method)');
            }, 150);
          }
        } catch (saveError) {
          logger.error('[ClearFields] Error during status refresh or save:', saveError);
          // Still consider the operation successful since fields were cleared
          toast({
            title: 'Fields Cleared',
            description: 'Fields cleared successfully, but there was an issue updating progress.',
            variant: 'default',
          });
          
          // Still try to navigate back to first section even if there was an error updating progress
          if (sections && sections.length > 0) {
            logger.info('[ClearFields] Navigating to first section despite save error');
            setTimeout(() => {
              setActiveSection(0);
            }, 150);
          }
        }
      } else {
        throw new Error('Failed to clear form fields - no fields were cleared');
      }
    } catch (error) {
      logger.error('[ClearFields] Error clearing fields:', error);
      toast({
        title: 'Clear Fields Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }, [formService, fields, updateField, refreshStatus, saveProgress, setForceRerender, form, setActiveSection, activeSection, sections, taskId, taskType]);
  
  // Get form title based on template or task type
  const formTitle = useMemo(() => {
    if (template?.name) {
      return template.name;
    }
    
    // Fallback to capitalizing the task type
    return taskType.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [template, taskType]);
  
  // Get the form description
  const formDescription = useMemo(() => {
    if (template?.description) {
      return template.description;
    }
    
    // Map task types to their descriptions
    const descriptionMap: Record<string, string> = {
      'company_kyb': 'Know Your Business form for identity verification',
      'security_assessment': 'S&P KY3P Security Assessment form for third-party risk evaluation',
      'open_banking': 'Open Banking Survey for financial data access evaluation',
    };
    
    // Use the mapped description for API requests if available
    return descriptionMap[taskType] || 'Please complete all required fields in this form.';
  }, [template, taskType]);
  
  // Render loading state
  if (loading) {
    return (
      <div className="w-full mx-auto bg-white rounded-md shadow-sm">
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-sm text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="w-full mx-auto bg-white rounded-md shadow-sm p-6">
        <div className="p-4 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700">
          <h3 className="font-medium mb-2">Error Loading Form</h3>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
      </div>
    );
  }
  
  // If we have no sections or fields, show empty state
  if (sections.length === 0 || fields.length === 0) {
    return (
      <div className="w-full mx-auto bg-white rounded-md shadow-sm p-6">
        <div className="p-4 mb-4 border border-amber-200 bg-amber-50 rounded-md text-amber-700">
          <h3 className="font-medium mb-2">No Form Content Available</h3>
          <p className="text-sm">This form has no sections or fields defined.</p>
        </div>
      </div>
    );
  }
  
  // Render main form
  return (
    <div className="w-full mx-auto">
      {/* Form title and subtitle */}
      <div className="bg-gray-50 p-6 rounded-t-md mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{formTitle}</h1>
        <p className="text-gray-600 mt-1">{formDescription}</p>
        
        {/* Demo buttons - Only show for demo companies */}
        {company?.isDemo && (
          <div className="flex gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 flex items-center gap-2"
              onClick={handleDemoAutoFillClick}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              Demo Auto-Fill
            </Button>
            
            {/* Clear Fields button is now visible */}
            <Button
              type="button"
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 flex items-center gap-2"
              onClick={handleClearFields}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21 6H3"></path>
                <path d="M17 6V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"></path>
                <path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Clear Fields
            </Button>
          </div>
        )}
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          {/* Progress bar showing overall completion */}
          <div className="mb-4">
            <FormProgressBar progress={overallProgress} />
          </div>
          
          {/* Section navigation tabs - flush with form content */}
          <ResponsiveSectionNavigation
            sections={allSections}
            sectionStatuses={sectionStatuses}
            activeSection={activeSection}
            onSectionChange={(index) => {
              // Only allow access to the review section if the form is complete
              if (index === allSections.length - 1 && overallProgress < 100) {
                toast({
                  title: "Form incomplete",
                  description: "Please complete all required fields before proceeding to review.",
                  variant: "warning",
                });
                return;
              }
              setActiveSection(index);
            }}
          />
          
          {/* Form content - with continuous white box, rounded only at bottom */}
          <div className="bg-white rounded-b-md p-3 sm:p-6 border-t-0">
            {/* Data loading indicator */}
            {isDataLoading && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-muted-foreground">Loading saved data...</span>
              </div>
            )}
            
            {/* Data error display */}
            {dataError && (
              <div className="p-3 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                {dataError}
              </div>
            )}
            
            {/* Section content */}
            <div className="pt-2">
              {/* Current section content */}
              {allSections.map((section, index) => {
                // Handle the special review section
                if (section.id === 'review-section') {
                  
                  return (
                    <div
                      key={section.id}
                      className={index === activeSection ? 'block' : 'hidden'}
                    >
                      <div className="space-y-6">
                        <div className="mb-2">
                          <h3 className="text-2xl font-semibold text-gray-900">Review & Submit</h3>
                          <p className="text-gray-600 mt-1">
                            Please review your responses before submitting the form.
                          </p>
                        </div>
                        
                        {/* Review all sections and their answers */}
                        <div className="space-y-6 mt-6">
                          {/* Using shadcn Accordion for collapsible sections, collapsed by default */}
                          <Accordion type="multiple" className="w-full">
                            {sections.map((reviewSection, sectionIndex) => {
                              const sectionFields = fields.filter(field => field.section === reviewSection.id);
                              const filledFieldCount = sectionFields.filter(field => {
                                const value = form.getValues(field.key);
                                return value !== undefined && value !== null && value !== '';
                              }).length;
                              
                              // Determine completion status for styling
                              const isComplete = filledFieldCount === sectionFields.length;
                              
                              return (
                                <AccordionItem 
                                  key={`review-${sectionIndex}`} 
                                  value={`section-${sectionIndex}`}
                                  className="border border-gray-200 rounded-md mb-4 bg-gray-50 overflow-hidden"
                                >
                                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100/70">
                                    <div className="flex justify-between w-full items-center">
                                      <div className="flex items-center">
                                        {isComplete && (
                                          <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                                        )}
                                        <h4 className="font-medium text-lg text-left">
                                          Section {sectionIndex + 1}: {reviewSection.title}
                                        </h4>
                                      </div>
                                      <span className={cn(
                                        "text-sm mr-2",
                                        isComplete ? "text-emerald-600" : "text-gray-500"
                                      )}>
                                        {filledFieldCount}/{sectionFields.length} questions answered
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="bg-white px-4 pt-2 pb-4">
                                    <div className="space-y-4">
                                      {sectionFields.map((field, fieldIndex) => {
                                        const value = form.getValues(field.key);
                                        const displayValue = value === '' || value === null || value === undefined 
                                          ? 'Not provided' 
                                          : (typeof value === 'boolean' 
                                            ? (value ? 'Yes' : 'No') 
                                            : (Array.isArray(value) 
                                              ? value.join(', ') 
                                              : value));
                                        
                                        return (
                                          <div key={`review-field-${fieldIndex}`} className="border-b border-gray-100 pb-3 last:border-b-0">
                                            <p className="text-sm font-medium text-gray-700">
                                              {field.question || field.label}
                                            </p>
                                            <p className="text-sm mt-1 text-gray-500">
                                              {displayValue}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </div>
                        
                        {/* Consent section - ultra simple implementation */}
                        <div 
                          className="p-4 rounded-lg border cursor-pointer"
                          style={{
                            backgroundColor: form.getValues("agreement_confirmation") ? "#EFF6FF" : "white",
                            borderColor: form.getValues("agreement_confirmation") ? "#93C5FD" : "#E5E7EB"
                          }}
                          onClick={() => {
                            // Toggle the value
                            const newValue = !form.getValues("agreement_confirmation");
                            console.log('[KYB Form] Toggling agreement confirmation:', newValue);
                            form.setValue("agreement_confirmation", newValue);
                            
                            // Set explicit submission flag for tracking
                            if (newValue) {
                              form.setValue("explicitSubmission", true);
                              console.log('[KYB Form] Set explicitSubmission flag:', true);
                            }
                            
                            // Directly update checkbox
                            const checkbox = document.getElementById("consent-checkbox") as HTMLInputElement;
                            if (checkbox) {
                              checkbox.checked = newValue;
                            }
                            
                            // Update container style
                            const container = document.getElementById("consent-box");
                            if (container) {
                              container.style.backgroundColor = newValue ? "#EFF6FF" : "white";
                              container.style.borderColor = newValue ? "#93C5FD" : "#E5E7EB";
                            }
                            
                            // Update submit button state - use direct querySelector for type="submit"
                            const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                            if (submitButton) {
                              console.log('[KYB Form] Updating submit button state:', !newValue);
                              submitButton.disabled = !newValue;
                            }
                          }}
                          id="consent-box"
                        >
                          <div className="flex items-center mb-2">
                            <div className="flex flex-row items-start space-x-3 space-y-0 m-0">
                              <input 
                                type="checkbox" 
                                id="consent-checkbox"
                                defaultChecked={form.getValues("agreement_confirmation") || false}
                                className="mt-0.5 h-4 w-4" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Allow the checkbox to be clicked directly too
                                  const checkbox = e.target as HTMLInputElement;
                                  form.setValue("agreement_confirmation", checkbox.checked);
                                  
                                  // Update container style
                                  const container = document.getElementById("consent-box");
                                  if (container) {
                                    container.style.backgroundColor = checkbox.checked ? "#EFF6FF" : "white";
                                    container.style.borderColor = checkbox.checked ? "#93C5FD" : "#E5E7EB";
                                  }
                                  
                                  // Update submit button state
                                  const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                                  if (submitButton) {
                                    submitButton.disabled = !checkbox.checked;
                                  }
                                }}
                              />
                              <div className="font-semibold text-gray-700">
                                Submission Consent <span className="text-red-500">*</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pl-8">
                            <p className="text-gray-600 text-sm">
                              I, <span className="font-bold">Chris James</span>, in my capacity as an authorized representative of <span className="font-bold">ExampleFinTechCompany</span>, do hereby:
                            </p>
                            <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
                              <li>Certify that all information provided in this form is complete, accurate, and truthful to the best of my knowledge;</li>
                              <li>Consent to the processing of this data in accordance with Invela's accreditation and verification procedures;</li>
                              <li>Acknowledge that providing false or misleading information may result in rejection of the application or termination of services.</li>
                            </ul>
                          </div>
                        </div>
                        
                        {/* Navigation buttons */}
                        <div className="flex justify-between mt-8">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveSection(activeSection - 1)}
                            disabled={activeSection === 0}
                            className="flex items-center gap-1"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          
                          <div className="flex gap-2">
                            {onCancel && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                              >
                                Cancel
                              </Button>
                            )}
                            
                            <Button 
                              type="button" 
                              disabled={!form.getValues('agreement_confirmation')}
                              className={`flex items-center gap-1 ${form.getValues('agreement_confirmation') ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                              onClick={() => {
                                // TEST ALERT to see if the button works at all
                                alert('SUBMIT BUTTON CLICKED - Testing the button event');
                                
                                // Add extensive logging for debugging
                                console.log('[KYB Form] Submit button clicked for final submission');
                                
                                // Set the submission flag explicitly 
                                form.setValue('explicitSubmission', true);
                                
                                // Show immediate feedback
                                toast({
                                  title: 'Processing Submission',
                                  description: 'TEST TOAST - Working on submitting your data...',
                                  variant: 'default',
                                });
                                
                                // Try to call parent handler directly
                                try {
                                  if (onSubmit) {
                                    console.log('[KYB Form] Calling parent component onSubmit handler directly');
                                    const formData = form.getValues();
                                    onSubmit({...formData, explicitSubmission: true});
                                    
                                    toast({
                                      title: 'Direct submission attempt',
                                      description: 'Attempted direct handler call',
                                      variant: 'default',
                                    });
                                  } else {
                                    console.error('[KYB Form] No onSubmit handler provided');
                                    toast({
                                      title: 'Submission Error',
                                      description: 'No submission handler available',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error) {
                                  console.error('[KYB Form] Error in submission:', error);
                                  toast({
                                    title: 'Submission Error',
                                    description: 'An error occurred during submission',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              Submit
                              <Check className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Calculate starting question number based on previous sections
                const previousSectionsFieldCount = sections
                  .slice(0, index)
                  .filter(s => s.id !== 'review-section')
                  .reduce((count, prevSection) => 
                    count + fields.filter(f => f.section === prevSection.id).length, 0);
                  
                return (
                  <div
                    key={section.id}
                    className={index === activeSection ? 'block' : 'hidden'}
                  >
                    <SectionContent
                      section={section}
                      fields={fields.filter(field => field.section === section.id)}
                      template={template || undefined}
                      onFieldChange={handleFieldChange}
                      startingQuestionNumber={previousSectionsFieldCount + 1} // Pass the starting number
                    />
                    
                    {/* Navigation buttons for section pages */}
                    <div className="flex justify-between mt-8">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                        disabled={activeSection === 0}
                        className="flex items-center gap-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      {activeSection === allSections.length - 2 ? (
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => setActiveSection(allSections.length - 1)}
                          disabled={overallProgress < 100}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                        >
                          Final Review
                          <Eye className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => setActiveSection(Math.min(allSections.length - 1, activeSection + 1))}
                          disabled={activeSection === allSections.length - 1}
                          className="flex items-center gap-1"
                        >
                          Next
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};