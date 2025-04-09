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
  
  // When fields or initialData change, reset the form with the new values
  useEffect(() => {
    if (fields.length > 0) {
      console.log('[UniversalForm] Fields or initialData changed, resetting form values');
      
      // First reset to empty state then set values one by one with validation
      form.reset({});
      
      // Add each field individually to ensure proper controlled component behavior
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          form.setValue(key, value, {
            shouldValidate: true,
            shouldDirty: false,
            shouldTouch: false
          });
        }
      });
    }
  }, [fields, initialData, form]);
  
  // Load template and configuration - step 1: fetch template 
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
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
        console.log(`[UniversalForm] Mapped task type: ${taskType} → ${dbTaskType}`);
        
        // Fetch template configuration from API
        const templateData = await TaskTemplateService.getTemplateByTaskType(dbTaskType);
        
        // Log template data
        console.log(`[UniversalForm] Template loaded successfully: ID=${templateData.id}, Name=${templateData.name}`);
        
        // Find the appropriate form service
        let service = componentFactory.getFormService(taskType);
        
        if (service) {
          console.log(`[UniversalForm] Found form service using original task type: ${taskType}`);
        } else {
          // If not found with original task type, try with mapped DB task type
          service = componentFactory.getFormService(dbTaskType);
          
          if (service) {
            console.log(`[UniversalForm] Found form service using mapped DB task type: ${dbTaskType}`);
          } else {
            // No service found for either task type
            throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
          }
        }
        
        // First set the template and service states
        setTemplate(templateData);
        setFormService(service);
        
        // We'll use a second useEffect to handle initialization once the state is updated
      } catch (err) {
        console.error('[UniversalForm] Error loading form template or service:', err);
        setError(err instanceof Error ? err.message : 'Failed to load form template');
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [taskType]); 
  
  // Step 2: Initialize service once we have both template and service
  useEffect(() => {
    const initializeService = async () => {
      // Only proceed if we have both template and service
      if (!template || !formService) {
        return;
      }
      
      try {
        console.log(`[UniversalForm] Initializing form service with template ID ${template.id}`);
        
        // Initialize the service with template ID
        await formService.initialize(template.id);
        
        // Load initial data if available
        if (Object.keys(initialData).length > 0) {
          formService.loadFormData(initialData);
        }
        
        // Get form structure
        const formSections = sortSections(formService.getSections());
        const formFields = sortFields(formService.getFields());
        
        setSections(formSections);
        setFields(formFields);
        
        setLoading(false);
      } catch (err) {
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
    
    console.log(`[UniversalForm] Field changed: ${name} = ${JSON.stringify(value)}`);
    
    // Update form data in the service
    formService.updateFormData(name, value);
    
    // Also explicitly update the form values to ensure React Hook Form is in sync
    form.setValue(name, value, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
    
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