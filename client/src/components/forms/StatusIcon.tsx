import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Props for the StatusIcon component
export interface StatusIconProps {
  isCompleted: boolean;
  isActive: boolean;
  size?: number;
  className?: string;
}

/**
 * A component to display section completion status with appropriate icons and colors
 */
export const StatusIcon: React.FC<StatusIconProps> = ({
  isCompleted,
  isActive,
  size = 16,
  className
}) => {
  // If completed, show a green check icon
  if (isCompleted) {
    return (
      <span className={cn("text-emerald-500", className)}>
        <Check size={size} strokeWidth={3} />
      </span>
    );
  }
  
  // Otherwise, show a circle with appropriate color based on active state
  return (
    <span 
      className={cn(
        "text-gray-400",
        isActive && "text-primary",
        className
      )}
    >
      <Circle size={size} strokeWidth={1.5} />
    </span>
  );
};

export default StatusIcon;
