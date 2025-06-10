/**
 * ========================================
 * Insight Loading Skeleton - Standardized Animation Component
 * ========================================
 * 
 * Consistent loading skeleton for all insight components with staggered
 * shimmer animations matching the QuickActions and CompanySnapshot patterns.
 * 
 * @module components/insights/InsightLoadingSkeleton
 * @version 1.0.0
 * @since 2025-06-09
 */

import React from 'react';
import { INSIGHT_ANIMATIONS, INSIGHT_SIZING } from '@/lib/insightDesignSystem';

interface InsightLoadingSkeletonProps {
  /** Animation delay for staggered entrance effects */
  animationDelay?: number;
  /** Skeleton variant based on insight type */
  variant?: 'chart' | 'grid' | 'network' | 'overview';
  /** Custom height for the skeleton */
  height?: string;
}

export function InsightLoadingSkeleton({ 
  animationDelay = 0, 
  variant = 'chart',
  height = INSIGHT_SIZING.heights.standard
}: InsightLoadingSkeletonProps) {

  const renderChartSkeleton = () => (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex gap-3">
        <div 
          className="widget-skeleton-shimmer h-10 w-48 rounded-lg"
          style={{ animationDelay: `${animationDelay}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-10 w-32 rounded-lg"
          style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.item}ms` }}
        />
      </div>
      
      {/* Main Chart Area */}
      <div 
        className={`widget-skeleton-shimmer ${height} rounded-lg`}
        style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section}ms` }}
      />
    </div>
  );

  const renderGridSkeleton = () => (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div 
          className="widget-skeleton-shimmer h-8 w-40 rounded-lg"
          style={{ animationDelay: `${animationDelay}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-8 w-24 rounded-lg"
          style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.item}ms` }}
        />
      </div>
      
      {/* Grid Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`grid-skeleton-${index}`}
            className="widget-skeleton-shimmer h-24 rounded-lg"
            style={{ 
              animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section + (index * INSIGHT_ANIMATIONS.stagger.item)}ms` 
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderNetworkSkeleton = () => (
    <div className="space-y-4">
      {/* Network Controls */}
      <div className="flex gap-3 mb-4">
        <div 
          className="widget-skeleton-shimmer h-10 w-48 rounded-lg"
          style={{ animationDelay: `${animationDelay}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-10 w-32 rounded-lg"
          style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.item}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-10 w-28 rounded-lg"
          style={{ animationDelay: `${animationDelay + (INSIGHT_ANIMATIONS.stagger.item * 2)}ms` }}
        />
      </div>
      
      {/* Network Visualization Area */}
      <div 
        className={`widget-skeleton-shimmer ${height} rounded-lg relative overflow-hidden`}
        style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section}ms` }}
      >
        {/* Simulate network nodes */}
        <div className="absolute inset-4 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-8 opacity-30">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`node-skeleton-${index}`}
                className="w-4 h-4 bg-blue-200 rounded-full"
                style={{ 
                  animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section + (index * 50)}ms` 
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverviewSkeleton = () => (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`stat-skeleton-${index}`}
            className="widget-skeleton-shimmer h-20 rounded-lg"
            style={{ 
              animationDelay: `${animationDelay + (index * INSIGHT_ANIMATIONS.stagger.item)}ms` 
            }}
          />
        ))}
      </div>
      
      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div 
          className="widget-skeleton-shimmer h-64 rounded-lg"
          style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section}ms` }}
        />
        <div 
          className="widget-skeleton-shimmer h-64 rounded-lg"
          style={{ animationDelay: `${animationDelay + INSIGHT_ANIMATIONS.stagger.section + INSIGHT_ANIMATIONS.stagger.item}ms` }}
        />
      </div>
      
      {/* Full Width Chart */}
      <div 
        className="widget-skeleton-shimmer h-48 rounded-lg"
        style={{ animationDelay: `${animationDelay + (INSIGHT_ANIMATIONS.stagger.section * 2)}ms` }}
      />
    </div>
  );

  const skeletonVariants = {
    chart: renderChartSkeleton,
    grid: renderGridSkeleton,
    network: renderNetworkSkeleton,
    overview: renderOverviewSkeleton
  };

  return (
    <div className="p-6 space-y-4">
      {skeletonVariants[variant]()}
    </div>
  );
}