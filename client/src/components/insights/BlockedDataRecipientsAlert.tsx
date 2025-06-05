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

  // Show positive state when no blocked recipients, warning state when blocked
  const isBlocked = count > 0;
  
  return (
    <div 
      className={cn(
        "border-l-2 px-4 rounded-md mb-0 h-10 flex items-center w-fit",
        isBlocked 
          ? "bg-red-50 border-red-200" 
          : "bg-green-50 border-green-200",
        className
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-black">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-black leading-none whitespace-nowrap">
            {isBlocked 
              ? `${count} ${count === 1 ? 'Data Recipient is' : 'Data Recipients are'} blocked`
              : 'All Data Recipients are operating normally'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlockedDataRecipientsAlert;