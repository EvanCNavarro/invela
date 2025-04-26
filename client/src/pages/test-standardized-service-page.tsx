import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { componentFactory } from '@/services/componentFactory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FormField, FormSection } from '@/services/formService';
import { useStandardizedServices } from '@/services/register-standardized-services';
import { Loader2 } from 'lucide-react';

const SAMPLE_TASK_ID = 654; // KY3P test task

export default function TestStandardizedServicePage() {
  const [loading, setLoading] = useState(true);
  const [formService, setFormService] = useState<any>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [testTaskId, setTestTaskId] = useState<number>(SAMPLE_TASK_ID);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{status: string, progress: number} | null>(null);
  
  // On initial load, switch to standardized services
  useEffect(() => {
    try {
      console.log('[TestStandardizedService] Enabling standardized services by default');
      useStandardizedServices();
      toast({
        title: "Standardized services enabled",
        description: "Now using string-based field keys for all form types"
      });
    } catch (err: any) {
      console.error('[TestStandardizedService] Error enabling standardized services:', err);
      setError(`Error enabling standardized services: ${err.message || 'Unknown error'}`);
    }
    
    // Initial load of the form service
    loadFormService();
  }, []);
  
  const loadFormService = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get the form service for KY3P forms using the component factory
      const serviceInstance = componentFactory.getFormService('ky3p');
      console.log('[TestStandardizedService] Form service created:', serviceInstance);
      
      if (!serviceInstance) {
        throw new Error('Form service could not be created');
      }
      
      setFormService(serviceInstance);
      
      // Set the task ID and initialize the form
      serviceInstance.setTaskId(testTaskId);
      await serviceInstance.initialize(10); // Generic template ID
      
      // Load the form fields and sections
      const fieldData = serviceInstance.getFields();
      const sectionData = serviceInstance.getSections();
      
      setFields(fieldData);
      setSections(sectionData);
      
      // Load current responses
      const responses = await serviceInstance.getResponses();
      setFormData(responses);
      
      // Get progress
      const progressData = await serviceInstance.getProgress();
      setProgress(progressData);
      
      toast({
        title: "Form service loaded",
        description: `Loaded ${fieldData.length} fields across ${sectionData.length} sections`
      });
    } catch (err: any) {
      console.error('[TestStandardizedService] Error loading form service:', err);
      setError(`Error loading form service: ${err.message || 'Unknown error'}`);
      toast({
        title: "Error loading form service",
        description: err.message || 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveField = async (fieldKey: string, value: any) => {
    try {
      console.log(`[TestStandardizedService] Saving field ${fieldKey} with value:`, value);
      
      if (!formService) {
        throw new Error('Form service not initialized');
      }
      
      // Update field in form service
      const success = await formService.saveField(fieldKey, value);
      
      if (success) {
        // Update local state
        setFormData(prev => ({
          ...prev,
          [fieldKey]: value
        }));
        
        toast({
          title: "Field saved",
          description: `Successfully saved field: ${fieldKey}`
        });
        
        // Refresh progress
        const progressData = await formService.getProgress();
        setProgress(progressData);
      } else {
        throw new Error('Failed to save field');
      }
    } catch (err: any) {
      console.error('[TestStandardizedService] Error saving field:', err);
      toast({
        title: "Error saving field",
        description: err.message || 'Unknown error',
        variant: "destructive"
      });
    }
  };
  
  const handleBulkUpdate = async () => {
    setSubmitInProgress(true);
    
    try {
      if (!formService) {
        throw new Error('Form service not initialized');
      }
      
      // Generate demo data for testing
      const demoData = await formService.getDemoData(testTaskId);
      console.log('[TestStandardizedService] Demo data for bulk update:', demoData);
      
      // Perform bulk update
      const success = await formService.bulkUpdate(demoData);
      
      if (success) {
        toast({
          title: "Bulk update successful",
          description: `Updated ${Object.keys(demoData).length} fields with demo data`
        });
        
        // Refresh form data
        const responses = await formService.getResponses();
        setFormData(responses);
        
        // Refresh progress
        const progressData = await formService.getProgress();
        setProgress(progressData);
      } else {
        throw new Error('Bulk update failed');
      }
    } catch (err: any) {
      console.error('[TestStandardizedService] Error performing bulk update:', err);
      toast({
        title: "Bulk update failed",
        description: err.message || 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setSubmitInProgress(false);
    }
  };
  
  const handleReload = () => {
    loadFormService();
  };
  
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Standardized Form Service Test</CardTitle>
          <CardDescription>
            Testing the standardized KY3P form service with string-based field keys
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center space-x-4 mb-4">
            <div>
              <label htmlFor="taskId" className="block text-sm font-medium text-gray-700 mb-1">
                Task ID
              </label>
              <input
                id="taskId"
                type="number"
                value={testTaskId}
                onChange={(e) => setTestTaskId(Number(e.target.value))}
                className="border rounded-md px-3 py-2 w-24"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={handleReload}
              disabled={loading}
              className="mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Reload Form'
              )}
            </Button>
            
            <Button 
              onClick={handleBulkUpdate}
              disabled={loading || submitInProgress || !formService}
              className="mt-4"
            >
              {submitInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Test Bulk Update'
              )}
            </Button>
          </div>
          
          {progress && (
            <div className="mb-4">
              <h3 className="text-lg font-medium">Form Progress</h3>
              <div className="flex items-center mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress.progress * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2">{Math.round(progress.progress * 100)}%</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Status: {progress.status}</p>
            </div>
          )}
          
          <Separator className="my-4" />
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading form data...</span>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-medium mb-2">Form Sections ({sections.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {sections.map((section) => (
                  <div 
                    key={section.id} 
                    className="border rounded-md p-3 bg-gray-50"
                  >
                    <h4 className="font-medium">{section.title || section.id}</h4>
                    <p className="text-sm text-gray-500">
                      {section.fields?.length || 0} fields
                    </p>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-medium mb-2">Form Fields ({fields.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.slice(0, 10).map((field) => (
                  <div 
                    key={field.id} 
                    className="border rounded-md p-3"
                  >
                    <h4 className="font-medium">{field.label || field.displayName}</h4>
                    <p className="text-sm text-gray-500 mb-2">
                      Key: {field.fieldKey || field.id}
                    </p>
                    <p className="text-sm mb-2">
                      Current value: <span className="font-mono">{JSON.stringify(formData[field.fieldKey || field.id?.toString()])}</span>
                    </p>
                    <button
                      onClick={() => handleSaveField(
                        field.fieldKey || field.id?.toString(),
                        `Test value ${Math.floor(Math.random() * 1000)}`
                      )}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Set test value
                    </button>
                  </div>
                ))}
              </div>
              
              {fields.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing 10 of {fields.length} fields
                </p>
              )}
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Using form service: {formService?.constructor?.name || 'Unknown'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}