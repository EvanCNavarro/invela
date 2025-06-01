/**
 * ========================================
 * Responsive Chart Wrapper
 * ========================================
 * 
 * Provides responsive dimensions for chart components, replacing hardcoded values.
 * Uses ResizeObserver for efficient container dimension tracking.
 * 
 * @module components/ui/responsive-chart-wrapper
 * @version 1.0.0
 * @since 2025-06-01
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ResponsiveChartWrapperProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  debounceMs?: number;
}

interface Dimensions {
  width: number;
  height: number;
}

/**
 * Hook for responsive chart dimensions with efficient resize handling
 */
export function useResponsiveChartDimensions(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
    debounceMs?: number;
  } = {}
) {
  const {
    minWidth = 300,
    minHeight = 200,
    maxWidth = Infinity,
    maxHeight = Infinity,
    aspectRatio,
    debounceMs = 150
  } = options;

  const [dimensions, setDimensions] = useState<Dimensions>({ width: minWidth, height: minHeight });
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let { width, height } = rect;

    // Apply constraints
    width = Math.max(minWidth, Math.min(maxWidth, width));
    height = Math.max(minHeight, Math.min(maxHeight, height));

    // Apply aspect ratio if specified
    if (aspectRatio) {
      const calculatedHeight = width / aspectRatio;
      if (calculatedHeight <= maxHeight && calculatedHeight >= minHeight) {
        height = calculatedHeight;
      } else {
        width = height * aspectRatio;
      }
    }

    setDimensions(prev => {
      // Only update if dimensions changed significantly (avoid unnecessary rerenders)
      if (Math.abs(prev.width - width) > 5 || Math.abs(prev.height - height) > 5) {
        console.debug('[ResponsiveChart] Dimensions updated:', { width, height });
        return { width, height };
      }
      return prev;
    });
  }, [containerRef, minWidth, minHeight, maxWidth, maxHeight, aspectRatio]);

  const debouncedUpdateDimensions = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(updateDimensions, debounceMs);
  }, [updateDimensions, debounceMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial dimension calculation
    updateDimensions();

    // Set up ResizeObserver for efficient resize handling
    let resizeObserver: ResizeObserver | null = null;
    
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(debouncedUpdateDimensions);
      resizeObserver.observe(container);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', debouncedUpdateDimensions);
    }

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', debouncedUpdateDimensions);
      }
    };
  }, [updateDimensions, debouncedUpdateDimensions]);

  return dimensions;
}

/**
 * Responsive wrapper component for chart containers
 */
export function ResponsiveChartWrapper({
  children,
  className = '',
  minWidth = 300,
  minHeight = 200,
  maxWidth = Infinity,
  maxHeight = Infinity,
  aspectRatio,
  debounceMs = 150
}: ResponsiveChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const dimensions = useResponsiveChartDimensions(containerRef, {
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    aspectRatio,
    debounceMs
  });

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${className}`}
      style={{ minWidth, minHeight }}
    >
      {children(dimensions)}
    </div>
  );
}

/**
 * Mobile-first responsive breakpoints for charts
 */
export const CHART_BREAKPOINTS = {
  mobile: { maxWidth: 767, recommendedHeight: 300 },
  tablet: { minWidth: 768, maxWidth: 1023, recommendedHeight: 400 },
  desktop: { minWidth: 1024, recommendedHeight: 500 }
} as const;

/**
 * Get responsive chart configuration based on screen size
 */
export function getResponsiveChartConfig(width: number) {
  if (width <= CHART_BREAKPOINTS.mobile.maxWidth) {
    return {
      breakpoint: 'mobile' as const,
      height: CHART_BREAKPOINTS.mobile.recommendedHeight,
      padding: { top: 20, right: 20, bottom: 40, left: 40 },
      fontSize: { title: 16, axis: 12, legend: 11 }
    };
  }
  
  if (width <= CHART_BREAKPOINTS.tablet.maxWidth) {
    return {
      breakpoint: 'tablet' as const,
      height: CHART_BREAKPOINTS.tablet.recommendedHeight,
      padding: { top: 30, right: 30, bottom: 50, left: 50 },
      fontSize: { title: 18, axis: 13, legend: 12 }
    };
  }
  
  return {
    breakpoint: 'desktop' as const,
    height: CHART_BREAKPOINTS.desktop.recommendedHeight,
    padding: { top: 40, right: 40, bottom: 60, left: 60 },
    fontSize: { title: 20, axis: 14, legend: 13 }
  };
}

/**
 * Higher-order component to add responsive dimensions to chart components
 */
export function withResponsiveDimensions<T extends object>(
  WrappedComponent: React.ComponentType<T & { width?: number; height?: number }>,
  options: {
    minWidth?: number;
    minHeight?: number;
    aspectRatio?: number;
  } = {}
) {
  const ComponentWithResponsiveDimensions = (props: T) => (
    <ResponsiveChartWrapper {...options}>
      {({ width, height }) => (
        <WrappedComponent 
          {...props} 
          width={width} 
          height={height}
        />
      )}
    </ResponsiveChartWrapper>
  );

  ComponentWithResponsiveDimensions.displayName = `withResponsiveDimensions(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithResponsiveDimensions;
}