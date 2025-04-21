import React from 'react';
import { Loader2 } from 'lucide-react';

interface ClearingFieldsIndicatorProps {
  isClearing: boolean;
}

/**
 * A component that shows a loading indicator while fields are being cleared
 * This provides visual feedback to users during the clearing operation
 */
export function ClearingFieldsIndicator({ isClearing }: ClearingFieldsIndicatorProps) {
  if (!isClearing) return null;
  
  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h3 className="text-xl font-semibold text-foreground">Clearing form data</h3>
        <p className="text-muted-foreground text-center">
          Please wait while all fields are being cleared...
        </p>
      </div>
    </div>
  );
}