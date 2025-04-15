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
  Check
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
import { CheckCircle } from 'lucide-react';

import SectionContent from './SectionContent';

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
  
  // We'll use React Hook Form for all form state management
  
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
  
  // Set agreement_confirmation to true by default
  useEffect(() => {
    if (dataHasLoaded && form) {
      // Initialize agreement confirmation to true by default
      if (form.getValues("agreement_confirmation") === undefined) {
        form.setValue("agreement_confirmation", true, { shouldValidate: true });
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
          const serviceSections = formService.getSections();
          logger.info(`Sections result type: ${typeof serviceSections}`);
          logger.info(`Is sections array: ${Array.isArray(serviceSections)}`);
          
          if (serviceSections && serviceSections.length > 0) {
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
        title: 'Submitting KYB Form.',
        description: 'Please wait while we process your submission...',
      });
      
      // First save the current progress
      await saveProgress();
      
      // Then call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data);
      } else {
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
  }, [saveProgress, onSubmit, overallProgress]);
  
  // Handle cancellation
  const handleCancel = useCallback(() => {
    logger.info('Form cancelled');
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);
  
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
    
    // Fallback descriptions based on task type
    const descriptions: Record<string, string> = {
      'kyb': 'Know Your Business form for company onboarding',
      'company_kyb': 'Know Your Business form for company onboarding',
      'card': 'Card application form for company payment methods',
      'company_card': 'Card application form for company payment methods',
      'security': 'Security assessment form for risk evaluation',
      'security_assessment': 'Security assessment form for risk evaluation'
    };
    
    return descriptions[taskType] || 'Please complete all required information';
  }, [template, taskType]);
  
  // Render full loading state
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
          {/* Progress bar showing overall completion - moved to gray area above tabs */}
          <div className="mb-3">
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
                                  <AccordionContent className="px-4 pb-4">
                                    <div className="space-y-4 pt-2">
                                      {sectionFields.map((field, fieldIndex) => {
                                        const value = form.getValues(field.key);
                                        const hasValue = value !== undefined && value !== null && value !== '';
                                        
                                        // Calculate continuous question number across all sections
                                        const previousFieldsCount = sections
                                          .slice(0, sectionIndex)
                                          .reduce((count, prevSection) => 
                                            count + fields.filter(f => f.section === prevSection.id).length, 0);
                                        const continuousQuestionNumber = previousFieldsCount + fieldIndex + 1;
                                        
                                        return (
                                          <div key={field.key} className="flex flex-col space-y-1">
                                            <span className="text-sm font-medium text-gray-700">
                                              {continuousQuestionNumber}. {field.question || field.label}
                                            </span>
                                            <div className={cn(
                                              "p-2 border rounded min-h-[2rem]",
                                              hasValue 
                                                ? "bg-white border-gray-200" 
                                                : "bg-gray-50 border-gray-200"
                                            )}>
                                              {hasValue 
                                                ? (typeof value === 'object' ? JSON.stringify(value) : value.toString())
                                                : <span className="text-gray-400 italic">No answer provided</span>
                                              }
                                            </div>
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
                        
                        {/* Final agreement checkbox with default checked state */}
                        <div className="mt-8 space-y-4">
                          <div 
                            onClick={() => {
                              // Toggle when clicking anywhere in the block
                              const newValue = !form.getValues("agreement_confirmation");
                              form.setValue("agreement_confirmation", newValue, { shouldValidate: true });
                            }}
                            className={cn(
                              "border rounded-md p-4 cursor-pointer transition-colors",
                              form.getValues("agreement_confirmation") 
                                ? "bg-blue-50 border-blue-200" // Lighter blue background when checked
                                : "bg-white hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                <input
                                  id="agreement_confirmation"
                                  name="agreement_confirmation"
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={!!form.getValues("agreement_confirmation")}
                                  onChange={() => {}} // Controlled by parent div onClick
                                  onClick={(e) => {
                                    // Stop propagation to prevent double toggle
                                    e.stopPropagation();
                                    // Toggle directly here
                                    const newValue = !form.getValues("agreement_confirmation");
                                    form.setValue("agreement_confirmation", newValue, { shouldValidate: true });
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="font-semibold text-gray-800">
                                  Submission Consent <span className="text-red-500">*</span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  I, <span className="font-semibold">{user?.name || user?.email || 'the authorized representative'}</span>, in my capacity 
                                  as an authorized representative of <span className="font-semibold">{company?.name || 'the company'}</span>, do 
                                  hereby:
                                </p>
                                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                                  <li>Certify that all information provided in this form is complete, accurate, and truthful to the best of my knowledge;</li>
                                  <li>Consent to the processing of this data in accordance with Invela's accreditation and verification procedures;</li>
                                  <li>Acknowledge that providing false or misleading information may result in rejection of the application or termination of services.</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Regular section content
                // Calculate the starting question number for this section
                const previousSectionsFieldCount = sections
                  .slice(0, index)
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
                  </div>
                );
              })}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (activeSection > 0) {
                    setActiveSection(activeSection - 1);
                  }
                }}
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
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}
                
                {/* Show different button based on current section and whether we're on review page */}
                {(() => {
                  const isReviewPage = activeSection === allSections.length - 1;
                  const isLastRegularPage = activeSection === sections.length - 1;
                  
                  // If on the review page, show Submit button with tooltip when disabled
                  if (isReviewPage) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button"
                              onClick={form.handleSubmit(handleSubmit)}
                              disabled={!form.getValues("agreement_confirmation")}
                              className="flex items-center gap-1"
                            >
                              Submit
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          {!form.getValues("agreement_confirmation") && (
                            <TooltipContent>
                              <p>Please check the Submission Consent box to enable submission</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  
                  // If on last regular page, show Final Review button
                  if (isLastRegularPage) {
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                // Only navigate to review section if all fields are complete
                                if (overallProgress === 100) {
                                  // Navigate to the review section (which is the last section in allSections)
                                  setActiveSection(allSections.length - 1);
                                } else {
                                  toast({
                                    title: "Form incomplete",
                                    description: "Please complete all required fields before proceeding to review.",
                                    variant: "warning",
                                  });
                                }
                              }}
                              className="flex items-center gap-1"
                              disabled={overallProgress < 100}
                            >
                              Final Review
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          {overallProgress < 100 && (
                            <TooltipContent>
                              <p>Complete all required fields ({Math.round(100 - overallProgress)}% remaining) to proceed to final review</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  
                  // Otherwise show regular Next button
                  return (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent any form submission
                        setActiveSection(activeSection + 1);
                      }}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UniversalForm;
