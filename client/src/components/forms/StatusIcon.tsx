import React from 'react';
import { CircleCheck, CircleDashed, CircleDot } from 'lucide-react';

interface StatusIconProps {
  isCompleted: boolean;
  isActive: boolean;
  size?: number;
}

/**
 * Custom component for section status icons with better control over styling
 */
export const StatusIcon: React.FC<StatusIconProps> = ({ 
  isCompleted, 
  isActive,
  size = 14 
}) => {
  if (isCompleted) {
    return <CircleCheck size={size} className="text-emerald-500" />;
  }
  
  if (isActive) {
    // Custom styling for active but incomplete sections
    // This creates a "circle dot dashed" effect by layering a CircleDashed with a center dot
    return (
      <div className="relative inline-flex justify-center items-center">
        <CircleDashed size={size} className="text-primary" />
        {/* Center dot */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-primary"></div>
      </div>
    );
  }
  
  return <CircleDashed size={size} className="text-gray-400" />;
};

export default StatusIcon;