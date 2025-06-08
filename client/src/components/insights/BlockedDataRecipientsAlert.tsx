/**
 * BlockedDataRecipientsAlert Component
 *
 * A visual alert that displays the number of Data Recipients currently blocked
 * due to low DARS (Data Access Risk Scores). 
 * 
 * This component is shown at the top of the Insights page for Bank and Invela admins.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import PulsingDot from '@/components/ui/pulsing-dot';

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
        "border-l-2 rounded-md mb-0 flex items-center w-fit",
        isBlocked 
          ? "bg-red-50 border-red-200" 
          : "bg-blue-50 border-blue-200",
        className
      )}
    >
      <div className="flex items-center px-4 py-3">
        <div className="flex-shrink-0 mr-4">
          <PulsingDot variant={isBlocked ? "red" : "blue"} size="sm" />
        </div>
        <div className="mr-4">
          <p className={cn(
            "font-medium text-sm leading-none whitespace-nowrap",
            isBlocked ? "text-red-800" : "text-blue-800"
          )}>
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