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
  
  // State for accordion management
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
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
  
  // Determine the demo status from the API (database) FIRST, only use company name as fallback
  useEffect(() => {
    if (taskId) {
      // Log the raw taskId to help debug
      logger.info(`[UniversalForm] Checking demo status for taskId: ${taskId}, type: ${typeof taskId}`);
      console.log(`DEBUG: Current isCompanyDemo state = ${isCompanyDemo}`);
      
      // ALWAYS try the API first to get the true database value
      const fetchCompanyDemoStatus = async () => {
        try {
          // Make a specific API call to check this company's demo status
          const apiUrl = `/api/companies/is-demo?taskId=${taskId}`;
          logger.info(`[UniversalForm] Making API request to: ${apiUrl}`);
          
          const response = await fetch(apiUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            // Debug information
            console.log('Is-Demo API Response:', {
              data,
              responseOk: response.ok,
              isDemo: data.isDemo,
              isDemoType: typeof data.isDemo,
              debug: data.debug
            });
            
            // IMPORTANT: Use the database value (which you can change) rather than hardcoded logic
            const isDemoCompany = data.isDemo;
            setIsCompanyDemo(isDemoCompany);
            logger.info(`[UniversalForm] Company demo status fetched from API: ${data.isDemo} (${typeof data.isDemo}), setting to ${isDemoCompany}`);
            console.log(`[DEBUG] Set isCompanyDemo to ${isDemoCompany} via API response (database value)`);
            return; // Exit since we have the definitive answer from the database
          } else {
            const errorText = await response.text();
            logger.warn(`[UniversalForm] Failed to fetch company demo status: ${response.status}, Response: ${errorText}`);
            
            // ONLY use the company name check as a FALLBACK if the API fails
            if (taskMetadata && typeof taskMetadata === 'object') {
              // Log that we're falling back to company name check
              logger.info(`[UniversalForm] API failed, falling back to metadata check`);
              
              // Get the company ID first, as that's more reliable than name
              const companyId = taskMetadata.company_id;
              if (companyId) {
                logger.info(`[UniversalForm] Using company ID ${companyId} from metadata`);
                
                // Try a different API endpoint with company ID directly
                try {
                  const companyResponse = await fetch(`/api/companies/${companyId}`);
                  if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    logger.info(`[UniversalForm] Successfully fetched company data:`, companyData);
                    
                    // Use the is_demo flag from the company data
                    setIsCompanyDemo(companyData.is_demo === true);
                    console.log(`[DEBUG] Set isCompanyDemo to ${companyData.is_demo} from company API endpoint`);
                    return;
                  }
                } catch (companyError) {
                  logger.error(`[UniversalForm] Error fetching company data:`, companyError);
                }
              }
              
              // As a last resort, check company name
              // NOTE: THIS SHOULD RARELY IF EVER BE NEEDED NOW
              const companyName = taskMetadata.company_name;
              logger.info(`[UniversalForm] Checking company name: ${companyName}`);
              
              // IMPORTANT: We're now checking ONLY as an emergency fallback
              if (companyName === 'DevelopmentTesting3') {
                logger.info(`[UniversalForm] FALLBACK: Company name is DevelopmentTesting3 but trying not to use this check`);
                // This fallback should ideally never be used now
                // For now, we'll set to false to force use of the database value
                setIsCompanyDemo(false);
                console.log('[DEBUG] Set isCompanyDemo to FALSE even though name is DevelopmentTesting3 (prefer database)');
                return;
              }
            }
            
            // Default to false if all else fails
            setIsCompanyDemo(false);
            console.log('[DEBUG] Set isCompanyDemo to false due to API error and no fallback match');
          }
        } catch (err) {
          logger.error(`[UniversalForm] Error fetching company demo status:`, err);
          
          // Default to false on error
          setIsCompanyDemo(false);
          console.log('[DEBUG] Set isCompanyDemo to false due to exception');
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
      return;
    }
    
    try {
      logger.info(`[UniversalForm] Starting demo auto-fill for task ${taskId}`);
      
      // Show loading toast
      toast({
        title: "Auto-Fill In Progress",
        description: "Loading demo data...",
        duration: 3000,
      });
      
      // Make API call to get demo data
      const response = await fetch(`/api/kyb/demo-autofill/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const demoData = await response.json();
      
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
      
      // Reset the entire form with these values
      form.reset(completeData);
      
      // For each field, manually update it in both React Hook Form and our backend
      for (const [fieldName, fieldValue] of Object.entries(completeData)) {
        // Update React Hook Form field
        form.setValue(fieldName, fieldValue);
        
        // Update backend via our field update mechanism
        updateField(fieldName, fieldValue);
      }
      
      // Save progress to server
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
      
    } catch (err) {
      logger.error('[UniversalForm] Auto-fill error:', err);
      toast({
        variant: "destructive",
        title: "Auto-Fill Failed",
        description: err instanceof Error ? err.message : "There was an error loading demo data",
      });
    }
  }, [taskId, form, fields, updateField, saveProgress, refreshStatus, toast, onProgress]);
  
  // State for the clear fields confirmation dialog
  const [showClearFieldsDialog, setShowClearFieldsDialog] = useState(false);

  // Actual function to perform the clearing operation after confirmation
  const doClearFields = useCallback(async () => {
    try {
      logger.info(`[UniversalForm] Clearing all fields for task ${taskId}`);
      
      // Show loading toast - don't save the reference
      toast({
        title: "Clearing Fields",
        description: "Removing all entered data...",
        duration: 3000,
      });
      
      // Create an empty object with all fields set to empty strings
      const emptyData: Record<string, string> = {};
      
      // Set all form fields to empty strings
      fields.forEach(field => {
        emptyData[field.key] = '';
      });
      
      // First reset the entire form at once
      form.reset(emptyData);
      
      // Then update each field individually to ensure both UI and backend are updated
      for (const fieldName of Object.keys(emptyData)) {
        // Update React Hook Form field
        form.setValue(fieldName, '');
        
        // Update backend via our field update mechanism
        updateField(fieldName, '');
        
        // Clear any validation errors
        form.clearErrors(fieldName);
      }
      
      // Save progress after clearing
      if (saveProgress) {
        await saveProgress();
        logger.info('[UniversalForm] Saved progress after clearing fields');
      }
      
      // Show success message
      toast({
        title: "Fields Cleared",
        description: "All form fields have been cleared successfully.",
        variant: "success",
      });
      
      // Refresh status display
      refreshStatus();
      
      // Reset progress to 0%
      if (onProgress) {
        onProgress(0);
      }
      
      // Close the dialog
      setShowClearFieldsDialog(false);
      
    } catch (err) {
      logger.error('[UniversalForm] Clear fields error:', err);
      toast({
        variant: "destructive",
        title: "Clear Fields Failed",
        description: err instanceof Error ? err.message : "There was an error clearing the form fields",
      });
    }
  }, [taskId, fields, form, updateField, saveProgress, refreshStatus, toast, onProgress, setShowClearFieldsDialog]);
  
  // Handle clearing all fields in the form - shows confirmation dialog
  const handleClearFields = useCallback(() => {
    setShowClearFieldsDialog(true);
  }, []);
  
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
      toast({
        title: "Submitting Form...",
        description: "Please wait while we process your submission.",
        variant: "default",
        duration: 5000,
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
        completedActions.push({
          type: "file_generation",
          description: `${taskType.toUpperCase()} Form File Created`,
          data: { 
            details: "The form data has been saved as a document in your file vault."
          }
        });
      }
      
      // Add file vault unlocked action for KYB form
      if (taskType === 'kyb' || taskType === 'company_kyb') {
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
      
      // Set submission result following the SubmissionResult interface
      setSubmissionResult({
        fileId: numericFileId,
        completedActions,
        taskId: taskId ? Number(taskId) : undefined,
        taskStatus: 'completed'
      });
      
      // Only proceed with success flow if we haven't caught an error during form submission
      try {
        // Verify the task status has been successfully updated in the database
        const statusCheckResponse = await fetch(`/api/tasks/${taskId}`);
        const taskStatusData = await statusCheckResponse.json();
        
        // Only show success UI if task status is updated in the database
        if (taskStatusData.status === 'submitted' || taskStatusData.progress >= 95) {
          // Fire confetti animation FIRST (before showing modal)
          const { fireSuperConfetti } = await import('@/utils/confetti');
          fireSuperConfetti();
          
          // Brief delay to ensure modal displays correctly after confetti
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Show success toast notification
          toast({
            title: "Form Submitted Successfully",
            description: "Your form has been submitted successfully.",
            variant: "success",
          });
          
          // Show success modal AFTER confetti has been fired
          setShowSuccessModal(true);
        } else {
          // Task status not properly updated, show warning
          toast({
            title: "Submission Status Pending",
            description: "Your form data has been saved, but submission status is still updating.",
            variant: "warning",
          });
        }
        
        // Then call the onSubmit callback if provided
        if (onSubmit) {
          onSubmit(data);
        }
      } catch (statusCheckError) {
        logger.error('Status verification error:', statusCheckError);
        
        toast({
          title: 'Submission Status Uncertain',
          description: 'Your form data was saved, but we could not verify final submission status.',
          variant: 'warning',
        });
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      
      // Show error toast
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  }, [overallProgress, saveProgress, onSubmit, toast, checkForEmptyValues, fields]);
  
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
        <div className="flex flex-col mb-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{headerTitle}</h2>
            <p className="text-sm text-gray-500">{headerSubtitle}</p>
          </div>
          
          {isSubmitted ? (
            <div className="self-start">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearFields}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 justify-center w-[170px] whitespace-nowrap"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Clear Fields
              </Button>
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
                        <span className="break-words">{submissionDate || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <UserCircle className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Submitted by</span>
                        <span className="break-words truncate max-w-[200px]" title={user?.name || user?.email || 'N/A'}>
                          {user?.name || user?.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Building2 className="h-4 w-4 mr-2.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-medium">Company</span>
                        <span className="break-words truncate max-w-[200px]" title={displayCompanyName || 'N/A'}>
                          {displayCompanyName || 'N/A'}
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
                            const displayValue = fieldValue ? String(fieldValue) : '-';
                            
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
                                  ) : fieldValue && fieldValue !== '-' ? (
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
                    
                    {/* Final Review button moved and combined with the Next button logic above */}
                    
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
                    
                    {/* Final Review button for second-to-last section */}
                    {activeSection === allSections.length - 2 && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any form submission
                          setActiveSection(activeSection + 1);
                        }}
                        className="flex items-center gap-1"
                        disabled={overallProgress < 100}
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
      
      {/* Clear Fields Confirmation Dialog */}
      <AlertDialog open={showClearFieldsDialog} onOpenChange={setShowClearFieldsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Fields</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all fields? This action cannot be undone 
              and all information entered in this form will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={doClearFields}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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