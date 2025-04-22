/**
 * Demo Auto-fill Button Component for KY3P forms
 * 
 * This component adds a button to the form to auto-fill it with demo data.
 * It uses the bulkUpdateResponses method of the KY3PFormService to 
 * fetch demo data from the server and populate the form.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { KY3PFormService } from '@/services/ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('DemoAutofill');

interface DemoAutofillButtonProps {
  taskId: number;
  taskType: string;
  onSuccess?: () => void;
}

export function DemoAutofillButton({ taskId, taskType, onSuccess }: DemoAutofillButtonProps) {
  const [loading, setLoading] = useState(false);

  // Only show the button for KY3P tasks
  if (taskType !== 'ky3p') {
    return null;
  }

  const handleClick = async () => {
    if (!taskId) {
      toast({
        variant: "destructive",
        title: "Auto-fill Failed",
        description: "No task ID available for demo auto-fill",
      });
      return;
    }

    setLoading(true);
    try {
      logger.info(`Starting demo auto-fill for task ${taskId}`);
      
      toast({
        title: "Auto-fill Started",
        description: "Fetching and applying demo data to form...",
        duration: 5000,
      });

      // Initialize the KY3P form service
      const formService = new KY3PFormService(undefined, taskId);

      // Initialize form service in case it's needed
      try {
        await formService.initialize();
      } catch (initError) {
        // Continue anyway - initialization isn't critical for bulkUpdateResponses
        logger.warn('Form service initialization failed but continuing with auto-fill:', initError);
      }

      // Use the bulkUpdateResponses method with empty form data and useDemoData=true
      // This will trigger fetching demo data from the API
      const success = await formService.bulkUpdateResponses(taskId, {}, true);
      
      if (success) {
        logger.info(`Demo auto-fill successful for task ${taskId}`);
        toast({
          title: "Auto-fill Complete",
          description: "Successfully populated the form with demo data. You may need to refresh the form to see all changes.",
        });
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        logger.error(`Demo auto-fill failed for task ${taskId}`);
        toast({
          variant: "destructive",
          title: "Auto-fill Failed",
          description: "Failed to apply demo data. Please try again later.",
        });
      }
    } catch (error) {
      logger.error('Error during demo auto-fill:', error);
      toast({
        variant: "destructive",
        title: "Auto-fill Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      disabled={loading}
      className="ml-2"
    >
      {loading ? "Loading..." : "Demo Auto-fill"}
    </Button>
  );
}