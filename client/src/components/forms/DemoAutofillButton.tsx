import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { KY3PFormService } from '@/services/ky3p-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('DemoAutofillButton', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

interface DemoAutofillButtonProps {
  taskId: number;
  taskType: string;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  className?: string;
}

/**
 * DemoAutofillButton component for the KY3P form
 * 
 * This button triggers the demo data autofill functionality,
 * populating all form fields with predefined demo values.
 */
export const DemoAutofillButton: React.FC<DemoAutofillButtonProps> = ({
  taskId,
  taskType,
  onSuccess,
  variant = "outline",
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoAutofill = async () => {
    if (!taskId) {
      toast({
        title: "Error",
        description: "Task ID is missing",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new instance of KY3PFormService
    const formService = new KY3PFormService(undefined, taskId);

    setIsLoading(true);
    
    try {
      logger.info('Starting demo autofill for task:', taskId);
      
      // Use the new bulk update method from KY3PFormService
      const result = await formService.bulkUpdateResponses(taskId);
      
      if (result.success) {
        logger.info('Demo autofill successful:', result);
        toast({
          title: "Demo Data Loaded",
          description: `${result.updatedCount} fields have been populated with demo data.`,
          variant: "default",
        });
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        logger.error('Demo autofill failed:', result.error);
        toast({
          title: "Auto-fill Failed",
          description: result.error || "Failed to load demo data. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error during demo autofill:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading demo data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleDemoAutofill}
      disabled={isLoading}
      className={`flex items-center justify-center ${className}`}
    >
      <Wand2 className="mr-2 h-4 w-4" />
      {isLoading ? "Loading..." : "Demo Auto-Fill"}
    </Button>
  );
};