/**
 * Test component for standardized KY3P demo auto-fill functionality
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { StandardizedKY3PFormService } from '@/services/standardized-ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('TestKY3PStandardized');

export function TestStandardizedKy3pUpdate() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<Record<string, any> | null>(null);
  
  const taskId = 654; // DevTest35 KY3P task
  
  // Function to test the standardized KY3P form service demo auto-fill
  const testDemoAutoFill = async () => {
    setLoading(true);
    setSuccess(null);
    setErrorMessage(null);
    setResponseData(null);
    
    try {
      // Create a new instance of the standardized service
      const service = new StandardizedKY3PFormService(taskId);
      logger.info('Testing standardized KY3P service demo auto-fill');
      
      // Try to get demo data
      const demoData = await service.getDemoData(taskId);
      setResponseData(demoData);
      
      // Check if we got any data
      if (Object.keys(demoData).length > 0) {
        setSuccess(true);
        logger.info(`Successfully retrieved ${Object.keys(demoData).length} demo fields`);
      } else {
        setSuccess(false);
        setErrorMessage('Demo auto-fill returned no fields');
        logger.error('Demo auto-fill returned no fields');
      }
    } catch (error) {
      setSuccess(false);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      logger.error('Error testing demo auto-fill:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to test standardized bulk update
  const testBulkUpdate = async () => {
    setLoading(true);
    setSuccess(null);
    setErrorMessage(null);
    setResponseData(null);
    
    try {
      // Import the standardized bulk update utility
      const { standardizedBulkUpdate } = await import('../forms/standardized-ky3p-update');
      logger.info('Testing standardized KY3P bulk update');
      
      // Create sample data for testing
      const testData = {
        'test_field': 'Test value from standardized update',
        'test_boolean': true,
        'test_number': 123
      };
      
      // Try the bulk update
      const success = await standardizedBulkUpdate(taskId, testData);
      
      setSuccess(success);
      setResponseData({ message: success ? 'Bulk update successful' : 'Bulk update failed', testData });
      
      if (success) {
        logger.info('Standardized bulk update test succeeded');
      } else {
        logger.error('Standardized bulk update test failed');
      }
    } catch (error) {
      setSuccess(false);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      logger.error('Error testing bulk update:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Test Standardized KY3P Demo Auto-Fill</CardTitle>
        <CardDescription>
          This tests the standardized approach for KY3P demo auto-fill functionality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={testDemoAutoFill} 
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Test Demo Auto-Fill</span>
          </Button>
          
          <Button 
            onClick={testBulkUpdate} 
            disabled={loading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Test Bulk Update</span>
          </Button>
          
          {success !== null && (
            <div className="flex items-center space-x-2">
              {success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={success ? 'text-green-500' : 'text-red-500'}>
                {success ? 'Success' : 'Failed'}
              </span>
            </div>
          )}
        </div>
        
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {responseData && Object.keys(responseData).length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Response Data:</h3>
            <div className="bg-muted p-4 rounded overflow-auto max-h-60">
              <pre className="text-xs">
                {JSON.stringify(responseData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}