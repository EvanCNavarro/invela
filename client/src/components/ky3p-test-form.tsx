/**
 * KY3P Test Form Component
 * 
 * This component demonstrates the use of the enhanced KY3P form service
 * and provides a way to test the form clearing functionality.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { formServiceFactory } from '@/services/form-service-factory';
import { AlertCircle } from 'lucide-react';
import { EnhancedKY3PFormService } from '@/services/enhanced-ky3p-form-service';
import '../services/register-standardized-services';

interface KY3PTestFormProps {
  taskId?: number;
  templateId?: number;
}

/**
 * KY3P Test Form Component
 * 
 * This component demonstrates the enhanced KY3P form service and provides
 * buttons to test the form clearing functionality and navigation.
 */
export default function KY3PTestForm({ taskId = 662, templateId = 1 }: KY3PTestFormProps) {
  const [formService, setFormService] = useState<EnhancedKY3PFormService | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  
  // Create and initialize the form service
  useEffect(() => {
    async function initializeFormService() {
      try {
        console.log('Creating enhanced KY3P form service for task', taskId);
        // Default company ID for testing purposes
        const companyId = 248; // This should match a valid company in your database
        console.log('Creating enhanced KY3P form service for company', companyId, 'and task', taskId);
        const service = formServiceFactory.getServiceInstance('ky3p', companyId, taskId) as EnhancedKY3PFormService;
        
        if (!service) {
          console.error('Failed to create enhanced KY3P form service');
          return;
        }
        
        setFormService(service);
        
        console.log('Initializing form service with template', templateId);
        await service.initialize(templateId);
        
        // Add error checking for sections and data
        const serviceSections = service.getSections() || [];
        console.log('Retrieved sections:', serviceSections);
        setSections(serviceSections);
        
        const serviceFormData = service.getFormData() || {};
        console.log('Retrieved form data keys:', Object.keys(serviceFormData).length);
        setFormData(serviceFormData);
        
        // Calculate progress safely
        let serviceProgress = 0;
        try {
          serviceProgress = service.calculateProgress();
        } catch (progressError) {
          console.error('Error calculating progress:', progressError);
        }
        setProgress(serviceProgress);
        
        setInitialized(true);
        console.log('Form service initialized successfully');
      } catch (error) {
        console.error('Error initializing form service:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize form service: ' + (error as Error).message,
          variant: 'destructive'
        });
      }
    }
    
    initializeFormService();
  }, [taskId, templateId]);
  
  // Handle form clearing
  const handleClearForm = async () => {
    if (!formService) {
      toast({
        title: 'Error',
        description: 'Form service not initialized',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Clearing form fields');
      const result = await formService.clearFields(taskId);
      
      if (result) {
        console.log('Form fields cleared successfully');
        
        // Refresh the form data and sections safely
        const updatedFormData = formService.getFormData() || {};
        console.log('Updated form data after clearing:', Object.keys(updatedFormData).length);
        setFormData(updatedFormData);
        
        // Calculate progress safely
        let updatedProgress = 0;
        try {
          updatedProgress = formService.calculateProgress();
        } catch (progressError) {
          console.error('Error calculating progress after clearing:', progressError);
        }
        setProgress(updatedProgress);
        
        toast({
          title: 'Success',
          description: 'Form fields cleared successfully',
          variant: 'default'
        });
      } else {
        console.error('Failed to clear form fields');
        toast({
          title: 'Error',
          description: 'Failed to clear form fields',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error clearing form fields:', error);
      toast({
        title: 'Error',
        description: 'Error clearing form fields: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  };
  
  // Handle demo auto-fill
  const handleDemoAutoFill = async () => {
    if (!formService) {
      toast({
        title: 'Error',
        description: 'Form service not initialized',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Performing demo auto-fill');
      
      // Call the KY3P demo auto-fill endpoint
      const response = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Demo auto-fill failed:', errorText);
        toast({
          title: 'Error',
          description: 'Demo auto-fill failed: ' + errorText,
          variant: 'destructive'
        });
        return;
      }
      
      const result = await response.json();
      console.log('Demo auto-fill result:', result);
      
      // Refresh the form data and progress safely
      try {
        await formService.loadResponses(taskId);
        console.log('Responses loaded successfully after demo auto-fill');
        
        const updatedFormData = formService.getFormData() || {};
        console.log('Updated form data after demo auto-fill:', Object.keys(updatedFormData).length);
        setFormData(updatedFormData);
        
        // Calculate progress safely
        let updatedProgress = 0;
        try {
          updatedProgress = formService.calculateProgress();
        } catch (progressError) {
          console.error('Error calculating progress after demo auto-fill:', progressError);
        }
        setProgress(updatedProgress);
      } catch (loadError) {
        console.error('Error loading responses after demo auto-fill:', loadError);
      }
      
      toast({
        title: 'Success',
        description: 'Demo auto-fill completed successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error performing demo auto-fill:', error);
      toast({
        title: 'Error',
        description: 'Error performing demo auto-fill: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  };
  
  // Render the component
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced KY3P Form Service Test</CardTitle>
        <CardDescription>
          Test the enhanced KY3P form service functionality for task {taskId}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Form Status</AlertTitle>
            <AlertDescription>
              {initialized ? 
                `Form service initialized with ${sections.length} sections and ${Object.keys(formData).length} form data entries. Progress: ${progress}%` : 
                'Form service not yet initialized'}
            </AlertDescription>
          </Alert>
          
          <div className="flex space-x-4">
            <Button
              onClick={handleClearForm}
              variant="outline"
              disabled={!initialized}
            >
              Clear Form Fields
            </Button>
            
            <Button
              onClick={handleDemoAutoFill}
              variant="default"
              disabled={!initialized}
            >
              Demo Auto-Fill
            </Button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Form Sections</h3>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div key={section.id} className="p-2 border rounded">
                  <h4 className="font-medium">{section.title}</h4>
                  <p className="text-sm text-gray-500">{section.fields.length} fields</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Form Data Sample</h3>
            <div className="p-2 border rounded bg-gray-50 overflow-auto max-h-40">
              <pre className="text-xs">
                {JSON.stringify(Object.entries(formData).slice(0, 5), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
