/**
 * BlockedDataRecipientsAlert Component
 *
 * A visual alert that displays the number of Data Recipients currently blocked
 * due to low DARS (Data Access Risk Scores). 
 * 
 * This component is shown at the top of the Insights page for Bank and Invela admins.
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BlockedDataRecipientsAlertProps {
  /** Number of blocked data recipients */
  count: number;
  /** Optional className for styling */
  className?: string;
  /** Current timeframe setting */
  timeframe?: '7day' | '30day';
  /** Callback for when timeframe changes */
  onTimeframeChange?: (timeframe: '7day' | '30day') => void;
}

/**
 * Logger for the Blocked Data Recipients Alert component
 */
const logAlert = (action: string, details?: any) => {
  console.log(`[BlockedDataRecipientsAlert] ${action}`, details || '');
};

const BlockedDataRecipientsAlert: React.FC<BlockedDataRecipientsAlertProps> = ({
  count,
  className,
  timeframe = '7day',
  onTimeframeChange
}) => {
  // Log when the component renders with a different count
  React.useEffect(() => {
    logAlert('Rendered alert', { blockedCount: count });
  }, [count]);

  // Don't show the alert if there are no blocked recipients
  if (count === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "bg-red-100 border-l-4 border-red-500 p-4 rounded-md mb-4",
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-red-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-red-700">
            {count} {count === 1 ? 'Data Recipient is' : 'Data Recipients are'} blocked
          </p>
          <p className="text-sm text-red-600">
            These companies have been automatically blocked due to a DARS below the minimum risk threshold.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlockedDataRecipientsAlert;