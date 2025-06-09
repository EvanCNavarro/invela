/**
 * ========================================
 * Insight Design System - Comprehensive Standardization
 * ========================================
 * 
 * Unified design system for all insights components ensuring consistent
 * colors, animations, loading states, and interaction patterns across
 * the entire platform.
 * 
 * Key Features:
 * - Standardized color palette for all categories and risk levels
 * - Consistent loading skeleton animations with staggered delays
 * - Unified dropdown and time selector components
 * - Homogeneous interaction patterns and hover states
 * 
 * @module lib/insightDesignSystem
 * @version 1.0.0
 * @since 2025-06-09
 */

// ========================================
// STANDARDIZED COLOR PALETTE
// ========================================

export const INSIGHT_COLORS = {
  // Company Category Colors (consistent across all visualizations)
  categories: {
    Invela: {
      primary: '#3B82F6',    // Blue-500
      secondary: '#1E40AF',  // Blue-800
      light: '#DBEAFE',      // Blue-100
      gradient: 'from-blue-500 to-indigo-600'
    },
    Bank: {
      primary: '#A855F7',    // Purple-500
      secondary: '#6B21A8',  // Purple-800
      light: '#F3E8FF',      // Purple-100
      gradient: 'from-purple-500 to-violet-600'
    },
    FinTech: {
      primary: '#10B981',    // Emerald-500
      secondary: '#047857',  // Emerald-700
      light: '#D1FAE5',      // Emerald-100
      gradient: 'from-emerald-500 to-green-600'
    }
  },

  // Risk Level Colors (standardized across all risk visualizations)
  risk: {
    stable: {
      primary: '#3B82F6',    // Blue-500
      background: '#EFF6FF', // Blue-50
      text: 'text-blue-600'
    },
    low: {
      primary: '#10B981',    // Emerald-500
      background: '#ECFDF5', // Emerald-50
      text: 'text-emerald-600'
    },
    medium: {
      primary: '#F59E0B',    // Amber-500
      background: '#FFFBEB', // Amber-50
      text: 'text-amber-600'
    },
    high: {
      primary: '#EF4444',    // Red-500
      background: '#FEF2F2', // Red-50
      text: 'text-red-600'
    },
    critical: {
      primary: '#DC2626',    // Red-600
      background: '#FEF2F2', // Red-50
      text: 'text-red-700'
    }
  },

  // Revenue Tier Colors (consistent sizing visualization)
  revenue: {
    small: {
      primary: '#059669',    // Emerald-600
      secondary: '#047857',  // Emerald-700
      background: '#D1FAE5'  // Emerald-100
    },
    medium: {
      primary: '#047857',    // Emerald-700
      secondary: '#065F46',  // Emerald-800
      background: '#A7F3D0'  // Emerald-200
    },
    large: {
      primary: '#065F46',    // Emerald-800
      secondary: '#064E3B',  // Emerald-900
      background: '#6EE7B7'  // Emerald-300
    },
    xlarge: {
      primary: '#064E3B',    // Emerald-900
      secondary: '#022C22',  // Emerald-950
      background: '#34D399'  // Emerald-400
    }
  },

  // Accreditation Status Colors
  accreditation: {
    APPROVED: {
      primary: '#10B981',    // Emerald-500
      background: '#ECFDF5', // Emerald-50
      text: 'text-emerald-600'
    },
    PENDING: {
      primary: '#F59E0B',    // Amber-500
      background: '#FFFBEB', // Amber-50
      text: 'text-amber-600'
    },
    REJECTED: {
      primary: '#EF4444',    // Red-500
      background: '#FEF2F2', // Red-50
      text: 'text-red-600'
    }
  }
};

// ========================================
// ANIMATION CONSTANTS
// ========================================

export const INSIGHT_ANIMATIONS = {
  // Loading skeleton stagger delays (in milliseconds)
  stagger: {
    base: 0,
    item: 100,
    section: 200,
    widget: 300
  },

  // Animation durations
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },

  // Entrance animation classes
  classes: {
    fadeIn: 'widget-entrance-animation',
    shimmer: 'widget-skeleton-shimmer',
    staggered: 'widget-entrance-animation'
  }
};

// ========================================
// COMPONENT SIZING STANDARDS
// ========================================

export const INSIGHT_SIZING = {
  // Standard widget heights
  heights: {
    compact: 'h-[300px]',
    standard: 'h-[400px]',
    tall: 'h-[500px]',
    extra: 'h-[600px]'
  },

  // Loading skeleton heights
  skeleton: {
    header: 'h-12',
    metric: 'h-16',
    chart: 'h-64',
    grid: 'h-20'
  },

  // Icon sizes
  icons: {
    small: 'h-4 w-4',
    standard: 'h-5 w-5',
    large: 'h-6 w-6'
  }
};

// ========================================
// STANDARDIZED DROPDOWN OPTIONS
// ========================================

export const INSIGHT_OPTIONS = {
  // Time selector options (consistent across all insights)
  timeframes: [
    { value: '1day', label: '1 Day' },
    { value: '30days', label: '30 Days' },
    { value: '1year', label: '1 Year' }
  ],

  // View mode options for network visualizations
  viewModes: [
    { value: 'companies', label: 'Companies' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'clusters', label: 'Clusters' }
  ]
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get consistent color for company category
 */
export const getCategoryColor = (category: string): string => {
  const normalizedCategory = category as keyof typeof INSIGHT_COLORS.categories;
  return INSIGHT_COLORS.categories[normalizedCategory]?.primary || INSIGHT_COLORS.categories.FinTech.primary;
};

/**
 * Get consistent color for risk level
 */
export const getRiskColor = (riskScore: number): string => {
  if (riskScore >= 70) return INSIGHT_COLORS.risk.critical.primary;
  if (riskScore >= 50) return INSIGHT_COLORS.risk.high.primary;
  if (riskScore >= 35) return INSIGHT_COLORS.risk.medium.primary;
  if (riskScore > 0) return INSIGHT_COLORS.risk.low.primary;
  return INSIGHT_COLORS.risk.stable.primary;
};

/**
 * Get consistent color for revenue tier
 */
export const getRevenueTierColor = (tier: string): string => {
  const normalizedTier = tier as keyof typeof INSIGHT_COLORS.revenue;
  return INSIGHT_COLORS.revenue[normalizedTier]?.primary || INSIGHT_COLORS.revenue.small.primary;
};

/**
 * Get consistent color for accreditation status
 */
export const getAccreditationColor = (status: string): string => {
  const normalizedStatus = status as keyof typeof INSIGHT_COLORS.accreditation;
  return INSIGHT_COLORS.accreditation[normalizedStatus]?.primary || INSIGHT_COLORS.accreditation.PENDING.primary;
};

/**
 * Generate staggered animation delay
 */
export const getStaggeredDelay = (index: number, baseDelay = 0): number => {
  return baseDelay + (index * INSIGHT_ANIMATIONS.stagger.item);
};

/**
 * Get responsive grid classes for different screen sizes
 */
export const getResponsiveGrid = (columns: number): string => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };
  
  return `grid ${gridClasses[columns as keyof typeof gridClasses] || gridClasses[2]} gap-3`;
};