/**
 * Test component for standardized KY3P update functionality
 * 
 * This component provides a UI for testing the standardized KY3P
 * update functionality with string-based field keys.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { standardizedBulkUpdate } from '@/components/forms/standardized-ky3p-update';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import getLogger from '@/utils/logger';

const logger = getLogger('TestStandardizedKy3pUpdate');

export function TestStandardizedKy3pUpdate() {
  const [taskId, setTaskId] = useState<number>(654); // Default to DevTest35 KY3P task
  const [loading, setLoading] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<string>('');
  const [fieldData, setFieldData] = useState<string>('{\n  "field1": "Test value 1",\n  "field2": "Test value 2"\n}');
  
  const handleBulkUpdate = async () => {
    try {
      setLoading(true);
      setUpdateResult('');
      
      // Parse the field data JSON
      let formData: Record<string, any>;
      try {
        formData = JSON.parse(fieldData);
      } catch (error) {
        toast({
          title: 'Invalid JSON',
          description: 'Please provide valid JSON for the field data',
          variant: 'destructive',
        });
        return;
      }
      
      // Perform the bulk update
      logger.info(`Performing standardized bulk update for task ${taskId} with fields:`, formData);
      
      const success = await standardizedBulkUpdate(taskId, formData);
      
      setUpdateResult(
        success
          ? `✅ Successfully updated ${Object.keys(formData).length} fields for task ${taskId}`
          : `❌ Failed to update fields for task ${taskId}`
      );
      
      toast({
        title: success ? 'Update Successful' : 'Update Failed',
        description: success
          ? `Successfully updated ${Object.keys(formData).length} fields`
          : 'Failed to update fields. See console for details.',
        variant: success ? 'default' : 'destructive',
      });
      
    } catch (error) {
      logger.error('Error in bulk update:', error);
      
      setUpdateResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      toast({
        title: 'Update Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8 max-w-3xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Standardized KY3P Update</CardTitle>
          <CardDescription>
            Test the standardized KY3P update functionality with string-based field keys.
            This component tests the standardizedBulkUpdate function directly with the provided task ID
            and field data.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskId">Task ID</Label>
              <Input
                id="taskId"
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(parseInt(e.target.value))}
                placeholder="Enter task ID"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fieldData">Field Data (JSON)</Label>
              <Textarea
                id="fieldData"
                value={fieldData}
                onChange={(e) => setFieldData(e.target.value)}
                placeholder='{"field1": "value1", "field2": "value2"}'
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Provide a JSON object with field keys and values to update.
                For example: {'{\"field1\": \"value1\", \"field2\": \"value2\"}'}
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            onClick={handleBulkUpdate}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Updating...' : 'Update Fields'}
          </Button>
          
          {updateResult && (
            <div className="ml-4 text-sm">
              {updateResult}
            </div>
          )}
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            How the standardized KY3P update works
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm space-y-4">
            <div>
              <h3 className="font-medium mb-1">Standardized Approach</h3>
              <p className="text-muted-foreground">
                The standardized KY3P update uses string-based field keys (e.g., "field1", "field2")
                instead of numeric field IDs (e.g., 123, 456) for better compatibility with other form types
                like KYB and Open Banking which already use string-based keys.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Fallback Logic</h3>
              <p className="text-muted-foreground">
                If the batch update endpoint fails, the standardized update will automatically
                fall back to individual field updates for better reliability. This ensures updates
                work even if some endpoints are unavailable.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Usage Example</h3>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                {`// Import the function
import { standardizedBulkUpdate } from '@/components/forms/standardized-ky3p-update';

// Use it in your component
const updateFields = async () => {
  const success = await standardizedBulkUpdate(654, {
    'field1': 'value1',
    'field2': 'value2'
  });
  
  if (success) {
    console.log('Update successful');
  } else {
    console.error('Update failed');
  }
};`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}