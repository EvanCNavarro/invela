import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

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
 */
export function KY3PDemoAutoFill({ 
  taskId, 
  onSuccess, 
  onError 
}: KY3PDemoAutoFillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDemoAutoFill = async () => {
    setIsLoading(true);
    
    try {
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
        throw new Error(`Demo auto-fill failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Demo auto-fill result:', result);
      
      toast({
        title: 'Demo Auto-Fill Completed',
        description: `Successfully populated ${result.fieldCount || 0} fields with demo data`,
        variant: 'default'
      });
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error during demo auto-fill:', error);
      
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