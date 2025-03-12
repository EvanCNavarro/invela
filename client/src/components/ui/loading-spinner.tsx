import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      size === "sm" && "h-4 w-4",
      size === "md" && "h-8 w-8",
      size === "lg" && "h-12 w-12",
      className
    )}>
      <svg 
        viewBox="0 0 28 28" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        xmlns:anim="http://www.w3.org/2000/anim" 
        anim="" 
        anim:transform-origin="50% 50%" 
        anim:duration="1" 
        anim:ease="ease-in-out"
        className="animate-spin"
      >
        <g id="Frame 427319720">
          <g id="Invela Icon" anim:rotation="0[0:1:360:ease-in-out]">
            <path d="M4.11091 11.9259H7.96489V15.8148H4.11091V11.9259Z" fill="#4965EC" fillOpacity="0.5"></path>
            <path fillRule="evenodd" clipRule="evenodd" d="M23.8947 14C23.8947 19.5842 19.4084 24.1111 13.8743 24.1111C8.95555 24.1111 4.85962 20.5316 4.01429 15.8148H0.115504C0.99735 22.6895 6.82123 28 13.8743 28C21.5369 28 27.7486 21.732 27.7486 14C27.7486 6.26801 21.5369 0 13.8743 0C6.91015 0 1.14439 5.17749 0.151206 11.9259H4.06422C5.01052 7.33757 9.04646 3.88889 13.8743 3.88889C19.4084 3.88889 23.8947 8.41579 23.8947 14ZM8.50022e-05 13.9505C2.83495e-05 13.967 0 13.9835 0 14C0 14.0165 2.83495e-05 14.033 8.50022e-05 14.0495V13.9505Z" fill="#4965EC" fillOpacity="0.5"></path>
          </g>
        </g>
      </svg>
    </div>
  );
}
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  return (
    <svg
      className={cn(`animate-spin text-primary`, sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
