import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface UnifiedDemoAutoFillProps {
  taskId: number;
  formType: 'ky3p' | 'open_banking' | 'company_kyb' | string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Unified Demo Auto-Fill Button Component
 * 
 * This component provides a button that can be used to trigger the demo auto-fill
 * functionality for any form type using a standardized approach. It supports all
 * form types (KYB, KY3P, Open Banking) and uses the transactional demo service
 * to ensure data and progress are updated atomically.
 * 
 * @param taskId The task ID
 * @param formType The form type (ky3p, open_banking, company_kyb, etc)
 * @param onSuccess Optional callback on successful auto-fill
 * @param onError Optional callback on error
 */
export function UnifiedDemoAutoFill({ 
  taskId, 
  formType,
  onSuccess, 
  onError 
}: UnifiedDemoAutoFillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDemoAutoFill = async () => {
    setIsLoading(true);
    const logger = console;
    logger.info(`Starting demo auto-fill for ${formType} task ${taskId}`);
    
    try {
      // Show a loading toast to indicate we're starting the process
      toast({
        title: 'Demo Auto-Fill',
        description: 'Loading demo data...',
        variant: 'default'
      });
      
      // Normalize form type to ensure compatibility
      const normalizedFormType = normalizeFormType(formType);
      logger.info(`Using normalized form type: ${normalizedFormType}`);
      
      // 1. Use the unified transactional endpoint for any form type
      const endpoint = `/api/forms/demo-autofill/${taskId}`;
      logger.info(`Using unified transactional endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          formType: normalizedFormType
        })
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
      
      // 2. Invalidate all queries to ensure the UI is updated correctly
      logger.info('Invalidating queries to refresh UI data...');
      
      // Invalidate form responses based on form type
      switch (normalizedFormType) {
        case 'ky3p':
          await queryClient.invalidateQueries({
            queryKey: [`/api/tasks/${taskId}/ky3p-responses`]
          });
          await queryClient.invalidateQueries({
            queryKey: [`/api/ky3p/progress/${taskId}`]
          });
          break;
        case 'open_banking':
          await queryClient.invalidateQueries({
            queryKey: [`/api/tasks/${taskId}/open-banking-responses`]
          });
          await queryClient.invalidateQueries({
            queryKey: [`/api/open-banking/progress/${taskId}`]
          });
          break;
        case 'company_kyb':
          await queryClient.invalidateQueries({
            queryKey: [`/api/tasks/${taskId}/kyb-responses`]
          });
          await queryClient.invalidateQueries({
            queryKey: [`/api/kyb/progress/${taskId}`]
          });
          break;
      }
      
      // Always invalidate task data and task center
      await queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}`]
      });
      await queryClient.invalidateQueries({
        queryKey: [`/api/task-center`] // Also refresh the task center
      });
      
      // 3. Force a refresh of form data
      logger.info('Forcing refresh of form data...');
      try {
        // Determine the correct form data endpoint
        let formDataEndpoint;
        switch (normalizedFormType) {
          case 'ky3p':
            formDataEndpoint = `/api/tasks/${taskId}/ky3p-responses`;
            break;
          case 'open_banking':
            formDataEndpoint = `/api/tasks/${taskId}/open-banking-responses`;
            break;
          case 'company_kyb':
            formDataEndpoint = `/api/tasks/${taskId}/kyb-responses`;
            break;
          default:
            formDataEndpoint = `/api/tasks/${taskId}/responses`;
        }
        
        const formDataResponse = await fetch(formDataEndpoint, {
          credentials: 'include'
        });
        
        if (formDataResponse.ok) {
          logger.info(`Successfully fetched fresh form data for ${normalizedFormType} after demo auto-fill`);
        }
      } catch (refreshError) {
        logger.warn('Non-critical error refreshing form data:', refreshError);
      }
      
      // 4. Show success message
      toast({
        title: 'Demo Auto-Fill Complete',
        description: `Successfully populated ${count} fields with demo data. Progress updated to ${result.progress}%.`,
        variant: 'default'
      });
      
      // 5. Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error) {
      logger.error(`Error during ${formType} demo auto-fill:`, error);
      
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

  /**
   * Normalize form type to ensure compatibility with backend
   */
  function normalizeFormType(type: string): string {
    // Convert to lowercase for case-insensitive comparison
    const lowerType = type.toLowerCase();
    
    // Handle special cases and aliases
    if (lowerType === 'security' || lowerType === 'security_assessment' || lowerType === 'sp_ky3p_assessment') {
      return 'ky3p';
    }
    
    if (lowerType === 'kyb') {
      return 'company_kyb';
    }
    
    if (lowerType === 'ob' || lowerType === 'openbanking') {
      return 'open_banking';
    }
    
    // Default: return the original type
    return lowerType;
  }

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

export default UnifiedDemoAutoFill;
