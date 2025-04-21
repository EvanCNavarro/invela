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
  // No longer used - we're now handling the loading state directly in the button
  return null;
}