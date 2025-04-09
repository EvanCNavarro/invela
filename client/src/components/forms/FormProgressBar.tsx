import React from 'react';
import { cn } from '@/lib/utils';

interface FormProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  height?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const FormProgressBar: React.FC<FormProgressBarProps> = ({
  progress,
  className,
  showPercentage = false,
  height = 'sm',
  color = 'primary'
}) => {
  // Ensure progress is within bounds
  const normalizedProgress = Math.min(Math.max(0, progress), 100);
  
  // Height classes based on size prop
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  // Color classes for the progress bar
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500'
  };
  
  // Dynamic color based on progress
  const dynamicColor = 
    normalizedProgress < 30 ? 'danger' :
    normalizedProgress < 70 ? 'warning' : 'success';
  
  // Use specified color or dynamic color if not specified
  const finalColor = color || dynamicColor;
  
  return (
    <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", heightClasses[height], className)}>
      <div 
        className={cn("h-full transition-all duration-500 ease-out rounded-full", colorClasses[finalColor])} 
        style={{ width: `${normalizedProgress}%` }}
      />
      
      {showPercentage && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          {normalizedProgress}% Complete
        </div>
      )}
    </div>
  );
};

export default FormProgressBar;