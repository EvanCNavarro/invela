import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

// Import WebSocket-based form submission listener
import FormSubmissionListener from './FormSubmissionListener';
import { FormSubmissionEvent } from '@/hooks/use-form-submission-events';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';

import SectionContent from './SectionContent';
import { handleAutoFill } from './handleAutoFill';
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

// Task interface for the task query
interface Task {
  id: number;
  status: string;
  progress: number;
  submissionDate?: string;
}

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
 * An improved UniversalForm component with reliable data management, status tracking,
 * and WebSocket-based form submission events
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
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for WebSocket-based form submission
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionEvent | null>(null);
  
  // Query for task data
  const { data: task } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId, // Only run when taskId is provided
  });
  
  // Reset submission state when task status changes to submitted
  useEffect(() => {
    if (task?.status === 'submitted' && isSubmitting) {
      logger.info('Task status is now submitted, resetting submission state');
      setIsSubmitting(false);
    }
  }, [task?.status, isSubmitting]);
  
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
  // and sync the agreementChecked React state with form value
  useEffect(() => {
    if (dataHasLoaded && form) {
      // Initialize agreement to false if undefined
      const currentValue = form.getValues('agreement_confirmation');
      
      // If value is undefined in the form, initialize it to false
      if (currentValue === undefined) {
        form.setValue('agreement_confirmation', false, { shouldValidate: false });
        setAgreementChecked(false);
      } else {
        // If there is a value, sync React state with it
        setAgreementChecked(!!currentValue);
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
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormData) => {
    try {
      // Import and use our enhanced submission tracker
      logger.info(`Form submission initiated for task ID: ${taskId}, type: ${taskType}`);
      
      // Verify user consent
      if (!data.agreement_confirmation) {
        toast({
          title: 'Consent Required',
          description: 'Please check the submission consent box to continue.',
          variant: 'destructive',
        });
        return;
      }
      
      // Call the parent onSubmit if provided
      if (onSubmit) {
        logger.info('Calling parent onSubmit handler');
        await onSubmit(data);
      }
      
      // If no taskId, we can't submit to the server
      if (!taskId) {
        logger.warn('No taskId provided for form submission');
        return;
      }
      
      // If formService is not available, show error
      if (!formService) {
        logger.error('Form service not available for submission');
        toast({
          title: 'Submission Error',
          description: 'Form service not available. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }
      
      // Set submission in progress
      setIsSubmitting(true);
      
      logger.info(`Submitting form data to server for task ID: ${taskId}`);
      
      try {
        // Submit form to server
        const result = await formService.submitForm(taskId, data);
        
        logger.info(`Form submission result:`, result);
        
        if (result.success) {
          // Show success notification - but actual status updates will come via WebSocket
          toast({
            title: 'Form Submitted',
            description: 'Your form has been successfully submitted.',
            variant: 'default',
          });
          
          // Note: We don't set isSubmitting to false here because we'll do that
          // when we receive the WebSocket success event
        } else {
          // Show error notification
          setIsSubmitting(false);
          toast({
            title: 'Submission Failed',
            description: result.message || 'An error occurred during form submission. Please try again later.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        setIsSubmitting(false);
        const message = err instanceof Error ? err.message : 'An unknown error occurred during submission';
        logger.error('Form submission error:', message);
        
        toast({
          title: 'Submission Error',
          description: message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      logger.error('Form submission handler error:', message);
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  }, [taskId, taskType, formService, onSubmit]);
  
  // Handle form cancellation
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
        title: 'Error',
        description: 'Task ID is required for demo auto-fill',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await handleAutoFill({
        taskId,
        taskType,
        form,
        resetForm,
        updateField,
        refreshStatus,
        saveProgress,
        onProgress,
        formService,
        setForceRerender
      });
      
      // Refresh the form status
      refreshStatus();
      
      // Automatically navigate to the review section after auto-fill
      if (allSections.length > 0) {
        setActiveSection(allSections.length - 1);
      }
      
      // Check agreement by default for demo auto-fill
      form.setValue('agreement_confirmation', true, { shouldValidate: false });
      setAgreementChecked(true);
      
    } catch (error) {
      console.error('Error during demo auto-fill:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during demo auto-fill',
        variant: 'destructive',
      });
    }
  }, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService, setForceRerender, allSections, setActiveSection]);
  
  // Handle clearing form fields
  const handleClearFields = useCallback(async () => {
    try {
      await handleClearFieldsUtil({
        form,
        resetForm,
        updateField,
        refreshStatus,
        saveProgress,
        onProgress,
        formService
      });
      
      // Reset agreement checkbox state
      form.setValue('agreement_confirmation', false, { shouldValidate: false });
      setAgreementChecked(false);
      
      // Refresh the form status
      refreshStatus();
      
      // Navigate to the first section after clearing
      setActiveSection(0);
      
    } catch (error) {
      console.error('Error clearing fields:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while clearing the form',
        variant: 'destructive',
      });
    }
  }, [form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService, setActiveSection]);
  
  // Handle bulk update through the KY3P service
  const handleBulkUpdate = useCallback(async (fieldData: Record<string, any>) => {
    if (!formService || !taskId) return;
    
    try {
      return await formService.bulkUpdate(taskId, fieldData);
    } catch (error) {
      logger.error('Bulk update error:', error);
      return false;
    }
  }, [formService, taskId]);

  // Handle WebSocket form submission events
  const handleSubmissionSuccess = useCallback((event: FormSubmissionEvent) => {
    logger.info(`Submission success event received for task ID: ${event.taskId}`, event);
    setSubmissionResult(event);
    setShowSuccessModal(true);
    setIsSubmitting(false);
    
    // Update form status if needed
    refreshStatus();
    
    // Optional: Toast notification
    toast({
      title: 'Submission Successful',
      description: 'Your form has been successfully submitted.',
      variant: 'default',
    });
  }, [refreshStatus]);
  
  const handleSubmissionError = useCallback((event: FormSubmissionEvent) => {
    logger.error(`Submission error event received for task ID: ${event.taskId}`, event);
    setIsSubmitting(false);
    
    // Toast notification for error
    toast({
      title: 'Submission Error',
      description: event.message || 'An error occurred during form submission. Please try again.',
      variant: 'destructive',
    });
  }, []);
  
  const handleSubmissionInProgress = useCallback((event: FormSubmissionEvent) => {
    logger.info(`Submission in-progress event received for task ID: ${event.taskId}`, event);
    
    // Show processing status in toast if needed
    if (event.progress) {
      toast({
        title: 'Processing Submission',
        description: `${event.message || 'Processing your submission...'} (${event.progress}%)`,
        variant: 'default',
      });
    }
  }, []);

  return (
    <div className="universal-form-container w-full max-w-4xl mx-auto">
      {/* WebSocket Form Submission Listener */}
      {taskId && (
        <FormSubmissionListener
          taskId={taskId}
          formType={taskType}
          onSuccess={handleSubmissionSuccess}
          onError={handleSubmissionError}
          onInProgress={handleSubmissionInProgress}
          showToasts={true}
        />
      )}
      
      {/* Submission Success Modal */}
      {showSuccessModal && submissionResult && (
        <SubmissionSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          taskId={taskId || 0}
          taskType={taskType}
          submissionDate={submissionResult.timestamp || new Date().toISOString()}
        />
      )}
      
      {loading && (
        <div className="flex items-center justify-center h-full py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading form...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error loading form</p>
          <p>{error}</p>
        </div>
      )}
      
      {!loading && !error && formService && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column: Section Navigation */}
              <div className="w-full md:w-1/4">
                <ResponsiveSectionNavigation
                  sections={allSections}
                  activeSection={activeSection}
                  sectionStatuses={sectionStatuses}
                  completedSections={completedSections}
                  onSectionChange={setActiveSection}
                />
                
                {/* Form Actions Card */}
                <Card className="mt-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Form Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 flex flex-col">
                    {/* Demo auto-fill button - only visible when form is empty */}
                    {overallProgress < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleDemoAutoFillClick}
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Demo Auto-fill
                      </Button>
                    )}
                    
                    {/* Clear fields button - only visible when form has data */}
                    {overallProgress > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleClearFields}
                      >
                        Clear Fields
                      </Button>
                    )}
                    
                    {/* Form Progress Indicator */}
                    <FormProgressBar progress={overallProgress} />
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column: Form Sections */}
              <div className="w-full md:w-3/4">
                {allSections.map((section, index) => {
                  // Handle the special "review-section" for Review & Submit
                  if (section.id === 'review-section') {
                    return (
                      <div
                        key={section.id}
                        className={index === activeSection ? 'block' : 'hidden'}
                      >
                        <div className="space-y-6">
                          <h2 className="text-2xl font-semibold mb-6">
                            {section.title}
                          </h2>
                          
                          <p className="text-gray-600 mb-4">
                            {section.description || 'Please review your answers before submitting the form.'}
                          </p>
                          
                          {/* Display review of filled sections */}
                          <Accordion
                            type="multiple"
                            defaultValue={sectionStatuses
                              .filter(status => status.completionPercentage > 0)
                              .map(status => status.sectionId)
                            }
                            className="space-y-2"
                          >
                            {sections.map((reviewSection, reviewIdx) => {
                              const sectionStatus = sectionStatuses.find(
                                status => status.sectionId === reviewSection.id
                              );
                              
                              // Skip empty sections in the review
                              if (!sectionStatus || sectionStatus.completionPercentage === 0) {
                                return null;
                              }
                              
                              const isCompleted = sectionStatus.status === 'completed';
                              
                              return (
                                <AccordionItem
                                  key={`review-${reviewSection.id}`}
                                  value={reviewSection.id}
                                  className="border rounded-md bg-gray-50"
                                >
                                  <AccordionTrigger className="px-4 py-3">
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center">
                                        <span className="font-semibold">{reviewSection.title}</span>
                                        {isCompleted && (
                                          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                      <span className="text-sm text-gray-500">
                                        {sectionStatus.completionPercentage}% complete
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-3">
                                    <div className="space-y-2">
                                      {/* Display field values for this section */}
                                      {fields
                                        .filter(field => field.section === reviewSection.id)
                                        .map(field => {
                                          const fieldValue = form.getValues(field.id);
                                          
                                          // Skip empty fields in the review
                                          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
                                            return null;
                                          }
                                          
                                          return (
                                            <div key={`review-field-${field.id}`} className="py-2">
                                              <div className="font-medium text-gray-700">
                                                {field.displayName || field.label}
                                                {field.required && (
                                                  <span className="text-red-500 ml-1">*</span>
                                                )}
                                              </div>
                                              <div className="mt-1 text-sm text-gray-600">
                                                {typeof fieldValue === 'boolean'
                                                  ? fieldValue
                                                    ? 'Yes'
                                                    : 'No'
                                                  : Array.isArray(fieldValue)
                                                  ? fieldValue.join(', ')
                                                  : fieldValue}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => setActiveSection(reviewIdx)}
                                      >
                                        Edit Section
                                      </Button>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                          
                          {/* Submission Consent */}
                          <div
                            className={`mt-8 p-4 border rounded-md ${
                              agreementChecked
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => {
                              // Toggle the agreement on div click
                              const newValue = !agreementChecked;
                              setAgreementChecked(newValue);
                              
                              // Also update the form value for consistency and submission handling
                              form.setValue("agreement_confirmation", newValue);
                              
                              // Set explicit submission flag for tracking when enabled
                              if (newValue) {
                                form.setValue("explicitSubmission", true);
                              }
                            }}
                            id="consent-box"
                          >
                            <div className="flex items-center mb-2">
                              <div className="flex flex-row items-start space-x-3 space-y-0 m-0">
                                <input 
                                  type="checkbox" 
                                  id="consent-checkbox"
                                  checked={agreementChecked}
                                  className="mt-0.5 h-4 w-4" 
                                  onChange={(e) => {
                                    const newChecked = e.target.checked;
                                    
                                    // Update React state
                                    setAgreementChecked(newChecked);
                                    
                                    // Also update form value for consistency
                                    form.setValue("agreement_confirmation", newChecked);
                                    
                                    // Set explicit submission flag for tracking
                                    if (newChecked) {
                                      form.setValue("explicitSubmission", true);
                                    }
                                  }}
                                  onClick={(e) => {
                                    // Prevent click from bubbling up to parent div
                                    e.stopPropagation();
                                  }}
                                />
                                <div className="font-semibold text-gray-700">
                                  Submission Consent <span className="text-red-500">*</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pl-8">
                              <p className="text-gray-600 text-sm">
                                I, <span className="font-bold">{user?.name || 'User'}</span>, in my capacity as an authorized representative of <span className="font-bold">{company?.name || 'Company'}</span>, do hereby:
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
                                disabled={!agreementChecked || isSubmitting}
                                className={`flex items-center gap-1 ${
                                  !agreementChecked || isSubmitting 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                onClick={() => {
                                  // Add structured logging for tracking form submission
                                  logger.info(`Universal Form Submit button clicked for task type: ${taskType}, task ID: ${taskId}`);
                                  
                                  // Set submission state to show loading
                                  setIsSubmitting(true);
                                  
                                  // Set the submission flag explicitly to ensure proper status tracking
                                  form.setValue('explicitSubmission', true);
                                  
                                  // Save submission timestamp
                                  form.setValue('submissionTimestamp', new Date().toISOString());
                                  
                                  // Show immediate feedback to the user
                                  toast({
                                    title: 'Processing Submission',
                                    description: 'Working on submitting your data...',
                                    variant: 'default',
                                  });
                                  
                                  try {
                                    // Correctly trigger the form's submit event to use form.handleSubmit(handleSubmit)
                                    logger.info(`Triggering form submit for ${taskType} form with task ID: ${taskId}`);
                                    
                                    // Find the form element and submit it to trigger the form.handleSubmit flow
                                    const formElement = document.querySelector('form');
                                    if (formElement) {
                                      formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                    } else {
                                      throw new Error('Form element not found in DOM');
                                    }
                                  } catch (error) {
                                    logger.error(`Error triggering form submission for ${taskType}:`, error);
                                    toast({
                                      title: 'Submission Error',
                                      description: 'An error occurred during submission. Please try again later.',
                                      variant: 'destructive',
                                    });
                                    // Reset submission state on error
                                    setIsSubmitting(false);
                                  }
                                }}
                              >
                                {isSubmitting ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    Submit
                                    <Check className="h-4 w-4 ml-1" />
                                  </>
                                )}
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
      )}
    </div>
  );
};

export default UniversalForm;