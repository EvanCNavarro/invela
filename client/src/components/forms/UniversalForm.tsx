import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { componentFactory } from '../../services/componentFactory';
import { FormServiceInterface, FormField, FormData, FormSubmitOptions, FormSection as ServiceFormSection } from '../../services/formService';
import { TaskTemplateService, TaskTemplateWithConfigs } from '../../services/taskTemplateService';
import { createFormSchema, sortFields, sortSections } from '../../utils/formUtils';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { SectionRenderer } from './renderers/SectionRenderer';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import SectionContent from './SectionContent';
import FormProgressBar from './FormProgressBar';
import { useFormProgress } from '@/hooks/use-form-progress';
import { getLogger } from '../../utils/logger';

// Create a type alias that combines both section types - using NavigationFormSection as our primary type
type FormSection = NavigationFormSection;

// Create logger instance with more restrictive logging configuration
const logger = getLogger('UniversalForm', {
  levels: {
    debug: false, // Turn off debug logging by default
    info: false,  // Turn off info logging by default
    warn: true,   // Keep warnings enabled
    error: true   // Keep errors enabled
  }
});

/**
 * Helper function to convert FormSection from service to navigation version
 * This handles the type conversion between service-specific FormSection and navigation component FormSection
 * 
 * @param serviceSections - Array of service-specific FormSection objects
 * @returns Array of NavigationFormSection objects suitable for the UI components
 */
const toNavigationSections = (serviceSections: ServiceFormSection[]): NavigationFormSection[] => {
  return serviceSections.map(section => {
    // Using the logger utility instead of direct console.log 
    // this is controlled by logger configuration and will only show in development by default
    logger.debug(`Processing section ${section.id} (${section.title}) with ${section.fields?.length || 0} fields`);
    
    return {
      id: section.id,
      title: section.title,
      order: section.order || 0,
      collapsed: section.collapsed || false,
      description: section.description,
      // Properly transfer the fields property from service section to navigation section
      fields: section.fields || [] // Ensure fields are properly copied over
    };
  });
};

// SectionRenderer is already memoized internally

// Helper function to debounce frequent operations
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface UniversalFormProps {
  taskId?: number;
  taskType: string;
  initialData?: FormData;
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
}

export const UniversalForm: React.FC<UniversalFormProps> = ({
  taskId,
  taskType,
  initialData = {},
  onSubmit,
  onCancel,
  onProgress
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TaskTemplateWithConfigs | null>(null);
  const [formService, setFormService] = useState<FormServiceInterface | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  
  // State to track loaded data
  const [loadedFormData, setLoadedFormData] = useState<FormData>(initialData);
  
  // Setup form with validation
  const form = useForm({
    defaultValues: loadedFormData,
    resolver: zodResolver(createFormSchema(fields)),
    mode: 'onChange',
  });
  
  // Request tracking to prevent multiple concurrent initialization attempts
  const [templateRequestId, setTemplateRequestId] = useState<string | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const MAX_INITIALIZATION_ATTEMPTS = 2;
  
  // Group fields by section for tab view - using useMemo to prevent unnecessary recalculations
  const sectionTabs = useMemo(() => {
    if (!sections || !fields) return [];
    
    // If the sections already have fields attached, use those
    if (sections.length > 0 && sections[0].fields && sections[0].fields.length > 0) {
      // Only log in development and not in production - using logger utility
      logger.debug(`Using pre-populated fields from sections`);
      return sections.map(section => ({
        id: section.id,
        title: section.title,
        fields: section.fields || []
      }));
    }
    
    // Otherwise, filter fields by section ID (fallback approach)
    logger.debug(`Filtering fields by section ID`);
    return sections.map(section => ({
      id: section.id,
      title: section.title,
      fields: fields.filter(field => field.section === section.id)
    }));
  }, [sections, fields]);

  // Load template and configuration - step 1: fetch template 
  useEffect(() => {
    // Reset the initialization counter when task type changes
    setInitializationAttempts(0);
    
    // Generate a unique request ID for tracking
    const requestId = `${taskType}-${Date.now()}`;
    logger.debug(`Generated new request ID: ${requestId} for task type: ${taskType}`);
    
    // This approach ensures the request ID is properly set before the fetchTemplate runs
    setTemplateRequestId(requestId);
    
    const fetchTemplate = async () => {
      logger.debug(`Starting fetchTemplate with request ID: ${requestId}, current templateRequestId: ${templateRequestId}`);
      
      try {
        // Skip if we've exceeded max initialization attempts
        if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
          logger.warn(`Exceeded maximum initialization attempts (${MAX_INITIALIZATION_ATTEMPTS})`);
          setError(`Failed to initialize form after ${MAX_INITIALIZATION_ATTEMPTS} attempts. Please refresh and try again.`);
          setLoading(false);
          return;
        }
        
        // Update attempt counter
        setInitializationAttempts(prev => prev + 1);
        
        // Important: We're using the locally captured requestId instead of templateRequestId state
        // This ensures we don't run into state timing issues
        
        logger.debug(`Starting template fetch for taskType: ${taskType}, attempt: ${initializationAttempts + 1}`);
        setLoading(true);
        setError(null);
        
        // Map task types to their database equivalents
        const taskTypeMap: Record<string, string> = {
          'kyb': 'company_kyb',
          'card': 'company_card',
          'security': 'security_assessment'
        };
        
        // Use the mapped task type for API requests
        const dbTaskType = taskTypeMap[taskType] || taskType;
        logger.debug(`Mapped task type: ${taskType} → ${dbTaskType}, URL will be /api/task-templates/by-type/${dbTaskType}`);
        
        // Log the current template request attempt
        logger.debug(`Template fetch attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS} for ${dbTaskType}`);
        
        // Fetch template configuration from API
        logger.debug(`Making template fetch request for ${dbTaskType} at ${new Date().toISOString()}`);
        logger.debug('Request details:', {
          taskId,
          originalTaskType: taskType,
          mappedTaskType: dbTaskType,
          requestId,
          attemptNumber: initializationAttempts + 1,
          timestamp: new Date().toISOString()
        });
        
        let templateData;
        try {
          templateData = await TaskTemplateService.getTemplateByTaskType(dbTaskType);
          logger.debug(`Template fetch response received at ${new Date().toISOString()}`);
          logger.debug(`Template data:`, {
            id: templateData.id,
            name: templateData.name,
            taskType: templateData.task_type, 
            component: templateData.component_type,
            configCount: templateData.configurations?.length
          });
          
          // Important: We are NOT checking templateRequestId here anymore
          // since it's an asynchronous state update and won't reliably reflect
          // our current requestId. We're using the locally captured requestId 
          // throughout this function closure instead.
          
          // Log template data
          logger.debug(`Template loaded successfully: ID=${templateData.id}, Name=${templateData.name}`);
        } catch (error) {
          logger.error(`Template fetch error for ${dbTaskType}:`, error);
          logger.info(`Will attempt to continue anyway and check service registration`);
          // We'll continue execution and try to get the service, even without template
        }
        
        // Debug: Check if services are registered
        logger.debug('Checking service registration');
        const allServices = componentFactory.getRegisteredFormServices();
        const serviceKeys = Object.keys(allServices);
        logger.debug(`Available services: [${serviceKeys.join(', ')}]`);
        
        // Debug: Explicitly check for kyb service
        const kybServiceCheck = componentFactory.getFormService('kyb');
        logger.debug('KYB service available:', {
          available: !!kybServiceCheck,
          type: kybServiceCheck ? kybServiceCheck.constructor.name : 'N/A'
        });
        
        // Find the appropriate form service
        logger.debug(`Looking for form service for task type: ${taskType}`);
        let service = componentFactory.getFormService(taskType);
        
        if (service) {
          logger.debug(`Found form service using original task type: ${taskType}`, {
            serviceType: service.constructor.name
          });
        } else {
          // If not found with original task type, try with mapped DB task type
          logger.debug(`No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
          service = componentFactory.getFormService(dbTaskType);
          
          if (service) {
            logger.debug(`Found form service using mapped DB task type: ${dbTaskType}`, {
              serviceType: service.constructor.name
            });
          } else {
            // No service found for either task type
            logger.error(`No service found for either ${taskType} or ${dbTaskType}`);
            throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
          }
        }
        
        // First set the template and service states - template might be undefined if there was an error
        logger.debug(`Setting template:`, templateData ? { 
          id: templateData.id, 
          name: templateData.name 
        } : 'null');
        setTemplate(templateData || null);
        
        logger.debug(`Setting form service:`, {
          serviceType: service ? service.constructor.name : 'null'
        });
        setFormService(service);
        
        // We'll use a second useEffect to handle initialization once the state is updated
      } catch (err) {
        // Only update state if this request is still relevant
        if (templateRequestId === requestId) {
          logger.error('Error loading form template or service:', err);
          setError(err instanceof Error ? err.message : 'Failed to load form template');
          setLoading(false);
        }
      }
    };
    
    fetchTemplate();
  }, [taskType]); 
  
  // Service initialization tracking
  const [serviceInitId, setServiceInitId] = useState<string | null>(null);
  const [serviceInitAttempts, setServiceInitAttempts] = useState(0);
  const MAX_SERVICE_INIT_ATTEMPTS = 5; // Increased from 2 to 5 to allow more attempts
  
  // Step 2: Initialize service once we have both template and service
  useEffect(() => {
    // Skip if we don't have both template and service
    if (!template || !formService) {
      return;
    }

    // Check if service is already initialized
    try {
      const existingFields = formService.getFields();
      const existingSections = formService.getSections();
      
      // If we already have fields and sections, the service is already initialized
      if (existingFields.length > 0 && existingSections.length > 0) {
        logger.debug(`Service already initialized with ${existingFields.length} fields and ${existingSections.length} sections`);
        
        // Set form structure directly without reinitializing
        // Get form structure from service and convert to NavigationFormSection type
        const sortedSections = sortSections(existingSections);
        const navigationSections = toNavigationSections(sortedSections);
        
        setSections(navigationSections);
        setFields(sortFields(existingFields));
        setLoading(false);
        return; // Skip initialization
      }
    } catch (e) {
      // If we can't access fields/sections, service is not initialized yet
      logger.debug(`Service not yet initialized, proceeding with initialization`);
    }

    // Reset attempt counter when we get a new template or form service
    setServiceInitAttempts(0);
    
    // Generate a unique initialization ID
    const initId = `${template.id}-${Date.now()}`;
    logger.debug(`Generated new service initialization ID: ${initId}`);
    setServiceInitId(initId);
    
    const initializeService = async () => {
      logger.debug(`Starting service initialization with ID: ${initId}, current serviceInitId: ${serviceInitId}`);
      
      // Skip if we've exceeded max initialization attempts
      if (serviceInitAttempts >= MAX_SERVICE_INIT_ATTEMPTS) {
        logger.warn(`Exceeded maximum service initialization attempts (${MAX_SERVICE_INIT_ATTEMPTS})`);
        setError(`Failed to initialize form service after ${MAX_SERVICE_INIT_ATTEMPTS} attempts. Please refresh and try again.`);
        setLoading(false);
        return;
      }
      
      // Update attempt counter
      setServiceInitAttempts(prev => prev + 1);
      
      // Important: Using the local initId instead of checking serviceInitId state
      // This avoids state update timing issues
      
      try {
        logger.debug(`Initializing form service with template ID ${template.id}, attempt: ${serviceInitAttempts + 1}`);
        
        // Let's add more debug info about the form service
        logger.debug(`Form service type: ${formService.constructor.name}`);
        
        // Check if any fields/sections are already available
        try {
          const existingFields = formService.getFields();
          const existingSections = formService.getSections();
          logger.debug(`Pre-init check - Fields: ${existingFields.length}, Sections: ${existingSections.length}`);
        } catch (e) {
          logger.debug(`Pre-init check - No fields/sections available yet`);
        }
        
        // Initialize the service with template ID - with timeout protection
        const initPromise = formService.initialize(template.id);
        
        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Service initialization timed out after 10 seconds')), 10000);
        });
        
        // Race the initialization against the timeout
        logger.debug(`Awaiting promise resolution...`);
        await Promise.race([initPromise, timeoutPromise]);
        logger.debug(`Service initialization completed successfully`);
        
        // IMPORTANT: We're NOT checking serviceInitId anymore because of React's 
        // asynchronous state updates. Using the locally captured initId throughout 
        // this function closure to maintain consistency.
        
        logger.debug(`Proceeding with service initialization (ID: ${initId})`);
        
        // If we have a taskId, load saved progress from the server
        if (taskId) {
          try {
            logger.debug(`Loading saved progress for task ID: ${taskId}`);
            // Add console log to always be visible
            console.log(`[DEBUG] Loading saved progress for task ID: ${taskId}`);
            const savedFormData = await formService.loadProgress(taskId);
            console.log(`[DEBUG] Successfully loaded saved progress:`, savedFormData);
            logger.debug(`Successfully loaded saved progress for task ID: ${taskId}`);
            
            // Critical: Update React Hook Form with the loaded data
            if (savedFormData && Object.keys(savedFormData).length > 0) {
              console.log(`[DEBUG] Updating form with saved data: ${Object.keys(savedFormData).length} fields`);
              logger.debug(`Updating form with saved data: ${Object.keys(savedFormData).length} fields`);
              // Update loadedFormData state to ensure it's available for form initialization
              setLoadedFormData(savedFormData);
              // Reset form with saved values
              form.reset(savedFormData);
            } else {
              console.log('[DEBUG] No saved data found or empty data object received');
            }
          } catch (loadError) {
            logger.error(`Error loading saved progress for task ID: ${taskId}:`, loadError);
            // Continue with initialization even if loading saved progress fails
            
            // If loading from server fails but we have initialData, use that instead
            if (Object.keys(initialData).length > 0) {
              logger.debug(`Using initialData as fallback for task ID: ${taskId}`);
              formService.loadFormData(initialData);
              // Update loadedFormData state
              setLoadedFormData(initialData);
              // Reset form with initial data
              form.reset(initialData);
            }
          }
        }
        // If no taskId but we have initialData, load it into the service
        else if (Object.keys(initialData).length > 0) {
          logger.debug(`No taskId provided, using initialData only`);
          formService.loadFormData(initialData);
          // Update loadedFormData state
          setLoadedFormData(initialData);
          // Reset form with initial data
          form.reset(initialData);
        }
        
        // Get form structure from service
        const serviceFormSections = sortSections(formService.getSections());
        const formFields = sortFields(formService.getFields());
        
        logger.debug(`Form structure loaded: ${serviceFormSections.length} sections, ${formFields.length} fields`);
        
        // Convert service sections to NavigationFormSection type
        const navigationSections = toNavigationSections(serviceFormSections);
        
        // Set state with the properly converted form structure
        setSections(navigationSections);
        setFields(formFields);
        
        // Form is ready
        setLoading(false);
      } catch (err) {
        // We're not checking serviceInitId here either, for the same reason
        // as above - React's asynchronous state updates can cause timing issues
        logger.error('Error initializing form service:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize form');
        setLoading(false);
      }
    };
    
    initializeService();
  }, [template, formService, initialData, taskId]);
  
  // Handle form submission
  const handleSubmit = async (data: FormData) => {
    if (!formService) return;
    
    try {
      logger.debug(`Submitting form data for task ID: ${taskId}, form type: ${taskType}`);
      
      // First make sure all data is saved
      const currentFormData = form.getValues();
      
      // Update any field that might have changed but not triggered an onChange
      Object.entries(currentFormData).forEach(([key, value]) => {
        if (key !== 'taskId' && key !== 'formType') {
          formService.updateFormData(key, value);
        }
      });
      
      // Submit the form data
      const result = await formService.submit({
        taskId,
        formType: taskType,
        includeMetadata: true
      });
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        logger.debug(`Executing onSubmit callback`);
        onSubmit(data);
      }
      
      toast({
        title: 'Form submitted successfully',
        description: 'Your form has been submitted.',
        variant: 'default',
      });
      
      logger.debug(`Form submitted successfully`);
      return result;
    } catch (err) {
      logger.error('Error submitting form:', err);
      
      toast({
        title: 'Error submitting form',
        description: err instanceof Error ? err.message : 'An error occurred while submitting the form',
        variant: 'destructive',
      });
    }
  };
  
  // Create a debounced version of the progress update
  const debouncedProgressUpdate = useCallback(
    debounce((fields: FormField[]) => {
      if (!onProgress) return;
      
      // Simple progress calculation based on filled fields
      const filledFields = fields.filter(field => {
        const fieldValue = form.getValues(field.key);
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      });
      
      const progress = Math.round((filledFields.length / fields.length) * 100);
      logger.debug(`Updating progress: ${progress}%`);
      onProgress(progress);
    }, 500), // 500ms debounce delay
    [onProgress, form, fields]
  );
  
  // Throttled field change handler to prevent excessive updates
  // Create a ref for the debounce timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleFieldChange = useCallback((name: string, value: any) => {
    if (!formService) {
      console.log('[DEBUG] Cannot update field - form service is not available');
      return;
    }
    
    // Enhanced logging that's more visible in console
    console.log(`[DEBUG UniversalForm] Field update: ${name} = ${value !== undefined && value !== null ? 
      (typeof value === 'object' ? JSON.stringify(value) : value) : 'empty'}`);
    
    // Get current form data before the update
    let previousData = {};
    try {
      previousData = formService.getFormData();
      console.log(`[DEBUG UniversalForm] Current form data before update has ${Object.keys(previousData).length} fields`);
    } catch (error) {
      console.log('[DEBUG UniversalForm] Could not get current form data', error);
    }
    
    // Update form data in the service
    formService.updateFormData(name, value);
    
    // Get updated form data after the update
    let updatedData = {};
    try {
      updatedData = formService.getFormData();
      console.log(`[DEBUG UniversalForm] Form data after update has ${Object.keys(updatedData).length} fields`);
    } catch (error) {
      console.log('[DEBUG UniversalForm] Could not get updated form data', error);
    }
    
    // Auto-save after changes (debounced)
    if (taskId) {
      const saveDelay = 1500; // 1.5 seconds delay
      console.log(`[DEBUG UniversalForm] Preparing to auto-save data for task ID: ${taskId}, field: ${name}, delay: ${saveDelay}ms`);
      
      // Clear previous timer if it exists
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        console.log('[DEBUG UniversalForm] Cleared previous auto-save timer');
      }
      
      // Capture current taskId in closure to ensure we're using the right one when timeout fires
      const currentTaskId = taskId;
      
      // Set new timer for auto-save
      saveTimerRef.current = setTimeout(async () => {
        try {
          // Before saving, retrieve the latest form data from service
          const formDataBeforeSave = formService.getFormData();
          console.log(`[DEBUG UniversalForm] Auto-saving form data for task ID: ${currentTaskId}, 
            field count: ${Object.keys(formDataBeforeSave).length}`);
          
          // Sample some fields for verification
          const fieldSample = Object.entries(formDataBeforeSave).slice(0, 3);
          console.log(`[DEBUG UniversalForm] Form data sample before save:`, fieldSample);
          
          // Proceed with saving
          const result = await formService.save({
            taskId: currentTaskId,
            formType: taskType,
            includeMetadata: true
          });
          
          console.log(`[DEBUG UniversalForm] Auto-save result: ${result ? 'success' : 'failed'}, 
            timestamp: ${new Date().toISOString()}`);
        } catch (error) {
          console.error(`[DEBUG UniversalForm] Auto-save error:`, error);
          logger.error(`Auto-save failed:`, error);
        }
      }, 1500);
      console.log(`[DEBUG] Set new auto-save timer for task ID: ${currentTaskId}`);
    } else {
      console.log('[DEBUG] No taskId available, skipping auto-save');
    }
    
    // Use debounced progress calculation
    if (onProgress) {
      debouncedProgressUpdate(fields);
      console.log('[DEBUG] Triggered progress update');
    }
  }, [formService, fields, debouncedProgressUpdate, onProgress, taskId, taskType]);
  
  // Always call hooks at the top level in the same order
  // This fixes the React hooks order error
  
  // Use memoized form values with useCallback to prevent infinite loops
  // Only get the current values when we explicitly need them
  const getFormValues = useCallback(() => {
    return form.getValues();
  }, [form]);
  
  const formProgressState = useFormProgress({
    sections: sections,
    getFormValues: getFormValues, // Pass the function instead of the values
    fields: fields,
    requiredOnly: true
  });
  
  // If still loading or error occurred
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Form...</CardTitle>
          <CardDescription>Please wait while we load the form.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Error Loading Form</CardTitle>
          <CardDescription>We encountered an error while loading the form.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-destructive text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="mt-4">
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // If no template or form service was found
  if (!template || !formService) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Form Not Found</CardTitle>
          <CardDescription>The requested form could not be found.</CardDescription>
        </CardHeader>
        <CardContent>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Destructure the form progress state only after we've determined we're going to use it
  const { activeSection, setActiveSection, completedSections, overallProgress } = formProgressState;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
        
        {/* Overall progress indicator */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{overallProgress}%</span>
          </div>
          <FormProgressBar 
            progress={overallProgress} 
            height="md"
            color={overallProgress === 100 ? 'success' : 'primary'}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Section navigation */}
        {sections.length > 1 && (
          <ResponsiveSectionNavigation
            sections={sections}
            activeSection={activeSection}
            completedSections={completedSections}
            onSectionChange={setActiveSection}
            className="mb-6"
          />
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {sections.length <= 1 ? (
              // If there is only one section, just render all fields
              <div className="space-y-6">
                {sections.map(section => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    template={template}
                    form={form}
                    onFieldChange={handleFieldChange}
                  />
                ))}
              </div>
            ) : (
              // If there are multiple sections, render the active section with animation
              <div className="min-h-[300px]">
                {sections.map((section, index) => (
                  <SectionContent
                    key={section.id}
                    isActive={index === activeSection}
                    direction={index > activeSection ? 'right' : 'left'}
                  >
                    <div className="space-y-6">
                      <SectionRenderer
                        section={section}
                        template={template}
                        form={form}
                        onFieldChange={handleFieldChange}
                      />
                    </div>
                  </SectionContent>
                ))}
              </div>
            )}
            
            {/* Navigation and submission buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div>
                {activeSection > 0 && sections.length > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setActiveSection(activeSection - 1)}
                  >
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                
                {activeSection < sections.length - 1 && sections.length > 1 ? (
                  <Button 
                    type="button" 
                    onClick={() => setActiveSection(activeSection + 1)}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit">Submit</Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};