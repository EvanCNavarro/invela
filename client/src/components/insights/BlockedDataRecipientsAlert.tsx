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
        "bg-red-50 border-l-2 border-red-200 px-4 rounded-md mb-0 h-10 flex items-center",
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-black">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-black leading-none">
            {count} {count === 1 ? 'Data Recipient is' : 'Data Recipients are'} blocked
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlockedDataRecipientsAlert;