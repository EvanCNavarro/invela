import React from 'react';
import { cn } from '@/lib/utils';
import getLogger from '@/utils/logger';

// Logger instance for this component
const logger = getLogger('FormProgressBar', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

// Props for the progress bar component
export interface FormProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  barHeight?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
}

/**
 * A simple progress bar component for displaying form completion progress
 */
const FormProgressBar: React.FC<FormProgressBarProps> = ({
  progress,
  className,
  showPercentage = true,
  barHeight = 'md',
  showAnimation = true
}) => {
  // Ensure progress is always a valid number between 0 and 100
  const validProgress = Math.max(0, Math.min(100, isNaN(progress) ? 0 : progress));
  
  // Round to nearest integer for display
  const displayProgress = Math.round(validProgress);
  
  // Use gradient color for the progress bar, from blue to green
  const getProgressColor = (value: number) => {
    // Always use the gradient from blue to green for a smooth transition
    return 'bg-gradient-to-r from-blue-500 to-green-500';
  };
  
  // Get the height class based on barHeight prop
  const getHeightClass = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm': return 'h-1';
      case 'lg': return 'h-3';
      default: return 'h-2';
    }
  };
  
  // Log the progress for debugging
  logger.debug(`Rendering progress bar: ${displayProgress}%`);
  
  return (
    <div className={cn("w-full", className)}>
      {/* Outer container - gray background */}
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", getHeightClass(barHeight))}>
        {/* Inner progress bar - colored */}
        <div 
          className={cn(
            getProgressColor(displayProgress),
            getHeightClass(barHeight),
            showAnimation ? "transition-all duration-500 ease-out" : ""
          )}
          style={{ width: `${displayProgress}%` }}
          role="progressbar"
          aria-valuenow={displayProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      
      {/* Progress percentage if enabled - positioned relative to progress */}
      {showPercentage && (
        <div className="relative h-5">
          <div 
            className="absolute transition-all duration-500 ease-out"
            style={{ 
              left: `${Math.min(Math.max(displayProgress, 3), 97)}%`, 
              transform: 'translateX(-50%)',
              top: '2px'
            }}
          >
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {displayProgress}% Complete
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormProgressBar;
