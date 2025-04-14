import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { componentFactory } from '@/services/componentFactory';
import { FormServiceInterface, FormField, FormData, FormSection as ServiceFormSection } from '@/services/formService';
import { TaskTemplateService, TaskTemplateWithConfigs } from '@/services/taskTemplateService';
import { sortFields, sortSections } from '@/utils/formUtils';
import getLogger from '@/utils/logger';

// Import our new improved hooks and components
import { useFormDataManager } from '@/hooks/form/use-form-data-manager';
import { useFormStatus, SectionStatus } from '@/hooks/form/use-form-status';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import FormProgressBar from './FormProgressBar';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { SectionRenderer } from './renderers/SectionRenderer';
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
  // Core state for form initialization
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TaskTemplateWithConfigs | null>(null);
  const [formService, setFormService] = useState<FormServiceInterface | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  
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
      logger.info('Form submitted');
      
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
  }, [saveProgress, onSubmit]);
  
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
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>{formDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Loading form...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>{formDescription}</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <div className="p-4 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700">
            <h3 className="font-medium mb-2">Error Loading Form</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
        </CardContent>
      </Card>
    );
  }
  
  // If we have no sections or fields, show empty state
  if (sections.length === 0 || fields.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
          <CardDescription>{formDescription}</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <div className="p-4 mb-4 border border-amber-200 bg-amber-50 rounded-md text-amber-700">
            <h3 className="font-medium mb-2">No Form Content Available</h3>
            <p className="text-sm">This form has no sections or fields defined.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render main form
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
        <CardDescription>{formDescription}</CardDescription>
        
        {/* Progress bar showing overall completion */}
        <div className="mt-4">
          <FormProgressBar progress={overallProgress} />
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Section navigation tabs */}
            <ResponsiveSectionNavigation
              sections={sections}
              sectionStatuses={sectionStatuses}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
            
            {/* Data loading indicator */}
            {isDataLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading saved data...</span>
              </div>
            )}
            
            {/* Data error display */}
            {dataError && (
              <div className="p-3 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                {dataError}
              </div>
            )}
            
            {/* Section content */}
            <div className="bg-white rounded-md p-6 border border-slate-200">
              {/* Current section content */}
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={index === activeSection ? 'block' : 'hidden'}
                >
                  <SectionContent
                    section={section}
                    fields={fields.filter(field => field.section === section.id)}
                    onFieldChange={handleFieldChange}
                  />
                </div>
              ))}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between">
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
                
                {activeSection < sections.length - 1 ? (
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

export default UniversalForm;
