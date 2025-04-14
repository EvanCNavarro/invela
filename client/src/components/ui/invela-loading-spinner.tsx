import React from 'react';
import { cn } from '@/lib/utils';

interface InvelaLoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function InvelaLoadingSpinner({
  className,
  size = 'md',
  text
}: InvelaLoadingSpinnerProps) {
  // Size mapping
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("animate-spin text-primary relative", sizeMap[size])}>
        {/* Invela logo spinner - simplified version */}
        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Central 'I' for Invela */}
          <path
            d="M12 7.5v9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export default InvelaLoadingSpinner;