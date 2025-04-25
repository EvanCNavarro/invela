/**
 * Test component for standardized KY3P update functionality
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, InfoIcon } from 'lucide-react';
import { standardizedBulkUpdate } from '../forms/standardized-ky3p-update';

export default function TestStandardizedKy3pUpdate() {
  const [taskId, setTaskId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const handleTaskIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setTaskId(isNaN(value) ? 0 : value);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    setSuccess(false);
    
    try {
      if (!taskId) {
        throw new Error('Please enter a valid task ID');
      }
      
      console.log(`Running standardized bulk update for task ${taskId}`);
      
      // Call the standardized bulk update function
      const success = await standardizedBulkUpdate(taskId, {});
      
      if (success) {
        setSuccess(true);
        setResult({
          status: 'Success',
          message: 'Standardized bulk update completed successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Standardized bulk update failed');
      }
    } catch (err: any) {
      console.error('Test error:', err);
      setError(err?.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Standardized KY3P Update</h1>
      <p className="text-muted-foreground mb-6">
        This test component verifies the new string-based standardized KY3P update functionality.
      </p>
      
      <div className="bg-card border rounded-lg p-5 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="taskId" className="block text-sm font-medium mb-1">
              Task ID
            </label>
            <input
              id="taskId"
              type="number"
              value={taskId || ''}
              onChange={handleTaskIdChange}
              className="bg-background w-full p-2 border rounded-md"
              placeholder="Enter task ID"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !taskId}
          >
            {loading ? 'Processing...' : 'Run Standardized Update'}
          </Button>
        </form>
      </div>
      
      {loading && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Processing...</p>
          <Progress value={50} className="h-2" />
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-100 text-green-800 border-green-200 mb-6">
          <Check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Standardized bulk update completed successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {result && (
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-lg font-medium mb-3 flex items-center">
            <InfoIcon className="h-4 w-4 mr-2" />
            Result Details
          </h2>
          <pre className="bg-background p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}