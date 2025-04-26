import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import getLogger from '@/utils/logger';
import { fixedKy3pBulkUpdate } from '../forms/standardized-ky3p-update';

const logger = getLogger('TestStandardized');

export default function TestStandardizedKy3pUpdate() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const handleTest = async () => {
    setLoading(true);
    setResult('Testing standardized KY3P update...');
    
    try {
      // Get the task ID from the URL
      const url = new URL(window.location.href);
      const path = url.pathname;
      const matches = path.match(/tasks\/(\d+)/);
      const taskId = matches ? parseInt(matches[1], 10) : null;
      
      if (!taskId) {
        setResult('Error: Could not extract task ID from URL');
        setLoading(false);
        return;
      }
      
      // Create some test data
      const testData = {
        // Test with a mix of valid field keys
        'ky3p_company_name': 'Test Company',
        'ky3p_contact_email': 'test@example.com',
        'ky3p_test_field': 'This is a test field'
      };
      
      logger.info(`Testing standardized update with task ID ${taskId}...`);
      
      // Use our fixed implementation
      const success = await fixedKy3pBulkUpdate(taskId, testData);
      
      if (success) {
        setResult(`Success! The standardized KY3P update worked for task ${taskId}`);
      } else {
        setResult(`Failed to update task ${taskId} with standardized KY3P update`);
      }
    } catch (error) {
      logger.error('Error testing standardized KY3P update:', error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test Standardized KY3P Update</CardTitle>
        <CardDescription>
          This tests our fixed KY3P update functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-md">
            <pre className="text-sm whitespace-pre-wrap">{result || 'Click the button to test'}</pre>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Standardized Update'}
        </Button>
      </CardFooter>
    </Card>
  );
}