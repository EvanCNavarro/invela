import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { componentFactory } from '../../services/componentFactory';
import { FormServiceInterface, FormField, FormSection, FormData, FormSubmitOptions } from '../../services/formService';
import { TaskTemplateService, TaskTemplateWithConfigs } from '../../services/taskTemplateService';
import { createFormSchema, sortFields, sortSections } from '../../utils/formUtils';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { SectionRenderer } from './renderers/SectionRenderer';

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
  const [activeTab, setActiveTab] = useState('all');
  
  // Setup form with validation
  const form = useForm({
    defaultValues: initialData,
    resolver: zodResolver(createFormSchema(fields)),
    mode: 'onChange',
  });
  
  // Request tracking to prevent multiple concurrent initialization attempts
  const [templateRequestId, setTemplateRequestId] = useState<string | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const MAX_INITIALIZATION_ATTEMPTS = 2;

  // Load template and configuration - step 1: fetch template 
  useEffect(() => {
    // Reset the initialization counter when task type changes
    setInitializationAttempts(0);
    
    // Generate a unique request ID for tracking
    const requestId = `${taskType}-${Date.now()}`;
    console.log(`[UniversalForm] Generated new request ID: ${requestId} for task type: ${taskType}`);
    
    // This approach ensures the request ID is properly set before the fetchTemplate runs
    setTemplateRequestId(requestId);
    
    const fetchTemplate = async () => {
      console.log(`[UniversalForm] Starting fetchTemplate with request ID: ${requestId}, current templateRequestId: ${templateRequestId}`);
      
      try {
        // Skip if we've exceeded max initialization attempts
        if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
          console.warn(`[UniversalForm] Exceeded maximum initialization attempts (${MAX_INITIALIZATION_ATTEMPTS})`);
          setError(`Failed to initialize form after ${MAX_INITIALIZATION_ATTEMPTS} attempts. Please refresh and try again.`);
          setLoading(false);
          return;
        }
        
        // Update attempt counter
        setInitializationAttempts(prev => prev + 1);
        
        // Important: We're using the locally captured requestId instead of templateRequestId state
        // This ensures we don't run into state timing issues
        
        console.log(`[UniversalForm] Starting template fetch for taskType: ${taskType}, attempt: ${initializationAttempts + 1}`);
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
        console.log(`[UniversalForm] Mapped task type: ${taskType} → ${dbTaskType}, URL will be /api/task-templates/by-type/${dbTaskType}`);
        
        // Log the current template request attempt
        console.log(`[UniversalForm] Template fetch attempt ${initializationAttempts + 1}/${MAX_INITIALIZATION_ATTEMPTS} for ${dbTaskType}`);
        
        // Fetch template configuration from API
        console.log(`[UniversalForm] Making template fetch request for ${dbTaskType} at ${new Date().toISOString()}`);
        console.log(`[UniversalForm] Request details:`, {
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
          console.log(`[UniversalForm] Template fetch response received at ${new Date().toISOString()}`);
          console.log(`[UniversalForm] Template data:`, {
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
          console.log(`[UniversalForm] Template loaded successfully: ID=${templateData.id}, Name=${templateData.name}`);
        } catch (error) {
          console.error(`[UniversalForm] Template fetch error for ${dbTaskType}:`, error);
          console.log(`[UniversalForm] Will attempt to continue anyway and check service registration`);
          // We'll continue execution and try to get the service, even without template
        }
        
        // Debug: Check if services are registered
        console.log('[UniversalForm] DEBUG: Checking service registration');
        const allServices = componentFactory.getRegisteredFormServices();
        const serviceKeys = Object.keys(allServices);
        console.log(`[UniversalForm] Available services: [${serviceKeys.join(', ')}]`);
        
        // Debug: Explicitly check for kyb service
        const kybServiceCheck = componentFactory.getFormService('kyb');
        console.log('[UniversalForm] KYB service available:', !!kybServiceCheck, 
          kybServiceCheck ? `(${kybServiceCheck.constructor.name})` : '');
        
        // Find the appropriate form service
        console.log(`[UniversalForm] Looking for form service for task type: ${taskType}`);
        let service = componentFactory.getFormService(taskType);
        
        if (service) {
          console.log(`[UniversalForm] Found form service using original task type: ${taskType}`, {
            serviceType: service.constructor.name
          });
        } else {
          // If not found with original task type, try with mapped DB task type
          console.log(`[UniversalForm] No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
          service = componentFactory.getFormService(dbTaskType);
          
          if (service) {
            console.log(`[UniversalForm] Found form service using mapped DB task type: ${dbTaskType}`, {
              serviceType: service.constructor.name
            });
          } else {
            // No service found for either task type
            console.error(`[UniversalForm] No service found for either ${taskType} or ${dbTaskType}`);
            throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
          }
        }
        
        // First set the template and service states - template might be undefined if there was an error
        console.log(`[UniversalForm] Setting template:`, templateData ? { 
          id: templateData.id, 
          name: templateData.name 
        } : 'null');
        setTemplate(templateData || null);
        
        console.log(`[UniversalForm] Setting form service:`, {
          serviceType: service ? service.constructor.name : 'null'
        });
        setFormService(service);
        
        // We'll use a second useEffect to handle initialization once the state is updated
      } catch (err) {
        // Only update state if this request is still relevant
        if (templateRequestId === requestId) {
          console.error('[UniversalForm] Error loading form template or service:', err);
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
        console.log(`[UniversalForm] Service already initialized with ${existingFields.length} fields and ${existingSections.length} sections`);
        
        // Set form structure directly without reinitializing
        setSections(sortSections(existingSections));
        setFields(sortFields(existingFields));
        setLoading(false);
        return; // Skip initialization
      }
    } catch (e) {
      // If we can't access fields/sections, service is not initialized yet
      console.log(`[UniversalForm] Service not yet initialized, proceeding with initialization`);
    }

    // Reset attempt counter when we get a new template or form service
    setServiceInitAttempts(0);
    
    // Generate a unique initialization ID
    const initId = `${template.id}-${Date.now()}`;
    console.log(`[UniversalForm] Generated new service initialization ID: ${initId}`);
    setServiceInitId(initId);
    
    const initializeService = async () => {
      console.log(`[UniversalForm] Starting service initialization with ID: ${initId}, current serviceInitId: ${serviceInitId}`);
      
      // Skip if we've exceeded max initialization attempts
      if (serviceInitAttempts >= MAX_SERVICE_INIT_ATTEMPTS) {
        console.warn(`[UniversalForm] Exceeded maximum service initialization attempts (${MAX_SERVICE_INIT_ATTEMPTS})`);
        setError(`Failed to initialize form service after ${MAX_SERVICE_INIT_ATTEMPTS} attempts. Please refresh and try again.`);
        setLoading(false);
        return;
      }
      
      // Update attempt counter
      setServiceInitAttempts(prev => prev + 1);
      
      // Important: Using the local initId instead of checking serviceInitId state
      // This avoids state update timing issues
      
      try {
        console.log(`[UniversalForm] Initializing form service with template ID ${template.id}, attempt: ${serviceInitAttempts + 1}`);
        
        // Let's add more debug info about the form service
        console.log(`[UniversalForm] Form service type: ${formService.constructor.name}`);
        
        // Check if any fields/sections are already available
        try {
          const existingFields = formService.getFields();
          const existingSections = formService.getSections();
          console.log(`[UniversalForm] Pre-init check - Fields: ${existingFields.length}, Sections: ${existingSections.length}`);
        } catch (e) {
          console.log(`[UniversalForm] Pre-init check - No fields/sections available yet`);
        }
        
        // Initialize the service with template ID - with timeout protection
        const initPromise = formService.initialize(template.id);
        
        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Service initialization timed out after 10 seconds')), 10000);
        });
        
        // Race the initialization against the timeout
        console.log(`[UniversalForm] Awaiting promise resolution...`);
        await Promise.race([initPromise, timeoutPromise]);
        console.log(`[UniversalForm] Service initialization completed successfully`);
        
        // IMPORTANT: We're NOT checking serviceInitId anymore because of React's 
        // asynchronous state updates. Using the locally captured initId throughout 
        // this function closure to maintain consistency.
        
        console.log(`[UniversalForm] Proceeding with service initialization (ID: ${initId})`);
        
        // Load initial data if available
        if (Object.keys(initialData).length > 0) {
          formService.loadFormData(initialData);
        }
        
        // Get form structure
        const formSections = sortSections(formService.getSections());
        const formFields = sortFields(formService.getFields());
        
        console.log(`[UniversalForm] Form structure loaded: ${formSections.length} sections, ${formFields.length} fields`);
        
        // Set state with the form structure
        setSections(formSections);
        setFields(formFields);
        
        // Form is ready
        setLoading(false);
      } catch (err) {
        // We're not checking serviceInitId here either, for the same reason
        // as above - React's asynchronous state updates can cause timing issues
        console.error('[UniversalForm] Error initializing form service:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize form');
        setLoading(false);
      }
    };
    
    initializeService();
  }, [template, formService, initialData]);
  
  // Handle form submission
  const handleSubmit = async (data: FormData) => {
    if (!formService) return;
    
    try {
      // Submit the form data
      const result = await formService.submit({
        taskId,
        formType: taskType,
        includeMetadata: true
      });
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data);
      }
      
      toast({
        title: 'Form submitted successfully',
        description: 'Your form has been submitted.',
        variant: 'default',
      });
      
      return result;
    } catch (err) {
      console.error('Error submitting form:', err);
      
      toast({
        title: 'Error submitting form',
        description: err instanceof Error ? err.message : 'An error occurred while submitting the form',
        variant: 'destructive',
      });
    }
  };
  
  // Handle form field changes
  const handleFieldChange = (name: string, value: any) => {
    if (!formService) return;
    
    // Update form data in the service
    formService.updateFormData(name, value);
    
    // Calculate and report progress if callback is provided
    if (onProgress) {
      // Simple progress calculation based on filled fields
      const filledFields = fields.filter(field => {
        const fieldValue = form.getValues(field.key);
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      });
      
      const progress = Math.round((filledFields.length / fields.length) * 100);
      onProgress(progress);
    }
  };
  
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
  
  // Group fields by section for tab view
  const sectionTabs = sections.map(section => ({
    id: section.id,
    title: section.title,
    fields: fields.filter(field => field.section === section.id)
  }));
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
        
        {sections.length > 1 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${sections.length + 1}, minmax(0, 1fr))` }}>
              <TabsTrigger value="all">All Fields</TabsTrigger>
              {sectionTabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.title}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {sections.length <= 1 ? (
              // If there is only one section or none, just render the fields without tabs
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
              // If there are multiple sections, use Tabs component
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Render all fields if "all" tab is active */}
                <TabsContent value="all" className="mt-0">
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
                </TabsContent>
                
                {/* Render section tabs */}
                {sectionTabs.map(tab => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    <div className="space-y-4">
                      {tab.fields.map(field => (
                        <FieldRenderer
                          key={field.key}
                          field={field}
                          template={template}
                          form={form}
                          onFieldChange={val => handleFieldChange(field.key, val)}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};