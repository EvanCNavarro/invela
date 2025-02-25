import { useState, useEffect, useMemo } from 'react';
import type { Column } from '@/components/ui/table';

// Define breakpoints with more precise values for better responsive design
const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export type VisibleColumns = Column<any>[];

/**
 * Hook to manage column visibility based on screen width and sidebar state
 * @param sidebarWidth - Width of the sidebar in pixels
 * @param minimalColumns - Optional array of column IDs that should always be visible
 * @returns Array of visible columns based on available screen space
 */
export function useColumnVisibility(
  sidebarWidth: number,
  minimalColumns: string[] = ['select', 'name', 'actions']
): VisibleColumns {
  // Track window dimensions
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Handle window resize with debounce for performance
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100); // 100ms debounce
    };

    // Add event listener with passive option for better performance
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Calculate available space after sidebar
  const availableWidth = windowDimensions.width - sidebarWidth;

  // Define all possible columns
  const allColumns: Column<any>[] = useMemo(() => [
    {
      id: 'select',
      header: 'select',
      cell: () => null,
    },
    {
      id: 'name',
      header: 'Name',
      cell: () => null,
      sortable: true
    },
    {
      id: 'size',
      header: 'Size',
      cell: () => null,
      sortable: true
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: () => null,
      sortable: true
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => null,
      sortable: true
    },
    {
      id: 'actions',
      header: '',
      cell: () => null
    }
  ], []);

  // Determine visible columns based on available width
  return useMemo(() => {
    // Handle edge case: extremely small screens
    if (availableWidth < BREAKPOINTS.xs) {
      return allColumns.filter(column => 
        minimalColumns.includes(column.id)
      );
    }
    
    return allColumns.filter(column => {
      // Always include minimal columns
      if (minimalColumns.includes(column.id)) {
        return true;
      }
      
      // Conditionally include other columns based on available width
      switch (column.id) {
        case 'size':
          return availableWidth >= BREAKPOINTS.sm;
        case 'createdAt':
          return availableWidth >= BREAKPOINTS.md;
        case 'status':
          return availableWidth >= BREAKPOINTS.lg;
        default:
          return false;
      }
    });
  }, [availableWidth, allColumns, minimalColumns]);
}