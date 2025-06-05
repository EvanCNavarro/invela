import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useQueryClient } from '@tanstack/react-query';

interface KY3PDemoAutoFillProps {
  taskId: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * KY3P Demo Auto-Fill Button Component
 * 
 * This component provides a button that can be used to trigger the demo auto-fill
 * functionality for KY3P forms using the standardized approach.
 * 
 * This component communicates with the universal demo auto-fill service to populate
 * form fields with realistic demo data. It works in conjunction with the server-side
 * universal demo auto-fill service which uses the same standardized approach across
 * all form types (KYB, KY3P, and Open Banking).
 * 
 * IMPORTANT: This component will fetch the updated data immediately after applying
 * demo data to ensure the form displays the changes properly.
 */
export function KY3PDemoAutoFill({ 
  taskId, 
  onSuccess, 
  onError 
}: KY3PDemoAutoFillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDemoAutoFill = async () => {
    setIsLoading(true);
    const logger = console;
    logger.info(`Starting demo auto-fill for KY3P task ${taskId}`);
    
    try {
      // Show a loading toast to indicate we're starting the process
      toast({
        title: 'Demo Auto-Fill',
        description: 'Loading demo data...',
        variant: 'default'
      });
      
      // 1. Get demo data from the KY3P endpoint - this is the preferred approach for KY3P
      logger.info('Fetching demo data from the dedicated KY3P endpoint');
      const response = await fetch(`/api/ky3p/demo-autofill/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Demo auto-fill failed with status ${response.status}:`, errorText);
        throw new Error(`Demo auto-fill failed: ${response.status} - ${errorText}`);
      }
      
      // Parse the response JSON
      const result = await response.json();
      logger.info('Demo auto-fill successful result:', result);
      
      // Accept both fieldCount (new) or fieldsPopulated (legacy) properties for compatibility
      const count = result.fieldCount || result.fieldsPopulated || 0;
      
      // 2. Update the task progress explicitly to ensure task center shows the correct state
      logger.info('Updating task progress in the database...');
      try {
        const progressResponse = await fetch(`/api/ky3p/update-progress/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            progress: 100, // Mark as 100% complete
            status: 'completed' // Set status to completed
          })
        });
        
        if (progressResponse.ok) {
          logger.info('Successfully updated task progress to completed');
        }
      } catch (progressError) {
        logger.warn('Error updating task progress:', progressError);
      }
      
      // 3. Invalidate all queries to ensure the UI is updated correctly
      logger.info('Invalidating queries to refresh UI data...');
      await queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/ky3p-responses`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/ky3p/progress/${taskId}`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/task-center`] // Also refresh the task center
      });
      
      // 3. Force a refresh of form data
      logger.info('Forcing refresh of form data...');
      try {
        const formDataResponse = await fetch(`/api/tasks/${taskId}/ky3p-responses`, {
          credentials: 'include'
        });
        
        if (formDataResponse.ok) {
          logger.info('Successfully fetched fresh form data after demo auto-fill');
        }
      } catch (refreshError) {
        logger.warn('Non-critical error refreshing form data:', refreshError);
      }
      
      // 4. Show success message
      toast({
        title: 'Demo Auto-Fill Complete',
        description: `Successfully populated ${count} fields with demo data`,
        variant: 'default'
      });
      
      // 5. Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error) {
      logger.error('Error during KY3P demo auto-fill:', error);
      
      toast({
        title: 'Demo Auto-Fill Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
      
      // Call the onError callback if provided
      if (onError) onError(error);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleDemoAutoFill} 
      disabled={isLoading}
      variant="secondary"
      className="w-full md:w-auto"
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="xs" className="mr-2" />
          Filling Demo Data...
        </>
      ) : (
        'Fill with Demo Data'
      )}
    </Button>
  );
}

export default KY3PDemoAutoFill;