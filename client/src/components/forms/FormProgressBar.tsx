import React from 'react';
import { cn } from '@/lib/utils';
import { createEnhancedLogger } from '@/utils/enhanced-logger';

// Create a silent logger for this component - disable all logs
const logger = createEnhancedLogger('FormProgressBar', 'uiComponents', {
  disableAllLogs: true,
  preserveErrors: true  // Keep only critical errors
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
  
  // Use appropriate color for the progress bar based on completion
  const getProgressColor = (value: number) => {
    // For 100% complete, use solid green
    if (value >= 100) {
      return 'bg-green-500';
    }
    
    // For values above 90%, transition more to green
    if (value >= 90) {
      return 'bg-gradient-to-r from-blue-400 via-green-400 to-green-500';
    }
    
    // For values above 50%, start introducing green
    if (value >= 50) {
      return 'bg-gradient-to-r from-blue-500 via-blue-400 to-green-400';
    }
    
    // For values below 50%, keep primarily blue
    return 'bg-gradient-to-r from-blue-600 to-blue-400';
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
              // Calculate position with bounds to prevent clipping
              // Ensure text doesn't go beyond left or right edges
              left: `${Math.max(Math.min(displayProgress, 97), 3)}%`,
              // Right align if progress > 50%, left align if progress < 50%
              transform: displayProgress > 50 ? 'translateX(-100%)' : 'translateX(0)',
              top: '2px'
            }}
          >
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {displayProgress === 100 ? "Ready for Submission" : `${displayProgress}% Complete`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormProgressBar;
