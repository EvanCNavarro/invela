/**
 * PulsingDot Component
 * 
 * A pulsating dot indicator with customizable colors for status indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface PulsingDotProps {
  /** Color variant for the dot */
  variant?: 'red' | 'blue' | 'green';
  /** Size of the dot */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const PulsingDot: React.FC<PulsingDotProps> = ({
  variant = 'red',
  size = 'sm',
  className
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  const colorClasses = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  };

  const pulseColorClasses = {
    red: 'bg-red-400',
    blue: 'bg-blue-400', 
    green: 'bg-green-400'
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Outer pulsing ring */}
      <div className={cn(
        "absolute inline-flex rounded-full opacity-75 animate-ping",
        sizeClasses[size],
        pulseColorClasses[variant]
      )}></div>
      
      {/* Inner solid dot */}
      <div className={cn(
        "relative inline-flex rounded-full",
        sizeClasses[size],
        colorClasses[variant]
      )}></div>
    </div>
  );
};

export default PulsingDot;