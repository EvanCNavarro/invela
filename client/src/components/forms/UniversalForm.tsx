import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast, useToast } from '@/hooks/use-toast';
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
  ArrowUp,
  Download,
  Eye,
  Check,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import our new improved hooks and components
import { useFormDataManager } from '@/hooks/form/use-form-data-manager';
import { useFormStatus, SectionStatus } from '@/hooks/form/use-form-status';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import FormProgressBar from './FormProgressBar';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { useUser, User as UserFromHook } from '@/hooks/useUser';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { UniversalSuccessModal, SubmissionResult, SubmissionAction } from './UniversalSuccessModal';
import confetti from 'canvas-confetti';

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
  taskStatus?: string;
  taskMetadata?: Record<string, any>;
  initialData?: FormData;
  taskTitle?: string; // Title of the task from task-page
  companyName?: string; // Company name for display in the header
  fileId?: number | null; // For download functionality
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
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
  initialData = {},
  taskTitle,
  companyName,
  fileId,
  onSubmit,
  onCancel,
  onProgress,
  onDownload
}) => {
  // Get user and company data for the consent section
  const { user } = useUser();
  const { company } = useCurrentCompany();
  
  // Initialize the toast hook to get the dismiss function
  const { dismiss } = useToast();
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>({
    completedActions: []
  });
  
  // Log the user object to debug what fields are available
  useEffect(() => {
    if (user) {
      console.log('User data from API:', user);
    }
  }, [user]);
  
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
  
  // Initial agreement confirmation initialization happens later
  // after activeSection and allSections are defined
  
  // Function to get current form values for status calculation
  const getFormValues = useCallback(() => {
    return formService ? formService.getFormData() : formData;
  }, [formService, formData]);
  
  // Create and manage the Review & Submit section first
  const [allSections, setAllSections] = useState<FormSection[]>([]);
  
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
        
        // Fetch fields from the service
        try {
          const serviceFields = formService.getFields();
          
          if (serviceFields && serviceFields.length > 0) {
            logger.info(`Loaded ${serviceFields.length} fields from form service`);
            setFields(sortFields(serviceFields));
          } else {
            logger.warn('No fields returned from form service (empty array or null)');
            setFields([]);
          }
        } catch (fieldError) {
          logger.error('Error getting fields from form service:', fieldError);
          setFields([]);
        }
        
        // Fetch sections from the service
        try {
          const serviceSections = formService.getSections();
          
          if (serviceSections && serviceSections.length > 0) {
            logger.info(`Loaded ${serviceSections.length} sections from form service`);
            
            // Convert to navigation sections and sort
            const navigationSections = toNavigationSections(serviceSections);
            // Force type as FormSection[] to satisfy TypeScript
            setSections(sortSections(navigationSections as any));
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
  }, [formService, template]);
  
  // Register the agreement confirmation field once when the form is created
  useEffect(() => {
    if (!form) return;
    
    // Register the field with form and set initial value to true
    form.register("agreement_confirmation");
    
    // Make sure this runs only once on form initialization
    const timer = setTimeout(() => {
      form.setValue("agreement_confirmation", true, { 
        shouldValidate: true,
        shouldDirty: false,
      });
      console.log("Agreement confirmation initialized to TRUE");
    }, 0);
    
    return () => clearTimeout(timer);
  }, [form]);
  
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
  
  // Auto-navigate to review section for ready_for_submission tasks - ONLY ON INITIAL LOAD
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  useEffect(() => {
    // Don't run this effect until allSections is populated
    if (!allSections.length || initialLoadComplete) return;
    
    if (
      taskStatus === 'ready_for_submission' && 
      allSections.length > 1 && 
      activeSection !== allSections.length - 1 && 
      overallProgress === 100
    ) {
      // If task is ready for submission, form is complete, and we're not on the review page,
      // automatically navigate to the review page ONLY ON INITIAL LOAD
      console.log('[UniversalForm] Task is ready for submission, navigating to review section (initial load)');
      
      // Set a slight delay to ensure the form is fully rendered
      setTimeout(() => {
        setActiveSection(allSections.length - 1);
        setInitialLoadComplete(true); // Mark initial load as complete to prevent future auto-navigation
      }, 300);
    } else {
      // If we don't need to auto-navigate, still mark initial load as complete
      setInitialLoadComplete(true);
    }
  }, [taskStatus, allSections, activeSection, overallProgress, setActiveSection, initialLoadComplete]);

  // Handle field change events
  const handleFieldChange = useCallback((name: string, value: any) => {
    logger.debug(`Field change: ${name} = ${value}`);
    updateField(name, value);
    
    // Refresh status after a short delay to allow form data to update
    setTimeout(() => {
      refreshStatus();
    }, 100);
  }, [updateField, refreshStatus]);
  
  // Handle download action for different formats
  const handleDownload = useCallback((format: 'json' | 'csv' | 'txt') => {
    if (onDownload) {
      // If parent provided download handler, use it
      onDownload(format);
    } else if (fileId) {
      // Otherwise handle download internally if we have a fileId
      logger.info(`Downloading file ${fileId} in ${format} format`);
      
      // Implementation copied from task-page.tsx's download handler
      fetch(`/api/files/${fileId}/download?format=${format}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `compliance_data_${taskType}_${new Date().toISOString().split('T')[0]}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        })
        .catch(err => {
          logger.error('[UniversalForm] Download error:', err);
          toast({
            title: "Download Failed",
            description: "Could not download the file. Please try again later.",
            variant: "destructive",
          });
        });
    } else {
      // No file ID and no download handler
      toast({
        title: "Download Unavailable",
        description: "No downloadable file is available for this form.",
        variant: "destructive",
      });
    }
  }, [onDownload, fileId, taskType, toast]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormData) => {
    // Create a variable to store the toast id, accessible in both try/catch blocks
    let submittingToastId: { id: string; dismiss: () => void; update: (props: any) => void } | null = null;
    
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
      
      // Show immediate toast notification to indicate form is being processed
      submittingToastId = toast({
        title: "Submitting Form...",
        description: "Please wait while we process your submission.",
        variant: "default",
      });
      
      logger.info('Form submitted');
      
      // First save the current progress
      await saveProgress();
      
      // Set successful submission result with detailed completion actions
      const completedActions = [
        {
          type: "task_completion",
          description: "Task Completed",
          data: { 
            details: "Your form has been successfully submitted and marked as complete."
          }
        }
      ];
      
      // Add file generation action if applicable
      if (fileId) {
        completedActions.push({
          type: "file_generation",
          description: `${taskType.toUpperCase()} Form file created`,
          data: { 
            details: "The form data has been saved as a document in your file vault."
          }
        });
      }
      
      // Add file vault unlocked action for KYB form
      if (taskType === 'kyb' || taskType === 'company_kyb') {
        completedActions.push({
          type: "file_vault_unlocked",
          description: "File Vault unlocked",
          data: { 
            details: "You now have access to upload and manage documents in the File Vault." 
          }
        });
      }
      
      // Add next task unlocked action
      completedActions.push({
        type: "next_task",
        description: "Next task unlocked",
        data: { 
          details: "You can now proceed to the next step in your onboarding process."
        }
      });
      
      // Set submission result following the SubmissionResult interface
      const numericFileId = fileId && typeof fileId === 'number' ? fileId : 
                           fileId && typeof fileId === 'string' ? parseInt(fileId, 10) : undefined;
      
      setSubmissionResult({
        fileId: numericFileId,
        completedActions,
        taskId: taskId ? Number(taskId) : undefined,
        taskStatus: 'completed'
      });
      
      // Dismiss the submitting toast
      submittingToastId.dismiss();
      
      // Show success toast notification
      toast({
        title: "Form Submitted Successfully",
        description: "Your form has been submitted successfully.",
        variant: "success",
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Then call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data);
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      
      // Dismiss the submitting toast if it exists
      if (submittingToastId) {
        submittingToastId.dismiss();
      }
      
      // Show error toast
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  }, [overallProgress, saveProgress, onSubmit, toast]);
  
  // Handle cancel button click
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);
  
  // If the form is still loading, show a loading indicator
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <LoadingSpinner />
        <div className="mt-4 text-muted-foreground">Loading form...</div>
      </div>
    );
  }
  
  // If there was an error loading the form, show an error message
  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-md text-red-700">
        <h3 className="font-medium mb-2">Error Loading Form</h3>
        <p>{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    );
  }
  
  // Check if form is submitted or completed
  const isSubmitted = taskStatus === 'submitted' || taskStatus === 'completed';
  
  // Format submission date if available in metadata
  const submissionDate = taskMetadata?.submissionDate 
    ? new Date(taskMetadata.submissionDate).toLocaleDateString() 
    : undefined;
    
  // Resolve title and company name values for display
  const displayTitle = taskTitle || formTitle;
  const displayCompanyName = companyName || (taskMetadata?.companyName || taskMetadata?.company?.name || '');
  
  // If task is KYB, append the appropriate task title
  const headerTitle = taskType === 'kyb' || taskType === 'company_kyb' 
    ? `KYB Form: ${displayCompanyName}` 
    : displayTitle;
    
  // Create appropriate subtitle based on task type
  const headerSubtitle = taskType === 'kyb' || taskType === 'company_kyb'
    ? `Submit KYB (Know Your Business) details to verify "${displayCompanyName}"`
    : taskType === 'security' || taskType === 'security_assessment'
      ? `Complete security assessment for "${displayCompanyName}"`
      : taskType === 'card' || taskType === 'company_card'
        ? `Complete card application for "${displayCompanyName}"`
        : formDescription;

  return (
    <div className="w-full mx-auto">
      {/* Gray header box with title, subtitle, and download button */}
      <div className="bg-[#F2F5F7] rounded-lg shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-xl font-semibold">{headerTitle}</h2>
            <p className="text-sm text-gray-500">{headerSubtitle}</p>
            {isSubmitted && submissionDate && (
              <p className="text-xs text-gray-500 mt-1">Submitted on {submissionDate}</p>
            )}
          </div>
          
          {isSubmitted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('json')}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Download as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('csv')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('txt')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download as TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
              {/* Progress bar showing overall completion */}
              <div className="mb-3">
                <FormProgressBar progress={overallProgress} />
              </div>
              
              {/* Section navigation tabs */}
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
              
              {/* Form content */}
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
                  {allSections.map((section, index) => {
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
                                  const currentValue = form.getValues("agreement_confirmation");
                                  form.setValue("agreement_confirmation", !currentValue, { shouldValidate: true });
                                }}
                                className={cn(
                                  "border rounded-md p-4 cursor-pointer transition-colors",
                                  form.watch("agreement_confirmation") 
                                    ? "bg-blue-25 border-blue-100" // Very light blue background when checked
                                    : "bg-white hover:bg-gray-50"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-1">
                                    <Controller
                                      name="agreement_confirmation"
                                      control={form.control}
                                      render={({ field }) => (
                                        <input
                                          id="agreement_confirmation"
                                          type="checkbox"
                                          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                          checked={field.value === true}
                                          onChange={(e) => field.onChange(e.target.checked)}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="font-semibold text-gray-800">
                                      Submission Consent <span className="text-red-500">*</span>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      I, <span className="font-semibold">{
                                        // Try to get the user's name with proper fallback to "the authorized representative"
                                        (user?.full_name || 
                                         (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : null) ||
                                         user?.name || 
                                         'the authorized representative')
                                      }</span>, in my capacity 
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
                    
                    {/* Final Review button - only shown on the last section before Review & Submit */}
                    {activeSection === allSections.length - 2 && overallProgress === 100 && (
                      <Button 
                        type="button"
                        variant="default" // Changed to primary button instead of outline
                        className="flex items-center gap-1"
                        onClick={() => {
                          setActiveSection(allSections.length - 1); // Navigate to Review & Submit
                        }}
                      >
                        Final Review <Eye className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Show different button based on current section and whether we're on review page */}
                    {/* Review button section */}
                    {activeSection === allSections.length - 1 && (
                      <>
                        {form.getValues("agreement_confirmation") && overallProgress === 100 ? (
                          <Button
                            type="submit"
                            className="bg-primary"
                          >
                            Submit <Check className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  disabled={true}
                                  className="bg-primary/50"
                                >
                                  Submit <Check className="ml-2 h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>{overallProgress < 100 ? "Please complete all required fields" : "Please confirm agreement"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                    
                    {/* Next button for normal sections */}
                    {activeSection < allSections.length - 1 && activeSection !== allSections.length - 2 && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any form submission
                          setActiveSection(activeSection + 1);
                        }}
                        className="flex items-center gap-1"
                      >
                        Next <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Next button for second-to-last section */}
                    {activeSection === allSections.length - 2 && overallProgress < 100 && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any form submission
                          setActiveSection(activeSection + 1);
                        }}
                        className="flex items-center gap-1"
                      >
                        Next <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
      
      {/* Universal Success Modal */}
      <UniversalSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        taskType={taskType}
        companyName={company?.name || 'your company'}
        submissionResult={submissionResult}
      />
    </div>
  );
};

export default UniversalForm;