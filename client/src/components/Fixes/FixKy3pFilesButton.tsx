import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FixKy3pFilesButtonProps {
  className?: string;
}

const FixKy3pFilesButton: React.FC<FixKy3pFilesButtonProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | {
    totalTasks: number;
    fixedCount: number;
    alreadyCorrectCount: number;
    noFileCount: number;
    errorCount: number;
  }>(null);

  const runFix = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const response = await apiRequest('/api/fix-ky3p-files', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to run fix: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: 'Fix completed',
        description: `Fixed ${data.fixedCount} files out of ${data.totalTasks} tasks.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error running fix:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to run the fix',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Button
        onClick={runFix}
        disabled={isLoading}
        variant="default"
        className="w-full"
      >
        {isLoading ? 'Running Fix...' : 'Fix KY3P File References'}
      </Button>

      {result && (
        <div className="bg-muted p-4 rounded-md text-sm">
          <h3 className="font-medium mb-2">Results:</h3>
          <ul className="space-y-1">
            <li>Total KY3P tasks: {result.totalTasks}</li>
            <li>Files fixed: {result.fixedCount}</li>
            <li>Already correct: {result.alreadyCorrectCount}</li>
            <li>No file found: {result.noFileCount}</li>
            <li>Errors: {result.errorCount}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FixKy3pFilesButton;
