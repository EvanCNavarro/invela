import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
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
    console.log(`Starting demo auto-fill for KY3P task ${taskId}`);
    
    try {
      // Use the standard KY3P endpoint which internally redirects to the universal service
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
        console.error(`Demo auto-fill failed with status ${response.status}:`, errorText);
        throw new Error(`Demo auto-fill failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Demo auto-fill successful result:', result);
      
      // Accept both fieldCount (new) or fieldsPopulated (legacy) properties for compatibility
      const count = result.fieldCount || result.fieldsPopulated || 0;
      
      // IMPORTANT: Invalidate all relevant KY3P queries to force fresh data fetching
      // This is critical for ensuring the form displays the updated field values
      await queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/ky3p-responses`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/ky3p/progress/${taskId}`]
      });
      
      // Additional invalidation for task progress
      await queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}`]
      });
      
      // Fetch the full form data directly to ensure we have the latest values
      // This helps handle edge cases where cache invalidation might not trigger immediately
      try {
        const formDataResponse = await fetch(`/api/tasks/${taskId}/ky3p-responses`, {
          credentials: 'include'
        });
        
        if (formDataResponse.ok) {
          console.log('Successfully fetched fresh form data after demo auto-fill');
        }
      } catch (refreshError) {
        console.warn('Non-critical error refreshing form data:', refreshError);
      }
      
      toast({
        title: 'Demo Auto-Fill Completed',
        description: `Successfully populated ${count} fields with demo data`,
        variant: 'default'
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error during KY3P demo auto-fill:', error);
      
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
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Filling Demo Data...
        </>
      ) : (
        'Fill with Demo Data'
      )}
    </Button>
  );
}

export default KY3PDemoAutoFill;