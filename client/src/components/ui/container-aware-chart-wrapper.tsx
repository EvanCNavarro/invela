/**
 * ========================================
 * Container-Aware Chart Wrapper
 * ========================================
 * 
 * Advanced responsive wrapper that solves container height detection failures
 * and chart library dimension conflicts through proper layout awareness.
 * 
 * @module components/ui/container-aware-chart-wrapper
 * @version 2.0.0
 * @since 2025-06-01
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ContainerAwareChartWrapperProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  debounceMs?: number;
  fallbackHeight?: number;
}

interface Dimensions {
  width: number;
  height: number;
}

/**
 * Enhanced hook that detects container context and calculates proper dimensions
 */
export function useContainerAwareDimensions(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    aspectRatio?: number;
    debounceMs?: number;
    fallbackHeight?: number;
  } = {}
) {
  const {
    minWidth = 300,
    minHeight = 200,
    maxWidth = Infinity,
    maxHeight = Infinity,
    aspectRatio,
    debounceMs = 150,
    fallbackHeight = 400
  } = options;

  const [dimensions, setDimensions] = useState<Dimensions>({ width: minWidth, height: minHeight });
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const [layoutComplete, setLayoutComplete] = useState(false);

  /**
   * Enhanced dimension calculation that handles container context failures
   */
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Wait for layout completion using multiple detection methods
    const waitForLayout = () => {
      return new Promise<void>((resolve) => {
        // Method 1: requestAnimationFrame for layout completion
        requestAnimationFrame(() => {
          // Method 2: Short timeout for container stabilization
          setTimeout(() => {
            resolve();
          }, 16); // Single frame delay
        });
      });
    };

    waitForLayout().then(() => {
      const rect = container.getBoundingClientRect();
      let { width, height } = rect;

      // Handle zero height from failed CSS inheritance
      if (height === 0 || height < minHeight) {
        // Traverse up to find first parent with defined height
        let parent = container.parentElement;
        let foundHeight = 0;
        
        while (parent && foundHeight === 0 && parent !== document.body) {
          const parentRect = parent.getBoundingClientRect();
          if (parentRect.height > 0) {
            // Calculate available height considering padding and margins
            const computedStyle = window.getComputedStyle(parent);
            const paddingTop = parseFloat(computedStyle.paddingTop);
            const paddingBottom = parseFloat(computedStyle.paddingBottom);
            const marginTop = parseFloat(computedStyle.marginTop);
            const marginBottom = parseFloat(computedStyle.marginBottom);
            
            foundHeight = parentRect.height - paddingTop - paddingBottom - marginTop - marginBottom;
            
            // Reserve space for siblings if in flex container
            if (computedStyle.display === 'flex') {
              foundHeight = Math.max(foundHeight * 0.8, fallbackHeight);
            }
          }
          parent = parent.parentElement;
        }
        
        height = foundHeight > 0 ? foundHeight : fallbackHeight;
      }

      // Handle zero width (rare but possible)
      if (width === 0) {
        width = container.offsetWidth || minWidth;
      }

      // Apply constraints with container boundary respect
      const maxAvailableWidth = Math.min(maxWidth, container.offsetParent?.clientWidth || width);
      width = Math.max(minWidth, Math.min(maxAvailableWidth, width));
      height = Math.max(minHeight, Math.min(maxHeight, height));

      // Apply aspect ratio without breaking container boundaries
      if (aspectRatio) {
        const calculatedHeight = width / aspectRatio;
        const calculatedWidth = height * aspectRatio;
        
        // Choose the dimension that respects container boundaries
        if (calculatedHeight <= maxHeight && calculatedHeight >= minHeight && calculatedHeight <= height) {
          height = calculatedHeight;
        } else if (calculatedWidth <= maxAvailableWidth && calculatedWidth >= minWidth) {
          width = calculatedWidth;
        }
        // If neither fits perfectly, prioritize width constraint
      }

      setDimensions(prev => {
        // More sensitive change detection for better responsiveness
        if (Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1) {
          console.debug('[ContainerAwareChart] Dimensions updated:', { 
            width, 
            height, 
            containerHeight: rect.height,
            calculatedFromParent: rect.height === 0 
          });
          return { width, height };
        }
        return prev;
      });

      if (!layoutComplete) {
        setLayoutComplete(true);
      }
    });
  }, [containerRef, minWidth, minHeight, maxWidth, maxHeight, aspectRatio, fallbackHeight, layoutComplete]);

  const debouncedCalculateDimensions = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(calculateDimensions, debounceMs);
  }, [calculateDimensions, debounceMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial calculation with slight delay for DOM stabilization
    const initialCalculation = setTimeout(calculateDimensions, 50);

    // Set up ResizeObserver for container changes
    let resizeObserver: ResizeObserver | null = null;
    
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(debouncedCalculateDimensions);
      resizeObserver.observe(container);
      
      // Also observe parent containers for layout changes
      let parent = container.parentElement;
      while (parent && parent !== document.body) {
        resizeObserver.observe(parent);
        parent = parent.parentElement;
      }
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', debouncedCalculateDimensions);
    }

    return () => {
      clearTimeout(initialCalculation);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', debouncedCalculateDimensions);
      }
    };
  }, [calculateDimensions, debouncedCalculateDimensions]);

  return { ...dimensions, layoutComplete };
}

/**
 * Container-aware responsive wrapper component for charts
 */
export function ContainerAwareChartWrapper({
  children,
  className = '',
  minWidth = 300,
  minHeight = 200,
  maxWidth = Infinity,
  maxHeight = Infinity,
  aspectRatio,
  debounceMs = 150,
  fallbackHeight = 400
}: ContainerAwareChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { width, height, layoutComplete } = useContainerAwareDimensions(containerRef, {
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    aspectRatio,
    debounceMs,
    fallbackHeight
  });

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full ${className}`}
      style={{ 
        minWidth, 
        minHeight,
        // Ensure container establishes height context
        height: '100%',
        position: 'relative'
      }}
    >
      {layoutComplete ? children({ width, height }) : (
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ minHeight }}
        >
          <div className="animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Chart library specific dimension interfaces
 */
export const ChartLibraryAdapters = {
  /**
   * ApexCharts adapter - handles conflicts with internal responsive options
   */
  apexcharts: (width: number, height: number) => ({
    width: "100%",
    height: height,
    options: {
      chart: {
        width: "100%",
        height: height,
        // Disable internal responsive to prevent conflicts
        responsive: []
      }
    }
  }),

  /**
   * D3 adapter - provides proper SVG viewBox for scalability
   */
  d3: (width: number, height: number) => ({
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "xMidYMid meet"
  }),

  /**
   * Plotly adapter - disables internal autosize to prevent conflicts
   */
  plotly: (width: number, height: number) => ({
    layout: {
      width,
      height,
      autosize: false,
      responsive: false
    },
    config: {
      responsive: false
    }
  })
};