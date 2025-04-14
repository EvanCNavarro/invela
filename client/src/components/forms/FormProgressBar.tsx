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
  
  // Determine the color of the progress bar based on progress value
  const getProgressColor = (value: number) => {
    if (value >= 100) return 'bg-emerald-500'; // Complete
    if (value >= 75) return 'bg-emerald-400'; // Almost complete
    if (value >= 50) return 'bg-blue-500'; // Halfway
    if (value >= 25) return 'bg-amber-500'; // Starting
    return 'bg-rose-500'; // Just beginning
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
      
      {/* Progress percentage if enabled */}
      {showPercentage && (
        <div className="text-right mt-1">
          <span className="text-xs text-gray-500">
            {displayProgress}% Complete
          </span>
        </div>
      )}
    </div>
  );
};

export default FormProgressBar;
