/**
 * Test component for KY3P Batch Update functionality
 * 
 * This component provides a simple UI to test the KY3P batch update helper
 * without requiring a full form integration.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('TestKy3pBatchUpdate');

export function TestKy3pBatchUpdate() {
  const [taskId, setTaskId] = useState<string>('638'); // Default to task 638 which should be a KY3P task
  const [formData, setFormData] = useState<string>(`{
  "organization_name": "Demo Organization",
  "organization_type": "Corporation",
  "security_controls_overview": "Our security controls include firewalls, IDS/IPS, access controls, and encryption.",
  "incident_response_plan": "Yes",
  "incident_response_details": "We have a documented IR plan with regular testing.",
  "security_certifications": "ISO 27001, SOC 2"
}`);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const testDirectBatchUpdate = useCallback(async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      const parsedTaskId = parseInt(taskId);
      if (isNaN(parsedTaskId)) {
        throw new Error('Invalid task ID');
      }
      
      const parsedFormData = JSON.parse(formData);
      
      logger.info('Testing direct batch update', { taskId: parsedTaskId });
      
      // Import the batch update helper
      const { batchUpdateKy3pResponses } = await import('@/components/forms/ky3p-batch-update');
      
      // Call the helper with our test data
      const success = await batchUpdateKy3pResponses(parsedTaskId, parsedFormData);
      
      if (success) {
        setResult(`✅ Batch update successful!\nResponses updated for task ${parsedTaskId}`);
        toast({
          title: 'Success',
          description: 'Batch update completed successfully',
          variant: 'default',
        });
      } else {
        setResult(`❌ Batch update failed!`);
        toast({
          title: 'Error',
          description: 'Batch update failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`❌ Error: ${errorMessage}`);
      logger.error('Error in batch update test', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [taskId, formData]);
  
  const testConversionOnly = useCallback(async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      const parsedTaskId = parseInt(taskId);
      if (isNaN(parsedTaskId)) {
        throw new Error('Invalid task ID');
      }
      
      const parsedFormData = JSON.parse(formData);
      
      logger.info('Testing format conversion', { taskId: parsedTaskId });
      
      // Call the test endpoint to check format conversion
      const response = await fetch(`/api/test/ky3p-batch-update/${parsedTaskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          responses: parsedFormData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Test failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      setResult(JSON.stringify(result, null, 2));
      toast({
        title: 'Success',
        description: 'Format conversion test successful',
        variant: 'default',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`❌ Error: ${errorMessage}`);
      logger.error('Error in conversion test', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [taskId, formData]);
  
  const fetchFormData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const parsedTaskId = parseInt(taskId);
      if (isNaN(parsedTaskId)) {
        throw new Error('Invalid task ID');
      }
      
      logger.info('Fetching form data', { taskId: parsedTaskId });
      
      // Fetch the current form data from the server
      const response = await fetch(`/api/ky3p/progress/${parsedTaskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch form data: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.formData) {
        setFormData(JSON.stringify(result.formData, null, 2));
        toast({
          title: 'Success',
          description: 'Form data fetched successfully',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Info',
          description: 'No form data found for this task',
          variant: 'default',
        });
      }
      
      setResult(JSON.stringify({
        progress: result.progress,
        fieldCount: Object.keys(result.formData || {}).length,
        status: result.status,
        formDataSample: result.formData ? Object.keys(result.formData).slice(0, 5) : []
      }, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>KY3P Batch Update Tester</CardTitle>
        <CardDescription>
          Test the KY3P batch update helper component with different form data formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="taskId">Task ID</Label>
              <Input
                id="taskId"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Enter KY3P task ID"
              />
            </div>
            <Button onClick={fetchFormData} disabled={isLoading}>
              Fetch Current Data
            </Button>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="formData">Form Data (JSON format)</Label>
            <Textarea
              id="formData"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              placeholder="Enter form data in JSON format"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          <Tabs defaultValue="result" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="result">Result</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
            <TabsContent value="result" className="p-4 border rounded-md min-h-[200px]">
              <pre className="whitespace-pre-wrap font-mono text-sm">{result || "Results will appear here..."}</pre>
            </TabsContent>
            <TabsContent value="help" className="p-4 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">How to use this tester</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Enter a valid KY3P task ID (default: 638)</li>
                <li>Enter form data in JSON format (keys and values)</li>
                <li>Click "Test Format Conversion" to see how the data is converted</li>
                <li>Click "Run Batch Update" to save the data to the task</li>
                <li>Click "Fetch Current Data" to verify saved data</li>
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">
                This tool helps debug the KY3P form service compatibility with the KYB form format.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={testConversionOnly} 
          disabled={isLoading}
        >
          Test Format Conversion
        </Button>
        <Button 
          onClick={testDirectBatchUpdate}
          disabled={isLoading}
        >
          Run Batch Update
        </Button>
      </CardFooter>
    </Card>
  );
}