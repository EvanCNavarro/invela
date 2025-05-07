import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
import { FormSkeletonWithMode } from '@/components/ui/form-skeleton';
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
  CheckCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  ChevronUp,
  Clock
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
} from "@/components/ui/dropdown-menu";

// Import our new improved hooks and components
import { useFormDataManager } from '@/hooks/form/use-form-data-manager';
import { useFormStatus, SectionStatus } from '@/hooks/form/use-form-status';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import FormProgressBar from './FormProgressBar';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { useUser } from '@/hooks/useUser';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { userContext } from '@/lib/user-context';

// Import WebSocket-based form submission listener and related components
import { FormSubmissionListener, FormSubmissionEvent } from './FormSubmissionListener';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';

import SectionContent from './SectionContent';

// Task interface for the task query
interface Task {
  id: number;
  status: string;
  progress: number;
  submissionDate?: string;
}

// Interface for the ReadOnlyFormView component
interface ReadOnlyFormViewProps {
  taskId?: number;
  taskType: string;
  task?: Task;
  formData: FormData;
  fields: ServiceFormField[];
  sections: FormSection[];
  company?: any;
}

/**
 * ReadOnlyFormView - A component for displaying a read-only version of a form after submission
 * 
 * This displays:
 * 1. Download options in top-right (CSV, TXT, JSON)
 * 2. Submission details at the top
 * 3. All questions and answers in accordion format
 * 4. Back to Task Center and Scroll to Top buttons at bottom
 */
const ReadOnlyFormView: React.FC<ReadOnlyFormViewProps> = ({
  taskId,
  taskType,
  task,
  formData,
  fields,
  sections,
  company
}) => {
  const [, navigate] = useLocation();
  const topRef = useRef<HTMLDivElement>(null);

  // Format the submission date
  const formattedSubmissionDate = useMemo(() => {
    if (task?.submissionDate) {
      try {
        return new Date(task.submissionDate).toLocaleString();
      } catch (e) {
        return task.submissionDate;
      }
    }
    return 'Unknown';
  }, [task?.submissionDate]);

  // Helper function to scroll to top
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper function to handle downloads
  const handleDownload = (format: 'json' | 'csv' | 'txt') => {
    if (!taskId) return;
    
    // Format filename based on task type
    const formattedTaskType = taskType.replace(/_/g, '-');
    const filename = `${formattedTaskType}-form-${taskId}.${format}`;
    
    // Construct the download URL
    window.open(`/api/forms/${taskType}/${taskId}/download?format=${format}&filename=${filename}`, '_blank');
  };

  // Get formatted heading based on task type
  const getFormHeading = () => {
    const taskTypeMap: Record<string, string> = {
      'kyb': 'Know Your Business (KYB)',
      'ky3p': 'Know Your Third Party (KY3P)',
      'open_banking': 'Open Banking Assessment',
      'card': 'Card Assessment',
      'company_kyb': 'Know Your Business (KYB)',
      'security': 'Security Assessment'
    };
    
    return taskTypeMap[taskType] || taskType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="w-full mx-auto" ref={topRef}>
      <div className="bg-white border rounded-md shadow-sm">
        {/* Header with submission info and download options */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-600">
                SUBMITTED
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{getFormHeading()}</h1>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Submitted on {formattedSubmissionDate}</span>
            </div>
          </div>
          
          {/* Download dropdown */}
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
                Download as Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Form content as read-only accordions */}
        <div className="p-6">
          <Accordion type="multiple" defaultValue={sections.map(s => s.id.toString())} className="space-y-4">
            {sections.map((section, sectionIndex) => {
              // Get fields for this section
              const sectionFields = fields.filter(f => f.section === section.id);
              
              if (sectionFields.length === 0) return null;
              
              return (
                <AccordionItem 
                  key={`section-${sectionIndex}`} 
                  value={section.id.toString()}
                  className="border border-gray-200 rounded-md overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 font-medium">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-2">
                    <div className="space-y-4">
                      {sectionFields.map((field, fieldIndex) => {
                        const fieldValue = formData[field.key];
                        const displayValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '' 
                          ? String(fieldValue) 
                          : 'Not provided';
                        
                        return (
                          <div key={`field-${fieldIndex}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                            <p className="text-sm font-medium text-gray-700">
                              {field.question || field.label || field.description}
                            </p>
                            <p className="text-sm mt-1 text-gray-600">
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
        
        {/* Footer with navigation buttons */}
        <div className="flex justify-between p-6 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/task-center')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task Center
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToTop}
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            Scroll to Top
          </Button>
        </div>
      </div>
    </div>
  );
};

// Import utility functions
import UnifiedDemoAutoFill from './UnifiedDemoAutoFill';
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
  companyName?: string; // Optional company name to display in the form title
  isReadOnly?: boolean; // Flag to force read-only mode (for completed/submitted forms)
  onFormServiceInitialized?: () => void; // Callback fired when form service is initialized
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
  onProgress,
  companyName,
  isReadOnly,
  onFormServiceInitialized
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
  
  // State for WebSocket-based form submission
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionEvent | null>(null);
  const modalShownRef = useRef(false); // Ref to track if modal has been shown
  
  // Query for task data
  const { data: task, refetch: refreshTask } = useQuery<Task>({
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
  
  // CRITICAL IMPROVEMENT: Determine if form should be in read-only mode based on task status
  // This calculation is done at the very start to ensure we NEVER render editable UI for submitted forms
  const isReadOnlyMode = useMemo(() => {
    // This is our primary gate to prevent flashing of editable forms when form should be read-only
    const isSubmittedOrReadOnly = isReadOnly || 
           task?.status === 'submitted' || 
           task?.status === 'completed' || 
           !!submissionResult;
    
    if (isSubmittedOrReadOnly) {
      // Log that we're in read-only mode to help with debugging
      logger.info(`[UniversalFormNew] Form is in read-only mode: isReadOnly=${isReadOnly}, taskStatus=${task?.status}, hasSubmissionResult=${!!submissionResult}`);
    }
    
    return isSubmittedOrReadOnly;
  }, [isReadOnly, task?.status, submissionResult]);
  
  // IMPROVEMENT: Split the loading states for read-only vs editable forms
  // This prevents showing editable UI elements during read-only form loading
  const readOnlyFormDataLoaded = useMemo(() => {
    const isReady = isReadOnlyMode && dataHasLoaded && fields.length > 0 && sections.length > 0;
    if (isReadOnlyMode && !isReady) {
      logger.debug(`[UniversalFormNew] Read-only form data still loading: dataHasLoaded=${dataHasLoaded}, fields=${fields.length}, sections=${sections.length}`);
    }
    return isReady;
  }, [isReadOnlyMode, dataHasLoaded, fields.length, sections.length]);
  
  const editableFormDataLoaded = useMemo(() => {
    // Never consider editable form loaded if we're in read-only mode (prevents flash)
    if (isReadOnlyMode) return false;
    return dataHasLoaded && !isDataLoading && !loading && fields.length > 0 && sections.length > 0;
  }, [isReadOnlyMode, dataHasLoaded, isDataLoading, loading, fields.length, sections.length]);
  
  // Determine if all data has loaded - use the appropriate loader based on form mode
  const hasLoaded = useMemo(() => {
    return isReadOnlyMode ? readOnlyFormDataLoaded : editableFormDataLoaded;
  }, [isReadOnlyMode, readOnlyFormDataLoaded, editableFormDataLoaded]);
  
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
        
        // Find the appropriate form service with proper data isolation by company
        // CRITICAL DATA ISOLATION FIX: Use proper factory with company/task IDs
        logger.debug(`Looking for company-specific form service for task type: ${taskType}`);
        
        // Import to avoid circular references
        const { formServiceFactory } = await import('@/services/form-service-factory');
        
        // Get current company ID from user context
        let companyId;
        try {
          // Use the proper userContext utility instead of direct sessionStorage access
          const contextData = userContext.getContext();
          companyId = contextData?.companyId;
          if (companyId) {
            logger.info(`Data isolation: Using company ID ${companyId} from user context`);
          } else if (company?.id) {
            // Fallback to company from useCurrentCompany hook if available
            companyId = company.id;
            logger.info(`Data isolation: Using company ID ${companyId} from current company`);
          }
        } catch (error) {
          logger.warn('Error accessing user context:', error);
        }
        
        // Try to get a company-specific form service instance - WITH PROMISE HANDLING
        // Declare service variable outside the try block to maintain proper scope
        let service = null;
        
        try {
          // Get service asynchronously
          service = await formServiceFactory.getServiceInstance(taskType, companyId, taskId);
          
          if (!service) {
            // Try with mapped DB task type
            logger.debug(`No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
            service = await formServiceFactory.getServiceInstance(dbTaskType, companyId, taskId);
          }
          
          // Fall back to component factory if needed (but log a warning)
          if (!service) {
            logger.warn(`Could not create isolated form service, falling back to legacy factory`);
            service = componentFactory.getFormService(taskType);
            
            if (!service) {
              service = componentFactory.getFormService(dbTaskType);
            }
          }
          
          // If service is a Promise, await it (defensive coding)
          if (service instanceof Promise) {
            logger.debug('Service is a Promise, awaiting resolution...');
            service = await service;
          }
          
          // Log whether we got a service
          if (service) {
            // Safe access to constructor name with fallbacks
            const serviceName = service.constructor ? service.constructor.name : typeof service;
            logger.info(`Found form service: ${serviceName}`);
            
            // Set the service in state
            setFormService(service);
            
            // Signal to parent component that form service is initialized
            if (onFormServiceInitialized) {
              logger.info('Signaling form service initialization to parent component');
              onFormServiceInitialized();
            }
          } else {
            logger.error(`No form service found for ${taskType} or ${dbTaskType}`);
            throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
          }
        } catch (serviceError) {
          logger.error('Error loading form service:', serviceError);
          throw serviceError; // Re-throw to be caught by the outer try/catch
        }
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load form template';
        logger.error('Template fetch error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [taskType, taskId, company, onFormServiceInitialized]);
  
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
        
        // Send another signal after sections and fields are loaded
        // This ensures the parent knows the form is FULLY initialized
        // BUT we shouldn't be calling this in an effect that re-runs based on formService changes
        // because it would create an infinite update cycle
        // The parent component should use its own tracking mechanism
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize form';
        logger.error('Form initialization error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    initializeForm();
  }, [formService, template, onFormServiceInitialized]);
  
  // Track first load state to only auto-navigate once
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  
  // Auto-navigate to review section (when status is "ready_for_submission") or first incomplete field
  useEffect(() => {
    // Only run this effect once on initial data load and never again
    if (sections.length > 0 && !loading && fields.length > 0 && dataHasLoaded && !hasAutoNavigated) {
      logger.info('Auto-navigating form on initial load based on task status and completion');
      
      // Mark that we've performed the auto-navigation
      setHasAutoNavigated(true);
      
      // Check if task is ready for submission - if so, navigate to review section
      if (task?.status === 'ready_for_submission' && allSections.length > 0) {
        logger.info('Task status is ready_for_submission, navigating to review section');
        // Navigate to the last section (which is the review & submit section)
        setActiveSection(allSections.length - 1);
        return;
      }
      
      // If not, find the first incomplete section based on section statuses
      if (sectionStatuses.length > 0) {
        for (let i = 0; i < sectionStatuses.length; i++) {
          if (sectionStatuses[i].status !== 'completed') {
            logger.info(`Found first incomplete section: ${sections[i].title} at index ${i}`);
            setActiveSection(i);
            return;
          }
        }
        
        // If all sections are complete, go to review section
        if (allSections.length > 0) {
          logger.info('All sections are complete, navigating to review section');
          setActiveSection(allSections.length - 1);
        }
      }
    }
  }, [
    sections, 
    loading, 
    fields.length, 
    dataHasLoaded, 
    hasAutoNavigated,
    task?.status,
    allSections.length,
    sectionStatuses,
    setActiveSection
  ]);
  
  // Helpers for UI-level operations
  const handleClearFields = async () => {
    logger.info('Clear fields requested');
    
    if (!taskId) {
      logger.warn('Cannot clear fields - no task ID provided');
      return;
    }
    
    // Use centralized clear fields utility with consistent functionality across components
    await handleClearFieldsUtil({
      taskId,
      taskType,
      resetForm, 
      saveProgress, 
      refreshStatus
    });
    
    // Force component rerender after clear
    setForceRerender(prev => !prev);
    
    toast({
      title: 'Form cleared',
      description: 'All fields have been reset to their default values.',
      variant: 'default',
    });
  };
  
  // Handle submission - with validation showing which fields are incomplete
  const handleSubmit = async (data: FormData) => {
    logger.info(`Submit button clicked for ${taskType} task ${taskId}`);
    
    // Validate that we have all required fields first
    if (overallProgress < 100) {
      logger.warn(`Cannot submit form with incomplete fields: ${overallProgress}% complete`);
      
      toast({
        title: 'Form incomplete',
        description: 'Please complete all required fields before submitting.',
        variant: 'warning',
      });
      
      // Find the first incomplete section
      for (let i = 0; i < sectionStatuses.length; i++) {
        if (sectionStatuses[i].status !== 'completed') {
          setActiveSection(i); // Navigate to the first incomplete section
          break;
        }
      }
      
      return;
    }
    
    // Make sure agreement confirmation is checked  
    if (!agreementChecked) {
      logger.warn('Cannot submit form without accepting the agreement');
      
      toast({
        title: 'Agreement required',
        description: 'Please accept the agreement to submit this form.',
        variant: 'warning',
      });
      
      // Navigate to review section which contains the agreement
      setActiveSection(allSections.length - 1);
      
      return;
    }
    
    // Set form into submitting state
    setIsSubmitting(true);
    
    // Update task status to in_progress immediately for better user feedback
    if (task) {
      // Log the desired state change - but we'll rely on API and refreshTask to update the actual state
      logger.info('Task will be marked as ready_for_submission: progress=100%');
      
      // Instead of using setTask (which doesn't exist), trigger a refreshTask
      if (typeof refreshTask === 'function') {
        // Refresh task data to show latest status
        refreshTask();
      }
    }
    
    // Show submission in progress toast
    toast({
      title: 'Submitting form...',
      description: 'Please wait while your form is being submitted.',
      variant: 'default',
    });
    
    try {
      // If a custom onSubmit handler is provided, use it
      if (onSubmit) {
        logger.info('Using provided onSubmit callback');
        onSubmit(data);
        return;
      }
      
      // Otherwise, use the default API method
      if (!taskId) {
        throw new Error('Cannot submit form without a task ID');
      }
      
      // Prepare submission URL based on task type
      const submitUrl = `/api/forms/${taskType}/${taskId}/submit`;
      
      logger.info(`Submitting form data to: ${submitUrl}`);
      
      // Send the form data to the server - this now uses task-wide submissions
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Form submission failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      logger.info(`Form submitted successfully: ${JSON.stringify(result)}`);
      
      // Force refresh task multiple times to catch eventual consistency lag
      if (typeof refreshTask === 'function') {
        // Refresh immediately and then at intervals with more frequent refreshes
        refreshTask();
        
        // More frequent refreshes to ensure we catch the submitted state
        setTimeout(() => refreshTask && refreshTask(), 500);
        setTimeout(() => refreshTask && refreshTask(), 1000);
        setTimeout(() => refreshTask && refreshTask(), 2000);
        setTimeout(() => refreshTask && refreshTask(), 3000);
        setTimeout(() => refreshTask && refreshTask(), 5000);
      }
      
      // Note: The success feedback will be handled via WebSocket events now
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      logger.error(`Form submission error: ${message}`);
      
      // Show error toast
      toast({
        title: 'Submission Failed',
        description: message,
        variant: 'destructive',
      });
      
      // Reset submitting state
      setIsSubmitting(false);
    }
  };
  
  // Handle submission success via WebSocket event
  const handleSubmissionSuccess = (event: FormSubmissionEvent) => {
    logger.info(`Submission success event received: ${JSON.stringify(event)}`);
    
    // Always set the submission result with the latest data from the server
    setSubmissionResult(event);
    
    // Reset submission state
    setIsSubmitting(false);
    
    // Force task status update to ensure read-only view appears
    if (task && task.status !== 'submitted') {
      // Create an updated task with submitted status
      const updatedTask = {
        ...task,
        status: 'submitted',
        progress: 100
      };
      
      // Update the task in state
      logger.info('Updating task status to submitted');
      
      // Instead of using setTask (which doesn't exist), we'll manually trigger a refetch
      if (typeof refreshTask === 'function') {
        refreshTask();
      }
    }
    
    // Always show modal for successful submission
    setShowSuccessModal(true);
    modalShownRef.current = true;
    
    // Show success toast
    toast({
      title: 'Form Submitted Successfully',
      description: 'Your form has been submitted successfully.',
      variant: 'success',
    });
  };
  
  // Handle submission error via WebSocket event
  const handleSubmissionError = (event: FormSubmissionEvent) => {
    logger.error(`Submission error event received: ${JSON.stringify(event)}`);
    
    // Reset submission state
    setIsSubmitting(false);
    
    // Show error toast
    toast({
      title: 'Submission Failed',
      description: (event as any).message || 'An error occurred during form submission.',
      variant: 'destructive',
    });
  };
  
  // Handle submission in progress via WebSocket event
  const handleSubmissionInProgress = (event: FormSubmissionEvent) => {
    logger.info(`Submission in progress event received: ${JSON.stringify(event)}`);
    
    // Show in progress toast
    toast({
      title: 'Submission In Progress',
      description: (event as any).message || 'Your form submission is being processed...',
      variant: 'info',
    });
  };
  
  // Helper function to format form title and description
  const getFormTitle = useCallback(() => {
    const taskTypeMap: Record<string, string> = {
      'kyb': 'Know Your Business (KYB) Assessment',
      'ky3p': 'Know Your Third Party (KY3P) Assessment',
      'open_banking': 'Open Banking Assessment',
      'card': 'Card Assessment',
      'company_kyb': 'Know Your Business (KYB) Assessment',
      'security': 'Security Assessment',
    };
    
    return taskTypeMap[taskType] || taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [taskType]);
  
  const getFormDescription = useCallback(() => {
    const descriptionMap: Record<string, string> = {
      'kyb': 'Complete this form to provide essential information about your business.',
      'ky3p': 'Provide details about your organization to evaluate third-party risks.',
      'open_banking': 'Answer questions about your open banking implementation and security practices.',
      'card': 'Complete this assessment for card payment processing compliance.',
      'company_kyb': 'Complete this form to provide essential information about your business.',
      'security': 'Evaluate your security posture by completing this assessment.'
    };
    
    return descriptionMap[taskType] || `Complete the ${taskType.replace(/_/g, ' ')} form below.`;
  }, [taskType]);

  // Form title and description
  const formTitle = getFormTitle();
  const formDescription = getFormDescription();

  // Determine read-only mode first, before any other rendering logic
  // This is critical to prevent the editable form from flashing before the read-only view
  const isFormReadOnly = useMemo(() => {
    return (
      isReadOnly || 
      task?.status === 'submitted' || 
      task?.status === 'completed'
    );
  }, [isReadOnly, task?.status]);
  
  // Early loading state - show skeleton loaders while determining form state
  const formStateLoading = useMemo(() => {
    // Show skeleton if we're loading task data or waiting for field/section data
    return !task || loading || fields.length === 0;
  }, [task, loading, fields.length]);
  
  // CRITICAL: If the form is determined to be read-only and data is loaded,
  // render the read-only view immediately without any other checks
  if (isFormReadOnly && hasLoaded && !formStateLoading) {
    return (
      <div className="w-full mx-auto">
        {/* WebSocket listener is still needed for potential updates */}
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
        
        <ReadOnlyFormView
          taskId={taskId}
          taskType={taskType}
          task={task}
          formData={formData}
          fields={fields}
          sections={sections}
          company={company}
        />
      </div>
    );
  }
  
  // Render main form (for loading state or editable form)
  return (
    <div className="w-full mx-auto">
      {/* WebSocket-based Form Submission Listener */}
      {taskId && (
        <FormSubmissionListener
          taskId={taskId}
          formType={taskType}
          onSuccess={handleSubmissionSuccess}
          onError={handleSubmissionError}
          onInProgress={handleSubmissionInProgress}
          showToasts={true} // Enable toasts to fix form submission notification
        />
      )}
      
      {/* Submission Success Modal - shown via WebSocket events */}
      {submissionResult && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            modalShownRef.current = false; // Reset the modal shown ref
          }}
          title="Form Submitted Successfully"
          message={`Your ${taskType} form has been successfully submitted.`}
          actions={submissionResult.completedActions || []}
          fileName={submissionResult.fileName}
          fileId={submissionResult.fileId}
          returnPath="/task-center"
          returnLabel="Return to Task Center"
          taskType={taskType}
          onDownload={() => {
            // Handle download functionality if needed
            if (submissionResult.fileId) {
              window.open(`/api/files/${submissionResult.fileId}/download`, '_blank');
            }
          }}
        />
      )}
      
      {/* Show skeleton loader while determining form state */}
      {formStateLoading ? (
        <FormSkeletonWithMode readOnly={isFormReadOnly} />
      ) : isReadOnlyMode ? (
        // In read-only mode, either show the read-only view or skeleton until it's fully loaded
        hasLoaded ? (
          <ReadOnlyFormView
            taskId={taskId}
            taskType={taskType}
            task={task}
            formData={formData}
            fields={fields}
            sections={sections}
            company={company}
          />
        ) : (
          // Show read-only skeleton while read-only data loads
          <FormSkeletonWithMode readOnly={true} />
        )
      ) : (
        <>
          {/* Form title and subtitle */}
          <div className="bg-gray-50 p-6 rounded-t-md mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{formTitle}</h1>
            <p className="text-gray-600 mt-1">{formDescription}</p>
            
            {/* Demo buttons - Only show for demo companies */}
            {company?.isDemo && (
              <div className="flex gap-3 mt-4">
                {/* Use unified demo auto-fill component for all form types */}
                <UnifiedDemoAutoFill
                  taskId={taskId}
                  taskType={taskType}
                  form={form}
                  resetForm={resetForm}
                  updateField={updateField}
                  refreshStatus={refreshStatus}
                  saveProgress={saveProgress}
                  onProgress={onProgress}
                  formService={formService}
                  setForceRerender={setForceRerender}
                />
                
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
                
                {/* Error message display - for component level errors */}
                {error && (
                  <div className="p-3 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner />
                    <span className="ml-2 text-sm text-muted-foreground">Loading form...</span>
                  </div>
                )}
                
                {/* Section content */}
                {!loading && (
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
                                  backgroundColor: agreementChecked ? "#EFF6FF" : "white",
                                  borderColor: agreementChecked ? "#93C5FD" : "#E5E7EB"
                                }}
                                onClick={() => {
                                  // Toggle the agreement checked state
                                  const newValue = !agreementChecked;
                                  
                                  // Log the action with task context for debugging and tracking
                                  logger.info(`Toggling agreement confirmation to ${newValue} for task type: ${taskType}, task ID: ${taskId || 'unknown'}`);
                                  
                                  // Update React state - this will automatically update the UI
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
                                    />
                                    <label htmlFor="consent-checkbox" className="font-medium block cursor-pointer">
                                      I confirm that the information provided is accurate and complete.
                                    </label>
                                  </div>
                                </div>
                                <div className="ml-7 text-sm text-gray-600 space-y-2 mt-1">
                                  <p>By submitting this form, I:</p>
                                  <ul className="list-disc list-outside ml-4 space-y-1">
                                    <li>Certify that I am authorized to submit this information on behalf of my organization;</li>
                                    <li>Understand that providing false information may result in the rejection of our application;</li>
                                    <li>Consent to the processing of this data in accordance with Invela's accreditation and verification procedures;</li>
                                    <li>Acknowledge that I may be contacted for additional information if needed.</li>
                                  </ul>
                                </div>
                              </div>
                              
                              {/* Submit button */}
                              <div className="mt-8 flex justify-end mb-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="submit"
                                        size="lg"
                                        disabled={!agreementChecked || overallProgress < 100 || isSubmitting}
                                        className={cn(
                                          "w-full sm:w-auto min-w-[180px]",
                                          !agreementChecked && "pointer-events-auto" // Allow showing tooltip even when disabled
                                        )}
                                      >
                                        {isSubmitting ? (
                                          <>
                                            <LoadingSpinner 
                                              className="mr-2 h-4 w-4" 
                                              variant="inverted"
                                            />
                                            Submitting...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Submit Form
                                          </>
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    {!agreementChecked && (
                                      <TooltipContent className="max-w-[280px]">
                                        <p>Please check the confirmation box before submitting.</p>
                                      </TooltipContent>
                                    )}
                                    {overallProgress < 100 && agreementChecked && (
                                      <TooltipContent className="max-w-[280px]">
                                        <p>Please complete all required fields before submitting.</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                        );
                      } 
                      
                      // For regular sections, render the corresponding SectionContent
                      return (
                        <div
                          key={section.id}
                          className={index === activeSection ? 'block' : 'hidden'}
                        >
                          <SectionContent
                            section={section}
                            sectionIndex={index}
                            form={form}
                            fields={fields}
                            onFieldUpdate={(fieldId, value) => {
                              updateField(fieldId, value);
                            }}
                            refreshStatus={refreshStatus}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Navigation buttons - only show for non-review sections */}
                {!loading && activeSection !== allSections.length - 1 && (
                  <div className="flex justify-between pt-6 mt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeSection > 0) {
                          setActiveSection(activeSection - 1);
                        }
                      }}
                      disabled={activeSection === 0}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={() => {
                        if (activeSection < allSections.length - 1) {
                          // If navigating to review section, only allow if form is complete
                          if (activeSection === allSections.length - 2 && overallProgress < 100) {
                            toast({
                              title: "Form incomplete",
                              description: "Please complete all required fields before proceeding to review.",
                              variant: "warning",
                            });
                            return;
                          }
                          
                          setActiveSection(activeSection + 1);
                        }
                      }}
                      disabled={activeSection === allSections.length - 1}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Cancel button for regular section views */}
                {!loading && activeSection !== allSections.length - 1 && onCancel && (
                  <div className="flex justify-center pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      className="text-gray-500"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                {/* For Review section, add back button in addition to submit */}
                {!loading && activeSection === allSections.length - 1 && (
                  <div className="flex justify-start pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveSection(allSections.length - 2);
                      }}
                      className="text-gray-500"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Form
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
};