import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('TestDemoAutoFill');

/**
 * Test page for demo auto-fill functionality
 * This page tests the demo auto-fill endpoint for different form types
 */
export default function TestDemoAutoFill() {
  const [taskId, setTaskId] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('kyb');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleTestAutoFill = async () => {
    if (!taskId || !taskId.trim()) {
      toast({
        title: 'Missing Task ID',
        description: 'Please enter a valid task ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      logger.info(`Testing demo auto-fill for task ${taskId} with type ${taskType}`);
      
      // Choose endpoint based on form type
      let endpoint = `/api/demo-autofill/${taskId}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formType: taskType }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        logger.info(`Auto-fill successful for ${taskType}`, data);
        toast({
          title: 'Demo Auto-Fill Complete',
          description: `Successfully filled ${data.fieldCount || 'all'} form fields with sample data.`,
          variant: 'success',
        });
      } else {
        logger.error('Demo auto-fill failed:', data.message);
        toast({
          title: 'Demo Auto-Fill Failed',
          description: data.message || 'Failed to auto-fill the form. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error during demo auto-fill test:', error);
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
      
      toast({
        title: 'Auto-Fill Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Demo Auto-Fill</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Configure Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Task ID</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Enter Task ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Form Type</label>
              <select
                className="w-full p-2 border rounded"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="kyb">KYB</option>
                <option value="ky3p">KY3P</option>
                <option value="open_banking">Open Banking</option>
              </select>
            </div>
            
            <Button 
              onClick={handleTestAutoFill} 
              disabled={loading}
              className="mt-2"
            >
              {loading ? 'Testing...' : 'Test Demo Auto-Fill'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}