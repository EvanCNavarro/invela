import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useRouter, useLocation } from 'wouter';

interface FixMissingFileButtonProps {
  taskId: number;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Button component that triggers the fix-missing-file API endpoint
 * to regenerate the file for a task that is missing a file in File Vault.
 */
const FixMissingFileButton: React.FC<FixMissingFileButtonProps> = ({
  taskId,
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Function to call the fix-missing-file API endpoint
  const handleFixFile = async () => {
    if (!taskId || taskId <= 0) {
      toast({
        title: 'Invalid Task ID',
        description: 'Cannot fix file for an invalid task ID.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Call our API endpoint to fix the missing file
      const response = await apiRequest(`/api/forms/fix-missing-file/${taskId}`, {
        method: 'POST',
      });
      
      if (response.success) {
        toast({
          title: 'File Fixed!',
          description: `Successfully created file: ${response.fileName}`,
          variant: 'default',
        });
        
        // Refresh the page after 1 second to show the new file
        setTimeout(() => {
          // If we're on the file vault page, refresh it
          if (location.includes('file-vault')) {
            // Use a reload instead of navigation to ensure complete refresh
            window.location.reload();
          } else {
            // Navigate to file vault to see the new file
            navigate('/file-vault');
          }
        }, 1000);
      } else {
        toast({
          title: 'Error Fixing File',
          description: response.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fixing file:', error);
      toast({
        title: 'Error Fixing File',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFixFile}
      variant={variant}
      size={size}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? 'Fixing...' : 'Fix Missing File'}
    </Button>
  );
};

export default FixMissingFileButton;
