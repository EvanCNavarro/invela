import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { KybFormService } from '@/services/kybService';

export default function FormDbTestPage() {
  const [fieldKey, setFieldKey] = useState('companyName');
  const [fieldValue, setFieldValue] = useState('');
  const [taskId, setTaskId] = useState('348');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dbValues, setDbValues] = useState<any>(null);
  const [isLoadingDbValues, setIsLoadingDbValues] = useState(false);

  const updateField = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      console.log(`Test: Updating field ${fieldKey} with value "${fieldValue}" for task ${taskId}`);
      
      // Create a temporary instance of the KYB service
      const service = new KybFormService();
      await service.initialize({});
      
      // Update the field
      service.updateFormData(fieldKey, fieldValue);
      
      // Save the progress
      const saveResult = await service.saveProgress({
        taskId: parseInt(taskId, 10), 
        includeMetadata: false
      });
      
      console.log(`Test: Save result:`, saveResult);
      setResult({
        success: !!saveResult,
        timestamp: new Date().toISOString(),
        details: saveResult
      });
    } catch (error) {
      console.error('Error updating field:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatabaseValues = async () => {
    try {
      setIsLoadingDbValues(true);
      setDbValues(null);
      
      // Create a temporary instance of the KYB service
      const service = new KybFormService();
      await service.initialize({});
      
      // Load the saved progress
      console.log(`Test: Loading data for task ${taskId}`);
      const progress = await service.loadProgress(parseInt(taskId, 10));
      
      console.log(`Test: Loaded data:`, progress);
      
      // Extract the actual form data
      const formData = service.getFormData();
      
      const fieldValue = fieldKey in formData ? formData[fieldKey] : 'NOT FOUND';
      
      setDbValues({
        timestamp: new Date().toISOString(),
        progress,
        specificField: {
          key: fieldKey,
          value: fieldValue
        }
      });
    } catch (error) {
      console.error('Error fetching database values:', error);
      setDbValues({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoadingDbValues(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Form Database Test</CardTitle>
          <CardDescription>
            Test if database updates are working correctly by updating a single field
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Task ID</label>
              <Input
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Task ID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Field Key</label>
              <Input
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="Field key"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Field Value</label>
            <Input
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              placeholder="New value to save"
            />
          </div>
          
          <div className="flex space-x-4">
            <Button
              onClick={updateField}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Update Field in Database'}
            </Button>
            
            <Button
              onClick={fetchDatabaseValues}
              disabled={isLoadingDbValues}
              variant="outline"
              className="w-full"
            >
              {isLoadingDbValues ? <LoadingSpinner size="sm" /> : 'Fetch Current Value'}
            </Button>
          </div>
          
          {result && (
            <div className="mt-4 p-4 rounded border bg-muted">
              <h3 className="font-medium mb-2">Save Result:</h3>
              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          {dbValues && (
            <div className="mt-4 p-4 rounded border bg-muted">
              <h3 className="font-medium mb-2">Database Value:</h3>
              <div className="mb-2">
                <strong>Field {fieldKey}:</strong> {dbValues.specificField?.value ?? 'N/A'}
              </div>
              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(dbValues, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}