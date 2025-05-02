import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
// Import needed for non-KY3P form types
import { handleDemoAutoFill } from './handleDemoAutoFill';

interface UnifiedDemoAutoFillProps {
  taskId?: number;
  taskType: string;
  form: any;
  resetForm: (data: Record<string, any>) => void;
  updateField: (fieldKey: string, value: any, isSaving?: boolean) => void;
  refreshStatus: () => void;
  saveProgress: () => Promise<boolean>;
  onProgress?: (progress: number) => void;
  formService: any;
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Unified Demo Auto-Fill Button Component
 * 
 * This component provides a consistent button for demo auto-fill functionality
 * but internally handles the different requirements for each form type.
 * 
 * For KY3P forms, it uses a specialized API endpoint due to the unique data structure
 * For other form types, it uses the generic handler
 */
export function UnifiedDemoAutoFill(props: UnifiedDemoAutoFillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { taskId, taskType } = props;
  
  // Determine if this is a KY3P form
  const isKY3PForm = taskType === 'ky3p' || taskType === 'security_assessment' || taskType === 'security';
  
  const handleClick = async () => {
    if (!taskId) {
      toast({
        title: 'Demo Auto-Fill Error',
        description: 'Cannot auto-fill without a task ID',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Show loading toast
      toast({
        title: 'Demo Auto-Fill',
        description: 'Loading demo data...',
        variant: 'default'
      });
      
      // KY3P forms require a specialized approach due to their unique data structure
      if (isKY3PForm) {
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
        
        // Parse the response JSON
        const result = await response.json();
        console.info('Demo auto-fill successful result:', result);
        
        // Accept both fieldCount (new) or fieldsPopulated (legacy) properties for compatibility
        const count = result.fieldCount || result.fieldsPopulated || 0;
        
        // Invalidate queries to refresh data
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
        
        // Force a refresh of the form data
        props.refreshStatus();
        props.setForceRerender(prev => !prev);
        
        // Show success message
        toast({
          title: 'Demo Auto-Fill Complete',
          description: `Successfully populated ${count} fields with demo data`,
          variant: 'default'
        });
      } 
      // For all other form types, use the generic handler
      else {
        // Create promise-wrapped versions of the callbacks to match expected types for handleDemoAutoFill
        const adaptedProps = {
          ...props,
          updateField: async (fieldKey: string, value: any): Promise<void> => {
            props.updateField(fieldKey, value, true);
            return Promise.resolve();
          },
          refreshStatus: async (): Promise<void> => {
            props.refreshStatus();
            return Promise.resolve();
          },
          saveProgress: async (): Promise<void> => {
            await props.saveProgress();
            return Promise.resolve();
          }
        };
        
        // Call generic handler with adapted types
        await handleDemoAutoFill(adaptedProps);
      }
    } catch (error) {
      console.error('Error during demo auto-fill:', error);
      
      toast({
        title: 'Demo Auto-Fill Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      disabled={isLoading}
      variant="outline"
      className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Filling Demo Data...
        </>
      ) : (
        <>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Demo Auto-Fill
        </>
      )}
    </Button>
  );
}

export default UnifiedDemoAutoFill;