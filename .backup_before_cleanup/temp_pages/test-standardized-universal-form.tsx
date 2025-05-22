/**
 * Test page for the StandardizedUniversalForm component
 * 
 * This page demonstrates the standardized approach to forms
 * by testing the StandardizedUniversalForm component with
 * different form service implementations.
 */

import React, { useState } from 'react';
import { StandardizedUniversalForm } from '@/components/forms/StandardizedUniversalForm';
import { StandardizedKY3PFormService } from '@/services/standardized-ky3p-form-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getFormServiceForTaskType } from '@/services/standardized-service-registry';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import getLogger from '@/utils/logger';

const logger = getLogger('TestStandardizedForm');

export default function TestStandardizedUniversalFormPage() {
  // Default to KY3P form for DevTest35
  const [taskId, setTaskId] = useState<number>(654);
  const [taskType, setTaskType] = useState<string>('ky3p');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Get the appropriate form service for the current task type
  const formService = getFormServiceForTaskType(taskType, taskId);
  
  // For direct comparison, create a basic KY3P form service
  const ky3pService = new StandardizedKY3PFormService(taskId);
  
  // Handle form submission
  const handleSubmit = async (data: Record<string, any>) => {
    try {
      setLoading(true);
      
      logger.info(`Submitting form for task ${taskId} with data:`, data);
      
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Form Submitted',
        description: `Successfully submitted form for task ${taskId} (${taskType})`,
      });
      
      logger.info('Form submission successful');
    } catch (error) {
      logger.error('Error submitting form:', error);
      
      toast({
        title: 'Error Submitting Form',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    switch (value) {
      case 'ky3p':
        setTaskType('ky3p');
        setTaskId(654); // DevTest35 KY3P task
        break;
      case 'kyb':
        setTaskType('kyb');
        setTaskId(620); // Example KYB task
        break;
      case 'open-banking':
        setTaskType('open_banking');
        setTaskId(628); // Example Open Banking task
        break;
      default:
        setTaskType('ky3p');
        setTaskId(654);
    }
  };
  
  return (
    <div className="container py-8 max-w-5xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Standardized Universal Form Demo</CardTitle>
          <CardDescription>
            This demo shows the standardized approach to forms using the StandardizedUniversalForm component,
            which works across different form types (KYB, KY3P, and Open Banking).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ky3p" onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="ky3p">KY3P Form</TabsTrigger>
              <TabsTrigger value="kyb">KYB Form</TabsTrigger>
              <TabsTrigger value="open-banking">Open Banking Form</TabsTrigger>
            </TabsList>
            
            <TabsContent value="ky3p">
              <Card>
                <CardHeader>
                  <CardTitle>S&P KY3P Security Assessment</CardTitle>
                  <CardDescription>
                    Task ID: {taskId} | Form Type: {taskType}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StandardizedUniversalForm
                    taskId={taskId}
                    taskType={taskType}
                    formService={formService}
                    onSubmit={handleSubmit}
                    submitButtonText="Submit KY3P Assessment"
                    showDemoAutoFill={true}
                    autoSave={true}
                    disabled={loading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="kyb">
              <Card>
                <CardHeader>
                  <CardTitle>Know Your Business (KYB)</CardTitle>
                  <CardDescription>
                    Task ID: {taskId} | Form Type: {taskType}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {formService ? (
                    <StandardizedUniversalForm
                      taskId={taskId}
                      taskType={taskType}
                      formService={formService}
                      onSubmit={handleSubmit}
                      submitButtonText="Submit KYB Assessment"
                      showDemoAutoFill={true}
                      autoSave={true}
                      disabled={loading}
                    />
                  ) : (
                    <div className="py-8 text-center">
                      <h3 className="text-lg font-medium mb-4">KYB Form Service Not Available</h3>
                      <p className="text-muted-foreground mb-4">
                        The standardized KYB form service is not registered yet.
                      </p>
                      <Button disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading KYB Service
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="open-banking">
              <Card>
                <CardHeader>
                  <CardTitle>Open Banking Assessment</CardTitle>
                  <CardDescription>
                    Task ID: {taskId} | Form Type: {taskType}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {formService ? (
                    <StandardizedUniversalForm
                      taskId={taskId}
                      taskType={taskType}
                      formService={formService}
                      onSubmit={handleSubmit}
                      submitButtonText="Submit Open Banking Assessment"
                      showDemoAutoFill={true}
                      autoSave={true}
                      disabled={loading}
                    />
                  ) : (
                    <div className="py-8 text-center">
                      <h3 className="text-lg font-medium mb-4">Open Banking Form Service Not Available</h3>
                      <p className="text-muted-foreground mb-4">
                        The standardized Open Banking form service is not registered yet.
                      </p>
                      <Button disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading Open Banking Service
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Original KY3P Service</CardTitle>
            <CardDescription>
              Direct comparison with the original service implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm overflow-auto max-h-96 bg-muted p-4 rounded">
              <h3 className="font-medium mb-2">Service Fields:</h3>
              <pre>{JSON.stringify(ky3pService.getFields().slice(0, 3), null, 2)}</pre>
              
              <h3 className="font-medium mt-4 mb-2">Service Sections:</h3>
              <pre>{JSON.stringify(ky3pService.getSections().slice(0, 1), null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Standardized Form Service</CardTitle>
            <CardDescription>
              Using the standardized service approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm overflow-auto max-h-96 bg-muted p-4 rounded">
              <h3 className="font-medium mb-2">Task Type:</h3>
              <pre>{JSON.stringify(taskType, null, 2)}</pre>
              
              <h3 className="font-medium mt-4 mb-2">Service Available:</h3>
              <pre>{JSON.stringify(!!formService, null, 2)}</pre>
              
              {formService && (
                <>
                  <h3 className="font-medium mt-4 mb-2">Service Methods:</h3>
                  <pre>{JSON.stringify(Object.keys(formService), null, 2)}</pre>
                  
                  <h3 className="font-medium mt-4 mb-2">Has getDemoData:</h3>
                  <pre>{JSON.stringify('getDemoData' in formService, null, 2)}</pre>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}