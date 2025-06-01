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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const dimensionsCacheRef = useRef<Map<string, Dimensions>>(new Map());

  /**
   * Smart dimension calculation with caching to prevent jittery resizing
   */
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Create cache key based on container context
    const cacheKey = `${minWidth}-${minHeight}-${maxWidth}-${maxHeight}-${aspectRatio || 'auto'}`;
    
    // Check cache first for instant loading
    const cachedDimensions = dimensionsCacheRef.current.get(cacheKey);
    if (cachedDimensions && isInitialLoad && !layoutComplete) {
      setDimensions(cachedDimensions);
      setLayoutComplete(true);
      setIsInitialLoad(false);
      return;
    }

    // Single calculation with proper timing
    const performCalculation = () => {
      const rect = container.getBoundingClientRect();
      let { width, height } = rect;

      // Intelligent height detection
      if (height === 0 || height < minHeight) {
        let parent = container.parentElement;
        let bestHeight = fallbackHeight;
        
        // Look for first meaningful parent height
        while (parent && parent !== document.body) {
          const parentRect = parent.getBoundingClientRect();
          if (parentRect.height > minHeight) {
            const computedStyle = window.getComputedStyle(parent);
            const usableHeight = parentRect.height - 
              parseFloat(computedStyle.paddingTop) - 
              parseFloat(computedStyle.paddingBottom) - 20; // Buffer for content
            
            if (usableHeight > minHeight) {
              bestHeight = Math.min(usableHeight, maxHeight);
              break;
            }
          }
          parent = parent.parentElement;
        }
        height = bestHeight;
      }

      // Width handling
      if (width === 0) {
        width = container.offsetWidth || container.parentElement?.clientWidth || minWidth;
      }

      // Apply constraints
      width = Math.max(minWidth, Math.min(maxWidth, width));
      height = Math.max(minHeight, Math.min(maxHeight, height));

      // Apply aspect ratio precisely once
      if (aspectRatio) {
        const aspectHeight = width / aspectRatio;
        if (aspectHeight <= maxHeight && aspectHeight >= minHeight) {
          height = aspectHeight;
        } else {
          width = height * aspectRatio;
          width = Math.max(minWidth, Math.min(maxWidth, width));
        }
      }

      const newDimensions = { width: Math.round(width), height: Math.round(height) };
      
      // Only update if significantly different (prevents micro-adjustments)
      setDimensions(prev => {
        const significantChange = Math.abs(prev.width - newDimensions.width) > 5 || 
                                Math.abs(prev.height - newDimensions.height) > 5;
        
        if (significantChange || !layoutComplete) {
          // Cache the result
          dimensionsCacheRef.current.set(cacheKey, newDimensions);
          
          if (!layoutComplete) {
            setLayoutComplete(true);
            setIsInitialLoad(false);
          }
          
          return newDimensions;
        }
        return prev;
      });
    };

    // Execute calculation after layout settles
    if (isInitialLoad) {
      // Fast initial calculation
      requestAnimationFrame(performCalculation);
    } else {
      // Standard debounced calculation for resize events
      performCalculation();
    }
  }, [containerRef, minWidth, minHeight, maxWidth, maxHeight, aspectRatio, fallbackHeight, layoutComplete, isInitialLoad]);

  const debouncedCalculateDimensions = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(calculateDimensions, debounceMs);
  }, [calculateDimensions, debounceMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Immediate calculation for cached dimensions, delayed for new ones
    const delay = isInitialLoad ? 16 : 100; // Single frame for cached, longer for uncached
    const initialCalculation = setTimeout(calculateDimensions, delay);

    // Set up ResizeObserver only for actual resize events (not initial load)
    let resizeObserver: ResizeObserver | null = null;
    
    if (!isInitialLoad && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(debouncedCalculateDimensions);
      resizeObserver.observe(container);
    } else if (!isInitialLoad) {
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
      } else if (!isInitialLoad) {
        window.removeEventListener('resize', debouncedCalculateDimensions);
      }
    };
  }, [calculateDimensions, debouncedCalculateDimensions, isInitialLoad]);

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
          className="w-full h-full flex items-center justify-center bg-gray-50/50"
          style={{ minHeight }}
        >
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
            </div>
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