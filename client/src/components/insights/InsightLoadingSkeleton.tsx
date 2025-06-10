/**
 * ========================================
 * Insight Loading Skeleton - Standardized Animation Component
 * ========================================
 * 
 * Consistent loading skeleton for all insight visualizations with
 * staggered shimmer animations matching the QuickActions and CompanySnapshot
 * widget patterns.
 * 
 * Key Features:
 * - Shimmer animation with staggered delays
 * - Multiple layout variants for different insight types
 * - Consistent sizing and spacing
 * - Professional animation timing
 * 
 * @module components/insights/InsightLoadingSkeleton
 * @version 1.0.0
 * @since 2025-06-09
 */

import { INSIGHT_ANIMATIONS, INSIGHT_SIZING } from "@/lib/insightDesignSystem";

interface InsightLoadingSkeletonProps {
  /** Animation delay for staggered entrance effects */
  animationDelay?: number;
  /** Layout variant for different insight types */
  variant?: 'chart' | 'network' | 'grid' | 'compact';
  /** Custom height override */
  height?: string;
}

export function InsightLoadingSkeleton({ 
  animationDelay = 0,
  variant = 'chart',
  height
}: InsightLoadingSkeletonProps) {
  
  // Chart visualization skeleton (default)
  if (variant === 'chart') {
    return (
      <div className="space-y-4 p-4" style={{ height: height || INSIGHT_SIZING.heights.standard }}>
        {/* Controls Row Skeleton */}
        <div className="flex justify-between items-center gap-4">
          <div 
            className="widget-skeleton-shimmer h-10 w-48 rounded-lg"
            style={{ animationDelay: `${animationDelay}ms` }}
          />
          <div 
            className="widget-skeleton-shimmer h-10 w-32 rounded-lg"
            style={{ animationDelay: `${animationDelay + 100}ms` }}
          />
        </div>
        
        {/* Main Chart Area Skeleton */}
        <div 
          className="widget-skeleton-shimmer rounded-lg flex-1"
          style={{ 
            animationDelay: `${animationDelay + 200}ms`,
            minHeight: '300px'
          }}
        />
        
        {/* Legend/Footer Skeleton */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="widget-skeleton-shimmer h-6 w-20 rounded"
              style={{ animationDelay: `${animationDelay + 300 + (index * 50)}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Network visualization skeleton
  if (variant === 'network') {
    return (
      <div className="space-y-4 p-4" style={{ height: height || INSIGHT_SIZING.heights.standard }}>
        {/* Controls Row Skeleton */}
        <div className="flex justify-between items-center gap-4">
          <div 
            className="widget-skeleton-shimmer h-10 w-40 rounded-lg"
            style={{ animationDelay: `${animationDelay}ms` }}
          />
          <div className="flex gap-2">
            <div 
              className="widget-skeleton-shimmer h-10 w-24 rounded-lg"
              style={{ animationDelay: `${animationDelay + 100}ms` }}
            />
            <div 
              className="widget-skeleton-shimmer h-10 w-24 rounded-lg"
              style={{ animationDelay: `${animationDelay + 150}ms` }}
            />
          </div>
        </div>
        
        {/* Network Visualization Area */}
        <div 
          className="widget-skeleton-shimmer rounded-lg flex-1 relative"
          style={{ 
            animationDelay: `${animationDelay + 200}ms`,
            minHeight: '350px'
          }}
        >
          {/* Simulate nodes */}
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="absolute widget-skeleton-shimmer rounded-full"
              style={{
                width: '60px',
                height: '60px',
                top: `${20 + (index * 15)}%`,
                left: `${15 + (index * 15)}%`,
                animationDelay: `${animationDelay + 400 + (index * 100)}ms`
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Grid layout skeleton
  if (variant === 'grid') {
    return (
      <div className="space-y-4 p-4" style={{ height: height || INSIGHT_SIZING.heights.standard }}>
        {/* Controls Row Skeleton */}
        <div className="flex justify-between items-center gap-4">
          <div 
            className="widget-skeleton-shimmer h-10 w-48 rounded-lg"
            style={{ animationDelay: `${animationDelay}ms` }}
          />
          <div 
            className="widget-skeleton-shimmer h-10 w-32 rounded-lg"
            style={{ animationDelay: `${animationDelay + 100}ms` }}
          />
        </div>
        
        {/* Grid Items Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="widget-skeleton-shimmer h-24 rounded-lg"
              style={{ animationDelay: `${animationDelay + 200 + (index * 50)}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Compact skeleton for smaller insights
  if (variant === 'compact') {
    return (
      <div className="space-y-3 p-4" style={{ height: height || INSIGHT_SIZING.heights.compact }}>
        {/* Header Skeleton */}
        <div 
          className="widget-skeleton-shimmer h-8 w-3/4 rounded"
          style={{ animationDelay: `${animationDelay}ms` }}
        />
        
        {/* Content Areas */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="widget-skeleton-shimmer h-12 rounded-lg"
              style={{ animationDelay: `${animationDelay + 100 + (index * 75)}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Default fallback
  return (
    <div className="space-y-4 p-4" style={{ height: height || INSIGHT_SIZING.heights.standard }}>
      <div 
        className="widget-skeleton-shimmer h-full rounded-lg"
        style={{ animationDelay: `${animationDelay}ms` }}
      />
    </div>
  );
}