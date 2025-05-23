/**
 * Table Column Visibility Management Hook - Dynamic responsive column control
 * 
 * Provides React hook for managing table column visibility based on viewport
 * width and sidebar dimensions. Implements responsive design patterns for
 * data tables with automatic column hiding/showing based on available space
 * to ensure optimal user experience across device sizes.
 * 
 * Features:
 * - Dynamic viewport width monitoring
 * - Sidebar-aware space calculations
 * - Responsive breakpoint-based column management
 * - TypeScript-safe column configuration
 */

// ========================================
// IMPORTS
// ========================================

// React core hooks for state and lifecycle management
import { useState, useEffect } from 'react';

// Internal type definitions for table components
import type { Column } from '@/components/ui/table';

// ========================================
// CONSTANTS
// ========================================

/**
 * Responsive design breakpoints for column visibility control
 * Standard breakpoint values aligned with Tailwind CSS conventions
 */
const RESPONSIVE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Visible columns configuration type for table rendering
 * Provides type safety for dynamic column visibility management
 */
export type VisibleColumns = Column<unknown>[];

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * React hook for responsive table column visibility management
 * 
 * Calculates available viewport space after accounting for sidebar width
 * and dynamically shows/hides table columns based on responsive breakpoints.
 * Ensures optimal table display across different screen sizes and sidebar states.
 * 
 * @param sidebarWidth - Current sidebar width in pixels
 * @returns Array of visible column configurations for table rendering
 */
export function useColumnVisibility(sidebarWidth: number): VisibleColumns {
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

  useEffect(() => {
    /**
     * Handle window resize events for responsive column updates
     * Updates window width state when viewport size changes
     */
    const handleViewportResize = (): void => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleViewportResize);
    
    // Cleanup function for memory management
    return (): void => {
      window.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  // Calculate remaining space after sidebar allocation
  const availableTableWidth = windowWidth - sidebarWidth;

  // Generate responsive column configuration based on available space
  return [
    {
      id: 'select',
      header: 'select',
      cell: (): null => null
    },
    {
      id: 'name',
      header: 'Name',
      cell: (): null => null,
      sortable: true
    },
    ...(availableTableWidth >= RESPONSIVE_BREAKPOINTS.sm ? [{
      id: 'size',
      header: 'Size',
      cell: (): null => null,
      sortable: true
    }] : []),
    ...(availableTableWidth >= RESPONSIVE_BREAKPOINTS.md ? [{
      id: 'createdAt',
      header: 'Created',
      cell: (): null => null,
      sortable: true
    }] : []),
    ...(availableTableWidth >= RESPONSIVE_BREAKPOINTS.lg ? [{
      id: 'status',
      header: 'Status',
      cell: (): null => null,
      sortable: true
    }] : []),
    {
      id: 'actions',
      header: '',
      cell: (): null => null
    }
  ];
}