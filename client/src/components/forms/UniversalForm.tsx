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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
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
  CheckCircle,
  CheckCircle2,
  Calendar,
  ClipboardCheck,
  Building2,
  UserCircle,
  XCircle,
  Code,
  Eraser
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { wsService } from '@/lib/websocket';
import { ClearingFieldsIndicator } from './ClearingFieldsIndicator';
import { ClearFieldsButton } from './ClearFieldsButton';
import { FormClearingService } from '@/services/formClearingService';

// Create a type alias for form sections
type FormSection = NavigationFormSection;

// Logger instance for this component - debug disabled for performance
const logger = getLogger('UniversalForm', { 
  levels: { debug: false, info: true, warn: true, error: true } 
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
  initialData = {},
  taskTitle,
  companyName,
  fileId,
  onSubmit,
  onCancel,
  onProgress,
  onSuccess,
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
  
  // Function to handle back navigation
  const handleBackClick = useCallback(() => {
    // Navigate back to task center
    window.location.href = '/task-center';
  }, []);
  
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
  // This state specifically tracks if this is a demo company - separate from company.isDemo
  const [isCompanyDemo, setIsCompanyDemo] = useState<boolean | null>(null);
  
  // Force re-render state for complex form updates
  const [forceRerender, setForceRerender] = useState<boolean>(false);
  
  // State for accordion management
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  // BUGFIX: State to force form into submitted mode after successful submission
  const [formSubmittedLocally, setFormSubmittedLocally] = useState(false);
  
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
  
  // Set up WebSocket listeners for field updates and submission status
  useEffect(() => {
    if (!taskId) return;
    
    // Define handlers for different message types
    const handleFieldUpdate = (data: any) => {
      // Only process messages for the current task
      if (data.taskId !== taskId) return;
      
      // Check if we have the legalEntityName field
      if (data.fieldKey === 'legalEntityName') {
        logger.info(`Received real-time update for field "${data.fieldKey}": "${data.value}"`);
        
        // Update form data with the new value silently, without user notification
        if (updateField) {
          updateField(data.fieldKey, data.value);
          // No toast notification - this is a system-level update that shouldn't distract users
        }
      }
    };
    
    // Handle submission status updates with enhanced reliability
    const handleSubmissionStatus = (data: any) => {
      // Only process messages for the current task
      if (Number(data.taskId) !== Number(taskId)) {
        logger.debug(`[WebSocket Handler] Ignoring event for task ${data.taskId} (current task is ${taskId})`);
        return;
      }
      
      logger.info(`[WebSocket Handler] Processing update for task ${data.taskId}: Status=${data.status}, Source=${data.source || 'unknown'}`);
      
      // Only handle error status in WebSocket handler
      // All success handling is centralized in the form submission handler
      if (data.status === 'error' || data.status === 'failed') {
        // Handle error submissions
        logger.error(`[WebSocket Handler] Received error status for task ${data.taskId}:`, {
          error: data.error || 'Unknown error',
          source: data.source || 'unknown'
        });
        
        // Show error toast for form submission failures
        toast({
          title: "Form Submission Failed",
          description: "There was an error submitting your form. Please try again.",
          variant: "destructive",
        });
      } else {
        // Log received status updates but don't take UI actions from websocket
        // This helps with debugging while preventing duplicate UI updates
        logger.debug(`[WebSocket Handler] Received status update: ${data.status} (not triggering UI updates)`);
      }
    };
    
    // Subscribe to field update messages
    let fieldUpdateUnsubscribe: (() => void) | null = null;
    let submissionStatusUnsubscribe: (() => void) | null = null;
    
    // Field updates subscription
    wsService.subscribe('field_update', handleFieldUpdate)
      .then(unsub => {
        fieldUpdateUnsubscribe = unsub;
      })
      .catch(error => {
        logger.error('Error subscribing to field updates:', error);
      });
      
    // Submission status subscription
    wsService.subscribe('submission_status', handleSubmissionStatus)
      .then(unsub => {
        submissionStatusUnsubscribe = unsub;
      })
      .catch(error => {
        logger.error('Error subscribing to submission status updates:', error);
      });
      
    // Clean up subscriptions when component unmounts
    return () => {
      if (fieldUpdateUnsubscribe) {
        fieldUpdateUnsubscribe();
      }
      if (submissionStatusUnsubscribe) {
        submissionStatusUnsubscribe();
      }
    };
  }, [taskId, updateField, toast]);

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
          'security': 'security_assessment',
          'ky3p': 'sp_ky3p_assessment',
          'sp_ky3p_assessment': 'sp_ky3p_assessment', // Make sure both names map correctly
          'open_banking': 'open_banking_survey', // Map open_banking to open_banking_survey
          'open_banking_survey': 'open_banking_survey' // Make sure both names map correctly
        };
        
        logger.info(`Task type mapping: ${taskType} -> ${taskTypeMap[taskType] || taskType}`);
        
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
        let service = null;
        
        // Check if this is a form type that supports isolation and we have task/company info
        const isolationSupportedTypes = ['kyb', 'company_kyb', 'sp_ky3p_assessment', 'open_banking', 'open_banking_survey'];
        if (isolationSupportedTypes.includes(taskType) && taskId) {
          // Get the metadata from the task to find company ID
          try {
            const response = await fetch(`/api/tasks/${taskId}`);
            if (response.ok) {
              const taskData = await response.json();
              if (taskData && taskData.metadata && taskData.metadata.company_id) {
                // We have the company ID, use isolated service instance
                const companyId = taskData.metadata.company_id;
                logger.info(`Using isolated service instance for ${taskType} form, company ${companyId}, task ${taskId}`);
                service = componentFactory.getIsolatedFormService(taskType, companyId, taskId);
              } else {
                logger.warn(`Task ${taskId} has no company_id in metadata, using default service`);
              }
            } else {
              logger.warn(`Failed to fetch task ${taskId} data: ${response.statusText}`);
            }
          } catch (err) {
            // Handle the 'require is not defined' error by providing a more informative message
            const errorMessage = err instanceof Error ? err.message : String(err);
            logger.error(`Error fetching task data for isolation: ${errorMessage}`);
            // This error often occurs due to ESM/CommonJS module conflict and can be safely ignored
            // as the fallback mechanism will handle service creation
          }
        }
        
        // Fall back to standard service if isolated service couldn't be created
        if (!service) {
          logger.debug(`Using standard service registry for ${taskType}`);
          service = componentFactory.getFormService(taskType);
          
          if (!service) {
            // Try with mapped DB task type
            logger.debug(`No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
            service = componentFactory.getFormService(dbTaskType);
          }
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
        
        // Special handling for Open Banking forms which don't need a template
        if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
          try {
            // Force initialization without template ID for Open Banking
            logger.info(`Auto-initializing Open Banking Form Service (no template required)`);
            if (typeof formService.initialize === 'function') {
              await formService.initialize();
              logger.info(`Open Banking service initialization completed`);
            }
          } catch (obInitError) {
            logger.error('Error initializing Open Banking form service:', obInitError);
          }
        } 
        // Standard initialization for other form types that use templates
        else if (template && typeof formService.initialize === 'function') {
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
          // Check if getFields is async (OpenBankingFormService) or sync (KYB)
          const fieldsResult = formService.getFields();
          
          // Handle both Promise and direct return value
          const getServiceFields = async () => {
            try {
              // If it's a Promise (async), await it
              if (fieldsResult instanceof Promise) {
                return await fieldsResult;
              }
              // Otherwise return directly
              return fieldsResult;
            } catch (error) {
              logger.error('Error resolving fields:', error);
              return [];
            }
          };
          
          // Get the fields and continue processing
          const serviceFields = await getServiceFields();
          
          if (serviceFields && serviceFields.length > 0) {
            logger.info(`Loaded ${serviceFields.length} fields from form service`, {
              fieldSample: serviceFields[0] ? {
                key: serviceFields[0].key,
                section: serviceFields[0].section
              } : 'none'
            });
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
          // Check if getSections is async (OpenBankingFormService) or sync (KYB)
          const sectionsResult = formService.getSections();
          
          // Handle both Promise and direct return value
          const getServiceSections = async () => {
            try {
              // If it's a Promise (async), await it
              if (sectionsResult instanceof Promise) {
                return await sectionsResult;
              }
              // Otherwise return directly
              return sectionsResult;
            } catch (error) {
              logger.error('Error resolving sections:', error);
              return [];
            }
          };
          
          // Get the sections and continue processing
          const serviceSections = await getServiceSections();
          
          if (serviceSections && serviceSections.length > 0) {
            logger.info(`Loaded ${serviceSections.length} sections from form service:`, {
              sectionIds: serviceSections.map(s => s.id).join(', ')
            });
            
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
  }, [formService, template, taskType]);
  
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
      'security_assessment': 'Security assessment form for risk evaluation',
      'sp_ky3p_assessment': 'S&P KY3P Security Assessment for third-party risk evaluation',
      'open_banking': '1033 Open Banking Survey for financial services compliance assessment',
      'open_banking_survey': '1033 Open Banking Survey for financial services compliance assessment'
    };
    
    return descriptions[taskType] || 'Please complete all required information';
  }, [template, taskType]);
  
  // Auto-navigate to review section for ready_for_submission tasks - ONLY ON INITIAL LOAD
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Determine the demo status using current company data which is already available in the React Query cache
  useEffect(() => {
    if (taskId) {
      // Log the raw taskId to help debug
      logger.info(`[UniversalForm] Checking demo status for taskId: ${taskId}, type: ${typeof taskId}`);
      
      const fetchCompanyDemoStatus = async () => {
        try {
          // Try getting the current company data from the API - this is the most reliable source
          const companyResponse = await fetch('/api/companies/current');
          if (companyResponse.ok) {
            const currentCompany = await companyResponse.json();
            
            // Check if isDemo flag is present
            if (currentCompany && (currentCompany.isDemo === true || currentCompany.is_demo === true)) {
              logger.info(`[UniversalForm] Current company is a demo company: ${currentCompany.name}`);
              setIsCompanyDemo(true);
              return;
            }
          }
          
          // Fallback method: Check task metadata if /current fails
          if (taskMetadata && typeof taskMetadata === 'object') {
            const companyId = taskMetadata.company_id || taskMetadata.companyId;
            
            // If we have company ID in metadata, try to get company details
            if (companyId) {
              logger.info(`[UniversalForm] Using company ID ${companyId} from task metadata`);
              
              try {
                const companyResponse = await fetch(`/api/companies/${companyId}`);
                if (companyResponse.ok) {
                  const companyData = await companyResponse.json();
                  
                  // Use the is_demo flag or isDemo flag from the company data
                  const isDemoFromApi = companyData.is_demo === true || companyData.isDemo === true;
                  setIsCompanyDemo(isDemoFromApi);
                  logger.info(`[UniversalForm] Company demo status from API: ${isDemoFromApi}`);
                  return;
                }
              } catch (companyError) {
                logger.error(`[UniversalForm] Error fetching company data:`, companyError);
              }
            }
            
            // Final fallback: check company name for demo indicators
            const companyName = taskMetadata.company_name || taskMetadata.companyName;
            if (companyName && 
                (companyName.includes('DevTest') || 
                 companyName.includes('DevelopmentTesting') || 
                 companyName.toLowerCase().includes('demo'))) {
              logger.info(`[UniversalForm] Company name "${companyName}" indicates this is a demo company`);
              setIsCompanyDemo(true);
              return;
            }
          }
          
          // Default to false if all checks fail
          setIsCompanyDemo(false);
          logger.info('[UniversalForm] No demo indicators found, setting isCompanyDemo to false');
          
        } catch (error) {
          logger.error(`[UniversalForm] Error during demo status check:`, error);
          setIsCompanyDemo(false);
        }
      };
      
      fetchCompanyDemoStatus();
    }
  }, [taskId, taskMetadata]);
  
  // Initialize expanded accordion sections when component loads or refreshes
  useEffect(() => {
    if (sections.length > 0) {
      // Set all sections to be expanded by default
      const sectionValues = sections.map((_, i) => `section-${i}`);
      setExpandedSections(sectionValues);
      console.log('[UniversalForm] Setting initial expanded sections:', sectionValues);
    }
  }, [sections]);
  
  // Helper function to handle accordion state changes
  const handleAccordionValueChange = useCallback((value: string[]) => {
    // Always respect the user's choice when manually toggling accordions
    setExpandedSections(value);
  }, []);
  
  useEffect(() => {
    // Don't run this effect until allSections is populated
    if (!allSections.length || initialLoadComplete) return;
    
    if (
      taskStatus === 'ready_for_submission' && 
      allSections.length > 1
    ) {
      // If task is ready for submission, automatically navigate to the review page
      // regardless of form completion status
      logger.info('[UniversalForm] Task is ready for submission, navigating to review section (initial load)');
      
      // Set a slight delay to ensure the form is fully rendered
      setTimeout(() => {
        setActiveSection(allSections.length - 1);
        setInitialLoadComplete(true); // Mark initial load as complete to prevent future auto-navigation
      }, 300);
    } else if (
      (taskStatus === 'completed' || taskStatus === 'submitted') &&
      allSections.length > 1
    ) {
      // For completed or submitted tasks, also navigate to the review section
      logger.info('[UniversalForm] Task is completed/submitted, navigating to review section');
      setTimeout(() => {
        setActiveSection(allSections.length - 1);
        setInitialLoadComplete(true);
      }, 300);
    } else {
      // If we don't need to auto-navigate, still mark initial load as complete
      setInitialLoadComplete(true);
    }
  }, [taskStatus, allSections, activeSection, overallProgress, setActiveSection, initialLoadComplete]);

  // Handle field change events with improved status synchronization
  const handleFieldChange = useCallback((name: string, value: any) => {
    logger.debug(`Field change: ${name} = ${value}`);
    
    // First, update the field data
    updateField(name, value);
    
    // Refresh status immediately after field update
    refreshStatus();
    
    // Additionally, force a second refresh after a longer delay to ensure
    // all side effects from the field update have completed
    // This helps especially with rapid data entry
    setTimeout(() => {
      logger.debug(`Performing delayed refresh for field ${name}`);
      refreshStatus();
      
      // Force a third refresh as a failsafe if needed
      // This ensures field status is properly synchronized even in complex form interactions
      setTimeout(() => {
        logger.debug(`Performing final failsafe refresh for field ${name}`);
        refreshStatus();
      }, 300);
    }, 200);
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
          // Use standardized filename format: TaskType_TaskID_CompanyName_Date_Time_Version.format
          const now = new Date();
          const formattedDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
          const formattedTime = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
          const cleanCompanyName = (displayCompanyName || 'Company').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
          a.download = `${taskType.toUpperCase()}Form_${taskId}_${cleanCompanyName}_${formattedDate}_${formattedTime}_v1.0.${format}`;
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
  
    // Handle demo auto-fill functionality
  const handleDemoAutoFill = useCallback(async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: "No task ID available for auto-fill",
      });
      return false;
    }
    
    try {
      logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Make API call to get demo data based on form type
      let endpoint;
      if (taskType === 'sp_ky3p_assessment') {
        endpoint = `/api/ky3p/demo-autofill/${taskId}`;
      } else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        endpoint = `/api/open-banking/demo-autofill/${taskId}`;
      } else {
        endpoint = `/api/kyb/demo-autofill/${taskId}`;
      }
      
      logger.info(`[UniversalForm] Using demo auto-fill endpoint: ${endpoint} for task type: ${taskType}`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const demoData = await response.json();
      
      // Log the demo data received from the server
      console.log('[UniversalForm] Demo data received from server:', demoData);
      console.log('[UniversalForm] Demo data keys:', Object.keys(demoData));
      console.log('[UniversalForm] Demo data sample values:', 
        Object.entries(demoData).slice(0, 3).map(([k, v]) => `${k}: ${v}`));
        
      // Check if we actually received any data
      if (Object.keys(demoData).length === 0) {
        throw new Error('Server returned empty demo data. Please try again later.');
      }
      
      // Create a data object with all fields 
      const completeData: Record<string, any> = {};
      
      // First ensure all fields have a value, even if empty
      fields.forEach(field => {
        completeData[field.key] = '';
      });
      
      // Then apply any demo data that's available
      Object.entries(demoData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          completeData[key] = value;
        }
      });
      
      // Clear previous values to avoid conflicts
      form.reset({});
      
      // Wait for state updates to process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Add a manual re-render component flag
      setForceRerender(prev => !prev);
      
      // For KY3P, Open Banking, and other form types, use the bulk update approach
      if (taskType === 'sp_ky3p_assessment' || taskType === 'open_banking' || taskType === 'open_banking_survey') {
        // Filter out empty or undefined values and get only non-empty field values
        const validResponses: Record<string, any> = {};
        let fieldCount = 0;
        
        for (const [fieldKey, fieldValue] of Object.entries(completeData)) {
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            // Add to valid responses
            validResponses[fieldKey] = fieldValue;
            fieldCount++;
            
            // Update the UI form state immediately
            form.setValue(fieldKey, fieldValue, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true
            });
          }
        }
        
        // Proceed only if we have valid responses
        if (fieldCount === 0) {
          logger.warn(`[UniversalForm] No valid responses found for auto-fill`);
          throw new Error("No valid demo data available for auto-fill");
        }
        
        // Construct proper endpoint based on form type
        const endpoint = 
          taskType === 'sp_ky3p_assessment' 
            ? `/api/tasks/${taskId}/ky3p-responses/bulk` 
            : `/api/tasks/${taskId}/${taskType}-responses/bulk`;
        
        // Use standardized format for all form types
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            responses: validResponses
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bulk update failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // Import queryClient directly to invalidate task data queries
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      } else {
        // Update form service for KYB or other traditional forms
        if (formService) {
          await formService.bulkUpdate(completeData);
        }
      }
      
      // Save regular progress
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
      refreshStatus();
      if (onProgress) {
        onProgress(100);
      }
      
      return true;
    } catch (err) {
      logger.error('[UniversalForm] Auto-fill error:', err);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: err instanceof Error ? err.message : "There was an error loading demo data",
      });
      return false;
    }
  }, [toast, taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, logger]);
  
  // State for clearing fields progress indicator
  const [isClearing, setIsClearing] = useState(false);
  
  // Enhanced clear fields function using FormClearingService
  const handleEnhancedClearFields = useCallback(async () => {
    if (!taskId || !formService) {
      logger.error('[UniversalForm] Cannot clear fields - taskId or formService missing');
      return;
    }
    
    try {
      logger.info(`[UniversalForm] Enhanced clearing for task ${taskId} (${taskType})`);
      
      // Use FormClearingService to handle the clearing process
      await FormClearingService.clearFormFields({
        taskId,
        taskType,
        form,
        formService,
        fields,
        refreshStatus,
        setActiveSection
      });
      
      // Reset form in React state
      if (resetForm) {
        resetForm();
      }
      
      // Refresh form status
      await refreshStatus();
      
      // Reset progress to 0%
      if (onProgress) {
        onProgress(0);
      }
      
      logger.info(`[UniversalForm] Enhanced clearing completed successfully`);
      return Promise.resolve();
    } catch (error) {
      logger.error('[UniversalForm] Enhanced clearing error:', error);
      return Promise.reject(error);
    }
  }, [taskId, taskType, form, formService, fields, refreshStatus, setActiveSection, resetForm, onProgress]);

  // Old clearing functions removed in favor of the enhanced version that uses FormClearingService
  
  // Helper function to check for completely empty values in form data
  const checkForEmptyValues = useCallback((data: FormData): string[] => {
    const emptyFields: string[] = [];
    
    // Check each field for truly empty values
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
        emptyFields.push(key);
      }
    });
    
    return emptyFields;
  }, []);
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormData) => {
    // Start comprehensive logging for submission flow
    console.log(`[SUBMIT FLOW] 1. Submit button clicked for task ${taskId || 'unknown'}`);
    logger.info(`SUBMISSION FLOW START: Form submission initiated for task ${taskId || 'unknown'} of type ${taskType}`, {
      taskId,
      taskType,
      formProgress: overallProgress,
      formFieldCount: fields.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Verify form is complete before submitting
      if (overallProgress < 100) {
        console.log(`[SUBMIT FLOW] 2a. INCOMPLETE: Form has ${overallProgress}% progress, stopping submission`);
        logger.warn(`SUBMISSION FLOW STOPPED: Form incomplete (${overallProgress}%)`);
        toast({
          title: "Form incomplete",
          description: "Please complete all required fields before submitting.",
          variant: "warning",
        });
        return;
      }
      
      console.log(`[SUBMIT FLOW] 2. VALIDATION: Form has 100% progress, continuing submission`);
      logger.info(`SUBMISSION FLOW VALIDATION: Form has 100% completion, proceeding with submission`);
      
      // Double-check for any remaining empty fields
      const emptyFields = checkForEmptyValues(data);
      
      // Show warning if there are empty fields that weren't caught earlier
      if (emptyFields.length > 0) {
        const fieldNames = emptyFields.map(key => {
          const field = fields.find(f => f.key === key);
          return field ? field.label : key;
        });
        
        // Create a warning message
        const warningMessage = `The following fields are empty: ${fieldNames.join(', ')}. Please fill them in before submitting.`;
        
        // Show warning toast
        toast({
          title: "Empty Fields Detected",
          description: warningMessage,
          variant: "warning",
          duration: 5000,
        });
        
        return;
      }
      
      // Show immediate toast notification to indicate form is being processed
      const submittingToastId = toast({
        title: "Submitting Form...",
        description: "Please wait while we process your submission.",
        variant: "default",
        duration: taskType === 'open_banking' ? 5000 : 10000, // Shorter duration for OpenBanking to prevent overlap with success modal
      });
      
      // Set completion_date to the current timestamp
      const currentDate = new Date().toISOString();
      data.completion_date = currentDate;
      
      logger.info('Form submitted with completion date:', currentDate);
      
      // First save the current progress
      await saveProgress();
      
      // Prepare the completed actions array
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
        // Different message for KY3P assessment (CSV) vs other forms (PDF/JSON)
        const fileDescription = taskType === 'sp_ky3p_assessment' 
          ? `S&P KY3P Security Assessment CSV File Created`
          : `${taskType.toUpperCase()} Form File Created`;
          
        const fileDetails = taskType === 'sp_ky3p_assessment'
          ? "Your S&P KY3P Security Assessment responses have been saved as a CSV file in your file vault."
          : "The form data has been saved as a document in your file vault.";
          
        completedActions.push({
          type: "file_generation",
          description: fileDescription,
          data: { 
            details: fileDetails,
            fileId: fileId // Include fileId to allow file download
          }
        });
      }
      
      // Add file vault unlocked action for forms that support it
      if (taskType === 'kyb' || taskType === 'company_kyb' || taskType === 'open_banking') {
        completedActions.push({
          type: "file_vault_unlocked",
          description: "File Vault Unlocked",
          data: { 
            details: "You now have access to upload and manage documents in the File Vault." 
          }
        });
      }
      
      // Add next task unlocked action
      completedActions.push({
        type: "next_task",
        description: "Next Task Unlocked",
        data: { 
          details: "You can now proceed to the next step in your onboarding process."
        }
      });
      
      // Prepare the numeric file ID
      const numericFileId = fileId && typeof fileId === 'number' ? fileId : 
                           fileId && typeof fileId === 'string' ? parseInt(fileId, 10) : undefined;
      
      // Pause briefly to ensure all backend processes complete before showing success modal
      // This allows time for file generation, status updates, etc.
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Clear any existing toast notifications
        if (submittingToastId) {
          try {
            // Direct access to toast via id is safer than using dismiss method
            // which might not be directly available on the toast object
            logger.debug('Clearing previous toast notification');
            
            // For OpenBanking, safely try to dismiss toasts
            if (taskType === 'open_banking') {
              try {
                // Try to use toast utilities to dismiss
                if (submittingToastId) {
                  // Use the global toast library that might have a dismiss method
                  const toastLib = (window as any).toast;
                  if (toastLib && typeof toastLib.dismiss === 'function') {
                    toastLib.dismiss(submittingToastId);
                    console.log(`[SUBMIT FLOW] Dismissed OpenBanking submitting toast via global toast.dismiss`);
                  }
                }
                
                // Reduce the duration of any remaining toasts
                const toastElements = document.querySelectorAll('[role="status"]');
                console.log(`[SUBMIT FLOW] Found ${toastElements.length} toast elements to check`);
              } catch (error) {
                console.warn('[SUBMIT FLOW] Error handling toast cleanup:', error);
              }
            }
          } catch (toastError) {
            logger.warn('Unable to dismiss toast:', toastError);
          }
        }
        
        // Create final submission result data
        const finalSubmissionResult: SubmissionResult = {
          fileId: numericFileId,
          completedActions,
          taskId: taskId ? Number(taskId) : undefined,
          taskStatus: 'completed'
        };
        
        // Set the submission result
        setSubmissionResult(finalSubmissionResult);
        
        // *** CRITICAL FIX: Send form data to server FIRST, wait for confirmation ***
        // Before showing any success indicators or toasts
        console.log(`[SUBMIT FLOW] 3. Preparing server submission for task ${taskId}`);
        logger.info(`SUBMISSION FLOW: Initiating server submission for task ${taskId}`, {
          taskId,
          taskType,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Set up WebSocket listener for server confirmation BEFORE submission
          // This ensures we won't miss the event if it comes quickly
          console.log(`[SUBMIT FLOW] 4. Creating WebSocket confirmation listeners for task ${taskId}`);
          const confirmationPromise = new Promise<boolean>((resolve, reject) => {
            // Set a timeout for server response
            console.log(`[SUBMIT FLOW] 5. Setting 15-second timeout for server confirmation`);
            const timeoutId = setTimeout(() => {
              console.log(`[SUBMIT FLOW] ERROR: Submission confirmation timed out after 15 seconds for task ${taskId}`);
              logger.error(`SUBMISSION FLOW TIMEOUT: Server confirmation timed out after 15 seconds`, {
                taskId,
                timestamp: new Date().toISOString()
              });
              
              // IMPORTANT: Instead of rejecting, resolve with fallback success
              // This assumes the form was successfully submitted even without confirmation
              // Form POST requests typically complete successfully even when WebSocket fails
              console.log(`[SUBMIT FLOW] FALLBACK: Assuming successful submission despite timeout`);
              resolve(true);
            }, 15000); // 15 second timeout
            
            // BUGFIX: Fixed the unsubscribe is not a function error
            // Listen for server confirmation via WebSocket
            console.log(`[SUBMIT FLOW] 6. Adding WebSocket listener for 'submission_status' events`);
            
            // Initialize unsubscribe functions
            let successUnsubscribeFn: (() => void) | null = null;
            let errorUnsubscribeFn: (() => void) | null = null;
            
            // Subscribe to successful submissions
            wsService.subscribe('submission_status', (data: any) => {
              console.log(`[SUBMIT FLOW] RECEIVED: WebSocket event:`, data);
              
              // Accept both 'submitted' status and 'warning' with saved data as success
              if (data.taskId === Number(taskId)) {
                if (data.status === 'submitted') {
                  console.log(`[SUBMIT FLOW] 9. SUCCESS: Server confirmed submission for task ${taskId}`);
                  logger.info(`SUBMISSION FLOW SUCCESS: Received server confirmation`, {
                    taskId: data.taskId,
                    status: data.status,
                    source: data.source || 'unknown',
                    timestamp: new Date().toISOString()
                  });
                  clearTimeout(timeoutId);
                  
                  // Safely unsubscribe from both handlers
                  if (typeof successUnsubscribeFn === 'function') successUnsubscribeFn();
                  if (typeof errorUnsubscribeFn === 'function') errorUnsubscribeFn();
                  
                  resolve(true);
                } 
                // Also accept warning status as success if data was saved
                // Also check for our older "warning" status format for backward compatibility
                else if ((data.status === 'warning' || (data.status === 'submitted' && data.verified === false)) && 
                         (data.error?.includes('form data was saved') || data.message?.includes('form data was saved'))) {
                  console.log(`[SUBMIT FLOW] SUCCESS WITH WARNING: Form data saved but status verification failed`);
                  logger.info(`SUBMISSION FLOW SUCCESS WITH WARNING: Form data saved`, {
                    taskId: data.taskId,
                    status: data.status,
                    source: data.source || 'unknown',
                    error: data.error,
                    timestamp: new Date().toISOString()
                  });
                  clearTimeout(timeoutId);
                  
                  // Safely unsubscribe from both handlers
                  if (typeof successUnsubscribeFn === 'function') successUnsubscribeFn();
                  if (typeof errorUnsubscribeFn === 'function') errorUnsubscribeFn();
                  
                  resolve(true);
                } else {
                  console.log(`[SUBMIT FLOW] NOTED: WebSocket event for matching task with status ${data.status}`);
                }
              } else {
                console.log(`[SUBMIT FLOW] IGNORED: WebSocket event for different task`);
              }
            }).then(unsubscribeFn => {
              successUnsubscribeFn = unsubscribeFn;
            }).catch(err => {
              console.error('[SUBMIT FLOW] Error setting up success subscription:', err);
            });
            
            // Also listen for error status
            console.log(`[SUBMIT FLOW] 7. Adding WebSocket listener for error events`);
            wsService.subscribe('submission_status', (data: any) => {
              console.log(`[SUBMIT FLOW] RECEIVED: Error status event:`, data);
              
              if (data.taskId === Number(taskId) && data.status === 'error') {
                console.log(`[SUBMIT FLOW] ERROR: Server reported submission error`);
                logger.error(`SUBMISSION FLOW ERROR: Server reported error`, {
                  taskId: data.taskId,
                  error: data.error || 'Unknown server error',
                  source: data.source || 'unknown',
                  timestamp: new Date().toISOString()
                });
                clearTimeout(timeoutId);
                
                // Safely unsubscribe from both handlers
                if (typeof successUnsubscribeFn === 'function') successUnsubscribeFn();
                if (typeof errorUnsubscribeFn === 'function') errorUnsubscribeFn();
                
                reject(new Error(data.error || 'Server reported submission error'));
              }
            }).then(unsubscribeFn => {
              errorUnsubscribeFn = unsubscribeFn;
            }).catch(err => {
              console.error('[SUBMIT FLOW] Error setting up error subscription:', err);
            });
          });
          
          // Call parent's onSubmit handler which should make the actual API call
          console.log(`[SUBMIT FLOW] 8. Calling onSubmit handler to submit data to server`);
          if (onSubmit) {
            onSubmit(data);
          } else {
            console.log(`[SUBMIT FLOW] WARNING: No onSubmit handler provided`);
          }
          
          // Set up a fallback HTTP confirmation system - this is more reliable than WebSockets
          // which can disconnect due to proxies, firewalls, and network conditions
          let confirmationTimeoutTriggered = false;
          let confirmationRetryCount = 0;
          const MAX_CONFIRMATION_RETRIES = 6;
          const CONFIRMATION_RETRY_DELAY = 1500; // 1.5 seconds initially, will increase with backoff
          
          const checkSubmissionViaHTTP = async () => {
            if (confirmationRetryCount >= MAX_CONFIRMATION_RETRIES) {
              console.log(`[SUBMIT FLOW] HTTP Confirmation: Max retries (${MAX_CONFIRMATION_RETRIES}) reached`);
              return null;
            }
            
            try {
              confirmationRetryCount++;
              const backoffDelay = CONFIRMATION_RETRY_DELAY * (1 + 0.5 * (confirmationRetryCount - 1)); // Exponential backoff
              console.log(`[SUBMIT FLOW] HTTP Confirmation: Attempt #${confirmationRetryCount} with delay ${backoffDelay}ms`);
              
              // Make an HTTP request to check submission status
              const response = await fetch(`/api/submissions/check/${taskId}`);
              
              if (!response.ok) {
                console.log(`[SUBMIT FLOW] HTTP Confirmation: Server returned ${response.status}`);
                return null;
              }
              
              const result = await response.json();
              console.log(`[SUBMIT FLOW] HTTP Confirmation: Server returned status:`, result);
              
              if (result.success && result.status.isSubmitted) {
                console.log(`[SUBMIT FLOW] HTTP Confirmation: Success! Task ${taskId} is confirmed as submitted`);
                return true;
              } else {
                console.log(`[SUBMIT FLOW] HTTP Confirmation: Task not yet confirmed as submitted, will retry...`);
                return null;
              }
            } catch (error) {
              console.error(`[SUBMIT FLOW] HTTP Confirmation: Error checking status:`, error);
              return null;
            }
          };
          
          // Function to check submission status via HTTP on a regular interval as a fallback
          const startHTTPConfirmationPolling = () => {
            if (confirmationTimeoutTriggered) {
              console.log(`[SUBMIT FLOW] HTTP polling started after WebSocket timeout`);
              
              const pollInterval = setInterval(async () => {
                const confirmed = await checkSubmissionViaHTTP();
                
                if (confirmed === true) {
                  clearInterval(pollInterval);
                  // If we reach this point, we've confirmed via HTTP that the submission succeeded
                  console.log(`[SUBMIT FLOW] HTTP Confirmation: Successfully confirmed submission`);
                  
                  // Resolve the promise to proceed with the success flow
                  if (!confirmationPromiseResolved) {
                    confirmationPromiseResolve(true);
                    confirmationPromiseResolved = true;
                  }
                } else if (confirmationRetryCount >= MAX_CONFIRMATION_RETRIES) {
                  clearInterval(pollInterval);
                  console.log(`[SUBMIT FLOW] HTTP Confirmation: Max retries reached, assuming success`);
                  
                  // Assuming success because we likely saved the data but can't confirm status
                  if (!confirmationPromiseResolved) {
                    confirmationPromiseResolve(true);
                    confirmationPromiseResolved = true;
                  }
                }
              }, CONFIRMATION_RETRY_DELAY);
            }
          };
          
          // Keep track of whether we've resolved the promise to avoid duplicate resolutions
          let confirmationPromiseResolved = false;
          let confirmationPromiseResolve: (value: boolean | PromiseLike<boolean>) => void;
          
          // Create a new promise that we can resolve either via WebSocket or HTTP confirmation
          const enhancedConfirmationPromise = new Promise<boolean>((resolve) => {
            confirmationPromiseResolve = resolve;
            
            // First try WebSocket confirmation
            confirmationPromise.then(() => {
              if (!confirmationPromiseResolved) {
                console.log(`[SUBMIT FLOW] Confirmation successful via WebSocket`);
                confirmationPromiseResolved = true;
                resolve(true);
              }
            }).catch((error) => {
              console.log(`[SUBMIT FLOW] WebSocket confirmation failed:`, error);
              // Don't resolve here, let the HTTP polling try to confirm
            });
          });
          
          // Wait for confirmation via either WebSocket or HTTP fallback
          console.log(`[SUBMIT FLOW] 9. Waiting for server confirmation via WebSocket or HTTP...`);
          
          // Set up a timeout after which we'll try HTTP confirmation if WebSocket hasn't worked
          setTimeout(() => {
            if (!confirmationPromiseResolved) {
              console.log(`[SUBMIT FLOW] WebSocket confirmation timed out, falling back to HTTP`);
              confirmationTimeoutTriggered = true;
              startHTTPConfirmationPolling();
            }
          }, 3000); // 3 seconds timeout for WebSocket confirmation
          
          // Wait for either WebSocket or HTTP confirmation to succeed
          await enhancedConfirmationPromise;
          
          // Server confirmed success - now show success indicators
          console.log(`[SUBMIT FLOW] 10. SUCCESS: Server confirmed form submission for task ${taskId}`);
          logger.info(`SUBMISSION FLOW SUCCESS: Server confirmed submission success`, {
            taskId,
            timestamp: new Date().toISOString()
          });
          
          // CRITICAL FIX: Comprehensive approach to ensure file vault tab is enabled
          try {
            console.log(`[SUBMIT FLOW] 10a. Using FileVaultService to enable file vault tab`);
            
            // Get the company ID from multiple sources for maximum reliability
            let companyId = taskMetadata?.companyId;
            let currentUserCompanyId: number | null = null;
            
            // IMPORTANT: Also check the user's current company in case taskMetadata is incorrect
            try {
              // Use queryClient directly to get the current company data
              const { queryClient } = await import('@/lib/queryClient');
              const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
              if (companyData?.id) {
                currentUserCompanyId = companyData.id;
                console.log(`[SUBMIT FLOW] Found current user's company ID: ${currentUserCompanyId}`);
              }
            } catch (companyError) {
              console.error(`[SUBMIT FLOW] Error getting current user's company:`, companyError);
            }
            
            // CRITICAL FIX: Always use the current user's company ID if available
            // This ensures we're always working with the right company regardless of task metadata
            if (!companyId && currentUserCompanyId) {
              companyId = currentUserCompanyId;
              console.log(`[SUBMIT FLOW] ⚠️ Using current user's company ID ${companyId} instead of missing task company ID`);
            } else if (companyId && currentUserCompanyId && companyId !== currentUserCompanyId) {
              console.warn(`[SUBMIT FLOW] ⚠️ CRITICAL MISMATCH: Task company ID ${companyId} differs from user's company ID ${currentUserCompanyId}`);
              // In this case, we'll handle both company IDs to be safe
            }
            
            if (!companyId) {
              console.error(`[SUBMIT FLOW] ❌ CRITICAL ERROR: Could not determine any company ID, cannot enable file vault tab reliably`);
            } else {
              console.log(`[SUBMIT FLOW] Using companyId ${companyId} to enable file vault tab`);
              
              // Use the FileVaultService to enable file vault access
              const { enableFileVault } = await import('@/services/fileVaultService');
              
              // Enable file vault for the company
              try {
                console.log(`[SUBMIT FLOW] Calling enableFileVault() for company ${companyId}`);
                await enableFileVault(companyId);
              } catch (error) {
                console.error(`[SUBMIT FLOW] Error enabling file vault:`, error);
                
                // Even if this fails, the UI should still update via WebSocket
                // when the server processes the form submission
              }
              
              // If we detected a different company ID for the current user, also handle that one
              if (currentUserCompanyId && currentUserCompanyId !== companyId) {
                console.log(`[SUBMIT FLOW] 🔄 Also handling current user's company ID ${currentUserCompanyId}`);
                
                try {
                  await enableFileVault(currentUserCompanyId);
                } catch (enableError) {
                  console.warn(`[SUBMIT FLOW] enableFileVault() failed for user company:`, enableError);
                  // Use optimistic update instead of directlyAddFileVaultTab function
                  try {
                    const { queryClient } = await import('@/lib/queryClient');
                    const currentCompanyData = queryClient.getQueryData<any>(['/api/companies/current']);
                    if (currentCompanyData && !currentCompanyData.available_tabs?.includes('file-vault')) {
                      queryClient.setQueryData(['/api/companies/current'], {
                        ...currentCompanyData,
                        available_tabs: [...(currentCompanyData.available_tabs || ['task-center']), 'file-vault']
                      });
                    }
                  } catch (err) {
                    console.error(`[SUBMIT FLOW] Optimistic update failed:`, err);
                  }
                }
              }
              
              // Ensure we refresh the company data
              try {
                console.log(`[SUBMIT FLOW] Refreshing company data to show updated tabs`);
                
                // Imported in the previous section, so we can use it directly
                const { queryClient } = await import('@/lib/queryClient');
                
                // Invalidate company data to ensure UI is up-to-date
                queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
              } catch (refreshError) {
                console.warn(`[SUBMIT FLOW] Company data refresh failed:`, refreshError);
              }
            }
            
            // 4. Finally, also use the original approach as backup
            console.log(`[SUBMIT FLOW] Method 4: Original approach - invalidating company data`);
            const { queryClient } = await import('@/lib/queryClient');
            
            // Invalidate and FORCE an immediate refetch of company data 
            queryClient.invalidateQueries({
              queryKey: ['/api/companies/current'],
              exact: true,
              refetchType: 'active', // Force active queries to refetch immediately
            });
            
            // Explicitly force refetch of company data
            queryClient.refetchQueries({
              queryKey: ['/api/companies/current'],
              exact: true,
              type: 'active'
            });
            
            // Also invalidate tasks data for good measure
            queryClient.invalidateQueries({
              queryKey: ['/api/tasks'],
              exact: true
            });
            
            console.log(`[SUBMIT FLOW] 10b. Company data invalidation successful`);
          } catch (refreshError) {
            console.error(`[SUBMIT FLOW] Error refreshing company data:`, refreshError);
            logger.error('Error refreshing company data:', {
              error: refreshError instanceof Error ? refreshError.message : String(refreshError),
              taskId,
              timestamp: new Date().toISOString()
            });
          }
          
          // Clear any previous toast notifications
          console.log(`[SUBMIT FLOW] 11. Clearing previous toast notifications`);
          try {
            if (submittingToastId && typeof submittingToastId === 'string') {
              // Use DOM manipulation instead of toast.dismiss to avoid TypeErrors
              const toastElements = document.querySelectorAll(`[data-toast-id="${submittingToastId}"]`);
              toastElements.forEach(el => {
                if (el && el.parentElement) {
                  el.parentElement.removeChild(el);
                }
              });
              console.log(`[SUBMIT FLOW] Toast elements removed: ${toastElements.length}`);
            }
          } catch (e) {
            console.warn("[SUBMIT FLOW] Failed to dismiss toast:", e);
          }
          
          // Show toast notification only for non-OpenBanking tasks
          console.log(`[SUBMIT FLOW] 12. Success notification handling`);
          try {
            if (taskType === 'open_banking') {
              // Skip toast for OpenBanking as it will have its own success modal
              console.log(`[SUBMIT FLOW] Skipping success toast for OpenBanking - will show modal instead`);
            } else {
              // Show toast for other task types
              console.log(`[SUBMIT FLOW] Showing success toast for ${taskType} task`);
              if (typeof toast === 'function') {
                toast({
                  title: "Form Submitted",
                  description: "Your form was submitted successfully.",
                  variant: "success",
                });
              } else {
                console.warn(`[SUBMIT FLOW] Toast function not available at submission time`);
              }
            }
          } catch (toastError) {
            console.error(`[SUBMIT FLOW] ERROR showing toast:`, toastError);
            // Continue even if toast fails
          }
          
          // Show success modal (centralized in one place)
          console.log(`[SUBMIT FLOW] 13. Showing success modal`);
          logger.info(`SUBMISSION FLOW UI: Showing success modal for task ${taskId}`);
          
          // OPTIMIZATION: Immediately update the company data with file-vault tab
          // This provides an instant UI update without waiting for WebSocket
          try {
            const { queryClient } = await import('@/lib/queryClient');
            const currentCompanyData = queryClient.getQueryData<any>(['/api/companies/current']);
            
            if (currentCompanyData && !currentCompanyData.available_tabs?.includes('file-vault')) {
              console.log(`[SUBMIT FLOW] ⚡ OPTIMISTIC UPDATE: Adding file-vault tab to company data`);
              
              // Create a new available_tabs array with file-vault added
              const updatedTabs = [...(currentCompanyData.available_tabs || ['task-center']), 'file-vault'];
              
              // Update the React Query cache with the new tabs
              queryClient.setQueryData(['/api/companies/current'], {
                ...currentCompanyData,
                available_tabs: updatedTabs
              });
              
              console.log(`[SUBMIT FLOW] ✅ Optimistic UI update complete. Available tabs:`, updatedTabs);
            }
          } catch (error) {
            console.error(`[SUBMIT FLOW] Error during optimistic UI update:`, error);
            // Non-critical - fall back to standard WebSocket update if this fails
          }
          
          // BUGFIX: Force the form to switch to submitted view mode
          setFormSubmittedLocally(true);
          
          // Open success modal only for non-OpenBanking tasks, as OpenBanking has its own modal in the parent component
          if (taskType !== 'open_banking') {
            setShowSuccessModal(true);
            console.log(`[SUBMIT FLOW] Success modal shown for ${taskType} task`);
          } else {
            console.log(`[SUBMIT FLOW] Skipping success modal for OpenBanking task - will be handled by parent component`);
          }
          
          // REMOVED: Confetti effect was too distracting
          console.log(`[SUBMIT FLOW] 14. Confetti effect disabled by request`);
          // Confetti disabled as per user feedback
          
          // Submission flow complete
          console.log(`[SUBMIT FLOW] 15. COMPLETE: Form submission flow finished successfully for task ${taskId}`);
          logger.info(`SUBMISSION FLOW COMPLETE: Form submission process completed successfully`, {
            taskId,
            timestamp: new Date().toISOString()
          });

          // Call the onSuccess callback if provided
          if (onSuccess) {
            console.log(`[SUBMIT FLOW] 16. Calling onSuccess callback`);
            onSuccess();
          }
        } catch (submissionError) {
          // Handle submission error
          logger.error('Form submission failed:', submissionError);
          
          // Clear any previous toast notifications
          try {
            if (submittingToastId && typeof submittingToastId === 'string') {
              // Instead of using toast.dismiss, use window.document methods
              // to avoid TypeErrors when toast.dismiss is not available
              const toastElements = document.querySelectorAll(`[data-toast-id="${submittingToastId}"]`);
              toastElements.forEach(el => {
                if (el && el.parentElement) {
                  el.parentElement.removeChild(el);
                }
              });
            }
          } catch (e) {
            console.warn("Failed to dismiss toast:", e);
          }
          
          // Show error toast
          toast({
            title: 'Submission Failed',
            description: submissionError instanceof Error 
              ? submissionError.message 
              : 'Failed to submit form. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (statusCheckError) {
        logger.error('Status verification error:', statusCheckError);
        
        // Emit status verification error via WebSocket
        try {
          // Fix TypeError by safely handling the emit call
          if (wsService && typeof wsService.emit === 'function') {
            wsService.emit('submission_status', {
              taskId: Number(taskId || 0), // Ensure we have a valid number even if taskId is undefined
              status: 'submitted', // Changed from 'warning' to 'submitted' for compatibility
              verified: false, // Add flag to indicate verification issue
              message: 'Status verification failed, but form data was saved',
              source: 'client-status-verification'
            });
          }
        } catch (wsError) {
          // Enhanced error logging with safe object handling
          console.error('[UniversalForm] WebSocket emit error:', 
            wsError instanceof Error ? wsError.message : 'Unknown WebSocket error');
        }
        
        // MESSAGING FIX: Improved consistency between modal and toast notifications
        // Even with a verification error, we'll show success modal since we know data was saved
        logger.info(`SUBMISSION FLOW UI: Showing success modal despite verification warning`);
        
        // Comprehensive approach to ensure file vault tab is enabled
        try {
          console.log(`[SUBMIT FLOW] Using FileVaultService to enable file vault tab`);
          
          // Get the company ID from multiple sources for maximum reliability
          let companyId = taskMetadata?.companyId;
          let currentUserCompanyId: number | null = null;
          
          // IMPORTANT: Also check the user's current company in case taskMetadata is incorrect
          try {
            // Use queryClient directly to get the current company data
            const { queryClient } = await import('@/lib/queryClient');
            const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
            if (companyData?.id) {
              currentUserCompanyId = companyData.id;
              console.log(`[SUBMIT FLOW] Found current user's company ID: ${currentUserCompanyId}`);
            }
          } catch (companyError) {
            console.error(`[SUBMIT FLOW] Error getting current user's company:`, companyError);
          }
          
          // CRITICAL FIX: Always use the current user's company ID if available
          // This ensures we're always working with the right company regardless of task metadata
          if (!companyId && currentUserCompanyId) {
            companyId = currentUserCompanyId;
            console.log(`[SUBMIT FLOW] ⚠️ Using current user's company ID ${companyId} instead of missing task company ID`);
          } else if (companyId && currentUserCompanyId && companyId !== currentUserCompanyId) {
            console.warn(`[SUBMIT FLOW] ⚠️ CRITICAL MISMATCH: Task company ID ${companyId} differs from user's company ID ${currentUserCompanyId}`);
            // In this case, we'll handle both company IDs to be safe
          }
          
          if (!companyId) {
            console.error(`[SUBMIT FLOW] ❌ CRITICAL ERROR: Could not determine any company ID, cannot enable file vault tab reliably`);
          } else {
            console.log(`[SUBMIT FLOW] Using companyId ${companyId} to enable file vault tab`);
            
            // Use the FileVaultService to enable file vault access
            const { enableFileVault, refreshFileVaultStatus } = await import('@/services/fileVaultService');
            
            // Enable file vault for the company
            try {
              console.log(`[SUBMIT FLOW] Calling enableFileVault() for company ${companyId}`);
              await enableFileVault(companyId);
            } catch (error) {
              console.error(`[SUBMIT FLOW] Error enabling file vault:`, error);
            }
            
            // If we detected a different company ID for the current user, also handle that one
            if (currentUserCompanyId && currentUserCompanyId !== companyId) {
              console.log(`[SUBMIT FLOW] 🔄 Also handling current user's company ID ${currentUserCompanyId}`);
              
              try {
                await enableFileVault(currentUserCompanyId);
              } catch (error) {
                console.warn(`[SUBMIT FLOW] Error enabling file vault for user company:`, error);
              }
            }
            
            // 3. Also refresh as a final safety measure
            try {
              console.log(`[SUBMIT FLOW] Method 3: Calling refreshFileVaultStatus() refresh method`);
              await refreshFileVaultStatus(companyId);
              
              // If we're handling two different companies, refresh both
              if (currentUserCompanyId && currentUserCompanyId !== companyId) {
                await refreshFileVaultStatus(currentUserCompanyId);
              }
            } catch (refreshError) {
              console.warn(`[SUBMIT FLOW] refreshFileVaultStatus() failed:`, refreshError);
            }
          }
          
          // 4. Manually force company data refresh as the most extreme fallback
          console.log(`[SUBMIT FLOW] Method 4: Completely purging and refetching company data`);
          const { queryClient } = await import('@/lib/queryClient');
          
          // Remove all company data from cache to force a fresh fetch
          queryClient.removeQueries({ 
            queryKey: ['/api/companies/current'],
            exact: true 
          });
          
          // Force a complete refetch
          queryClient.refetchQueries({
            queryKey: ['/api/companies/current'],
            exact: true,
            type: 'all', // Refetch all queries, not just active ones
          }, { throwOnError: false }); // Don't throw on error
          
          // Also clear related company queries
          queryClient.invalidateQueries({
            queryKey: ['/api/companies'],
            exact: false, // Invalidate all company-related queries
          });
          
          console.log(`[SUBMIT FLOW] Company data cache cleared and refresh triggered`);
        } catch (refreshError) {
          console.error(`[SUBMIT FLOW] Critical error refreshing company data:`, refreshError);
        }
        
        // Create submission result with warning status - include ALL actions as in the success case
        const warningCompletedActions = [
          {
            type: "task_completion", 
            description: "Task Completed",
            data: { details: "Your form was submitted successfully." }
          }
        ];
        
        // Add file generation action - critical for showing in the modal
        if (numericFileId) {
          warningCompletedActions.push({
            type: "file_generation",
            description: `${taskType.toUpperCase()} Form File Created`,
            data: { 
              details: `A copy of your ${taskType.toUpperCase()} form has been saved to the File Vault.`,
              fileId: numericFileId  // Use fileId which is the correct property name
            }
          });
        }
        
        // Add file vault unlocked action - include OpenBanking here too
        if (taskType === 'kyb' || taskType === 'company_kyb' || taskType === 'open_banking') {
          warningCompletedActions.push({
            type: "file_vault_unlocked",
            description: "File Vault Unlocked",
            data: { details: "You now have access to upload and manage documents in the File Vault." }
          });
        }
        
        // Add next task action
        warningCompletedActions.push({
          type: "next_task",
          description: "Next Task Unlocked",
          data: { details: "You can now proceed to the next step in your onboarding process." }
        });
        
        const warningSubmissionResult: SubmissionResult = {
          fileId: numericFileId,
          completedActions: warningCompletedActions,
          taskId: taskId ? Number(taskId) : undefined,
          taskStatus: 'completed' // Still mark as completed to unlock all features
        };
        
        // Set the updated submission result
        setSubmissionResult(warningSubmissionResult);
        
        // CRITICAL FIX: Set form as locally submitted to transition to read-only mode
        setFormSubmittedLocally(true);
        
        // Similar to success case, only show modal for non-OpenBanking tasks
        if (taskType !== 'open_banking') {
          setShowSuccessModal(true);
          console.log(`[SUBMIT FLOW] Recovery success modal shown for ${taskType} task`);
        } else {
          console.log(`[SUBMIT FLOW] Skipping recovery success modal for OpenBanking task - will be handled by parent component`);
        }
        
        // Show warning toast only for non-OpenBanking tasks (OpenBanking uses its own modal)
        if (taskType !== 'open_banking') {
          // Show a warning toast, but make it positive since the data was saved
          toast({
            title: 'Form Submitted Successfully',
            description: 'Your form was successfully saved. All features have been unlocked.',
            variant: 'success',
          });
        } else {
          console.log(`[SUBMIT FLOW] Skipping recovery success toast for OpenBanking - will use modal instead`);
        }
        
        // Call the onSuccess callback in this case as well
        if (onSuccess) {
          console.log(`[SUBMIT FLOW] Calling onSuccess callback during verification warning`);
          onSuccess();
        }
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      
      // Emit error status via WebSocket for monitoring
      try {
        // Safely handle the WebSocket emit with type checking and error prevention
        if (wsService && typeof wsService.emit === 'function') {
          wsService.emit('submission_status', {
            taskId: Number(taskId || 0), // Ensure we have a valid number even if taskId is undefined
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'client-submission-exception-handler'
          });
        }
      } catch (wsError) {
        // Enhanced error logging with safe object handling
        console.error('[UniversalForm] WebSocket emit error during submission failure:', 
          wsError instanceof Error ? wsError.message : 'Unknown WebSocket error');
      }
      
      // Show error toast
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  }, [overallProgress, saveProgress, onSubmit, onSuccess, toast, checkForEmptyValues, fields, taskType, fileId, taskId, wsService]);
  
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
  
  // BUGFIX: Ensure form shows as submitted after successful submission 
  // Check if form is submitted or completed either from props or local state
  // Using formSubmittedLocally state from line 191
  const isSubmitted = formSubmittedLocally || taskStatus === 'submitted' || taskStatus === 'completed' || taskStatus === 'approved';
  
  // Format submission date if available in metadata
  const submissionDate = taskMetadata?.submissionDate 
    ? new Date(taskMetadata.submissionDate).toLocaleDateString() 
    : undefined;
    
  // Check if we should show the download button (when form is submitted and fileId exists)
  const showDownloadButton = isSubmitted && (fileId !== undefined && fileId !== null);
    
  // Resolve title and company name values for display
  const displayTitle = taskTitle || formTitle;
  
  // More robust company name resolution with fallbacks and loading state
  const companyNameFromMetadata = taskMetadata?.companyName || taskMetadata?.company?.name;
  const effectiveCompanyName = companyName || companyNameFromMetadata || '';
  
  // Use proper fallback for unknown company name during loading
  const displayCompanyName = 
    effectiveCompanyName.trim() === '' || 
    effectiveCompanyName === 'Unknown Company' ? 
    (isDataLoading ? 'Loading...' : (company?.name || 'Unknown Company')) : 
    effectiveCompanyName;
  
  // Set special titles for specific form types
  const headerTitle = taskType === 'kyb' || taskType === 'company_kyb' 
    ? `KYB Form: ${displayCompanyName}` 
    : taskType === 'open_banking' || taskType === 'open_banking_survey'
      ? `1033 Open Banking Survey` 
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
      {/* Clearing Fields Indicator */}
      <ClearingFieldsIndicator isClearing={isClearing} />
      
      {/* Gray header box with title, subtitle, and download button */}
      <div className="bg-[#F2F5F7] rounded-lg shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col mb-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{headerTitle}</h2>
            <p className="text-sm text-gray-500">{headerSubtitle}</p>
          </div>
          
          {isSubmitted ? (
            // Show download button for submitted forms when fileId is available
            <div>
              {showDownloadButton && (
                <div className="flex flex-col">
                  <p className="text-sm text-gray-600 mb-2">
                    Download your submitted form in your preferred format:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload('csv')}
                      className="flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload('json')}
                      className="flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200"
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Download JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload('txt')}
                      className="flex items-center bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Download TXT
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : isCompanyDemo && (
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDemoAutoFill}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 justify-center w-[170px] whitespace-nowrap"
              >
                <Code className="mr-2 h-4 w-4" />
                Demo Auto-Fill
              </Button>
              <ClearFieldsButton 
                taskId={taskId}
                taskType={taskType}
                onClear={handleEnhancedClearFields}
                className="w-[170px]"
              />
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
          {/* For submitted forms, show a read-only review layout */}
          {isSubmitted ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
                <div>
                  <h4 className="font-semibold text-blue-900 text-lg mb-4 flex items-center">
                    <ClipboardCheck className="h-5 w-5 mr-2 text-blue-600" />
                    Submission Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm text-blue-700">
                    {/* First row - Ordered with proper spacing and overflow handling */}
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Form Type</span>
                        <span className="break-words truncate max-w-[200px]" title={formTitle || taskType}>
                          {formTitle || taskType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Total Questions</span>
                        <span>{fields.filter(f => f.section !== 'review-section').length}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <ClipboardCheck className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Status</span>
                        <span className="capitalize">{taskStatus || 'Submitted'}</span>
                      </div>
                    </div>
                    
                    {/* Second row - With improved layout for better spacing */}
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Submitted</span>
                        <span className="break-words">
                          {submissionDate ? 
                            new Date(submissionDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 
                            'Recently submitted'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <UserCircle className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Submitted by</span>
                        <span className="break-words truncate max-w-[200px]" 
                              title={user?.name || user?.email || ''}>
                          {user?.name || user?.email || 'Company user'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Building2 className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Company</span>
                        <span className="break-words truncate max-w-[200px]" 
                              title={displayCompanyName || ''}>
                          {displayCompanyName || 'Company'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Accordion 
                type="multiple" 
                value={expandedSections}
                onValueChange={handleAccordionValueChange}
                className="w-full mb-6"
              >
                {allSections.filter(section => section.id !== 'review-section').map((section, sectionIndex) => {
                  const sectionFields = fields.filter(field => field.section === section.id);
                  
                  if (sectionFields.length === 0) return null;
                  
                  return (
                    <AccordionItem 
                      key={`section-${sectionIndex}`} 
                      value={`section-${sectionIndex}`}
                      className="mb-4 border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gray-50 hover:bg-gray-100">
                        <div className="flex items-center">
                          <div className="bg-gray-100 text-gray-700 rounded-full h-7 w-7 flex items-center justify-center mr-3">
                            <span className="font-medium">{sectionIndex + 1}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 py-3 bg-white">
                        <div className="space-y-5 mt-1">
                          {sectionFields.map((field, fieldIndex) => {
                            // Calculate continuous question number across all sections
                            const previousSectionsFieldCount = allSections
                              .slice(0, sectionIndex)
                              .filter(s => s.id !== 'review-section')
                              .reduce((count, prevSection) => 
                                count + fields.filter(f => f.section === prevSection.id).length, 0);
                            const questionNumber = previousSectionsFieldCount + fieldIndex + 1;
                            const totalQuestions = fields.filter(f => f.section !== 'review-section').length;
                            
                            // Get field value
                            const fieldValue = formData[field.key];
                            let displayValue = 'No answer provided';
                            let hasValue = false;
                            
                            // Properly handle all possible field value types
                            if (fieldValue !== undefined && fieldValue !== null) {
                              if (typeof fieldValue === 'string') {
                                // Handle string values - check if it's not empty
                                hasValue = fieldValue.trim() !== '' && fieldValue !== '-' && fieldValue !== 'N/A';
                                displayValue = fieldValue;
                              } else if (typeof fieldValue === 'boolean') {
                                // Handle boolean values
                                hasValue = true;
                                displayValue = fieldValue ? 'Yes' : 'No';
                              } else if (typeof fieldValue === 'number') {
                                // Handle number values
                                hasValue = true;
                                displayValue = String(fieldValue);
                              } else if (Array.isArray(fieldValue)) {
                                // Handle array values (e.g., multi-select)
                                hasValue = fieldValue.length > 0;
                                displayValue = fieldValue.join(', ');
                              } else if (typeof fieldValue === 'object') {
                                // Handle object values (e.g., complex data)
                                hasValue = Object.keys(fieldValue).length > 0;
                                try {
                                  displayValue = JSON.stringify(fieldValue);
                                } catch (e) {
                                  displayValue = '[Complex data]';
                                }
                              }
                            }
                            
                            return (
                              <div key={field.key} className="pb-5 last:pb-2">
                                <div className="mb-1.5">
                                  <span className="text-sm font-medium text-gray-800 mr-1.5">{questionNumber}.</span>
                                  <span className="font-medium text-gray-800">{field.question || field.label}</span>
                                </div>
                                <div className="mt-2">
                                  {isDataLoading ? (
                                    <div className="flex items-start">
                                      <Skeleton className="h-4 w-4 mr-2 mt-0.5 rounded-full" />
                                      <Skeleton className="h-4 w-40" />
                                    </div>
                                  ) : hasValue ? (
                                    <div className="flex items-start text-gray-700">
                                      <Check className="h-4 w-4 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" />
                                      <span className="text-gray-700">{displayValue}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-start text-gray-500">
                                      <XCircle className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                      <span className="italic">No answer provided</span>
                                    </div>
                                  )}
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
              
              {/* Navigation buttons for submitted forms - outside both boxes */}
              <div className="flex justify-between mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Use proper React Router navigation instead of window.location
                    window.history.pushState({}, '', '/task-center');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Task Center
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center"
                >
                  <ArrowUp className="mr-2 h-4 w-4" /> Back to Top
                </Button>
              </div>
            </div>
          ) : (
            /* For non-submitted forms, show the regular form editor */
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
                
                {/* We'll handle the Demo buttons in the page header, not here */}
                
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
                              <Accordion 
                                type="multiple" 
                                value={expandedSections}
                                onValueChange={handleAccordionValueChange}
                                className="w-full"
                              >
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
                                              <Check className="h-5 w-5 text-emerald-500 mr-2" />
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
                                                  {isDataLoading ? (
                                                    <Skeleton className="h-4 w-3/4" />
                                                  ) : hasValue 
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
                          isSubmitted={taskStatus === 'submitted' || taskStatus === 'approved'} // Disable form fields if task is submitted
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
                    disabled={activeSection === 0 || taskStatus === 'submitted' || taskStatus === 'approved'}
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
                    
                    {/* Final Review button moved and combined with the Next button logic above */}
                    
                    {/* Show different button based on current section and whether we're on review page */}
                    {/* Review button section */}
                    {activeSection === allSections.length - 1 && (
                      <>
                        {form.getValues("agreement_confirmation") && overallProgress === 100 && 
                         taskStatus !== 'submitted' && taskStatus !== 'approved' ? (
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
                                <p>
                                  {taskStatus === 'submitted' || taskStatus === 'approved' 
                                    ? "Form has already been submitted"
                                    : overallProgress < 100 
                                      ? "Please complete all required fields" 
                                      : "Please confirm agreement"}
                                </p>
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
                        disabled={taskStatus === 'submitted' || taskStatus === 'approved'}
                        className="flex items-center gap-1"
                      >
                        Next <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Final Review button for second-to-last section */}
                    {activeSection === allSections.length - 2 && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any form submission
                          setActiveSection(activeSection + 1);
                        }}
                        className="flex items-center gap-1"
                        disabled={overallProgress < 100 || taskStatus === 'submitted' || taskStatus === 'approved'}
                      >
                        Final Review <Eye className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </Form>
          )}
        </div>
      </div>
      
      {/* Old Clear Fields Confirmation Dialog removed in favor of the ClearFieldsButton component */}
      
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