/**
 * Responsive Chart Container
 * 
 * A universal wrapper component for all chart visualizations that ensures:
 * - Proper responsive behavior within dashboard widgets
 * - Consistent overflow handling to prevent chart cutoff
 * - Optimal spacing and padding for various chart types
 * - Smooth scaling across different screen sizes
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveChartContainerProps {
  children: ReactNode;
  className?: string;
  height?: number | string;
  aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6'
};

const aspectRatioClasses = {
  auto: '',
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square'
};

export function ResponsiveChartContainer({
  children,
  className = '',
  height = 'auto',
  aspectRatio = 'auto',
  padding = 'none'
}: ResponsiveChartContainerProps) {
  const containerStyle = height !== 'auto' ? { height } : {};
  
  return (
    <div 
      className={cn(
        'w-full overflow-hidden',
        aspectRatioClasses[aspectRatio],
        paddingClasses[padding],
        className
      )}
      style={containerStyle}
    >
      <div className="w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * Specialized container for ApexCharts with optimized settings
 */
export function ApexChartContainer({
  children,
  className = '',
  height = 380,
}: {
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <ResponsiveChartContainer
      className={cn('relative', className)}
      height={height}
    >
      <div className="absolute inset-0 w-full h-full">
        {children}
      </div>
    </ResponsiveChartContainer>
  );
}

/**
 * Chart wrapper specifically for dashboard widgets
 */
export function DashboardChartWrapper({
  children,
  className = '',
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn('w-full space-y-2', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-medium text-gray-900">{title}</h3>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
      <ResponsiveChartContainer>
        {children}
      </ResponsiveChartContainer>
    </div>
  );
}