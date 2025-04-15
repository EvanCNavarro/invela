import React from 'react';
import { CircleCheck, CircleDashed, CircleDotDashed, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// Props for the StatusIcon component
export interface StatusIconProps {
  isCompleted: boolean;
  isActive: boolean;
  size?: number;
  className?: string;
  variant?: 'default' | 'review'; // Added review variant
  reviewStatus?: 'locked' | 'unlocked' | 'submitted'; // Added review status
}

/**
 * A component to display section completion status with appropriate icons and colors
 * Uses the following icons:
 * - CircleCheck for completed sections
 * - CircleDotDashed for active sections
 * - CircleDashed for in-progress or not-started sections
 * - LockKeyhole for review locked
 * - LockKeyholeOpen for review unlocked
 */
export const StatusIcon: React.FC<StatusIconProps> = ({
  isCompleted,
  isActive,
  size = 16,
  className,
  variant = 'default',
  reviewStatus
}) => {
  // Special handling for review section
  if (variant === 'review') {
    // If review is submitted (completed), show a green check icon
    if (reviewStatus === 'submitted') {
      return (
        <span className={cn("text-emerald-500", className)}>
          <CircleCheck size={size} strokeWidth={2} />
        </span>
      );
    }
    
    // If review is unlocked (active but not submitted)
    if (reviewStatus === 'unlocked') {
      // Use primary color (blue) when active, otherwise gray
      return (
        <span className={cn(isActive ? "text-primary" : "text-gray-400", className)}>
          <LockKeyholeOpen size={size} strokeWidth={2} />
        </span>
      );
    }
    
    // Otherwise (locked), show a lock icon (gray)
    return (
      <span className={cn("text-gray-400", className)}>
        <LockKeyhole size={size} strokeWidth={2} />
      </span>
    );
  }
  
  // For default sections:
  // If completed, show a green circle-check icon
  if (isCompleted) {
    return (
      <span className={cn("text-emerald-500", className)}>
        <CircleCheck size={size} strokeWidth={2} />
      </span>
    );
  }
  
  // If active but not completed, show a blue circle-dot-dashed icon
  if (isActive) {
    return (
      <span className={cn("text-primary", className)}>
        <CircleDotDashed size={size} strokeWidth={2} />
      </span>
    );
  }
  
  // Otherwise, show a gray circle-dashed for in-progress or not-started
  return (
    <span className={cn("text-gray-400", className)}>
      <CircleDashed size={size} strokeWidth={2} />
    </span>
  );
};

export default StatusIcon;
