import { useState, useEffect } from 'react';
import type { Column } from '@/components/ui/table';

// Define breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export type VisibleColumns = Column<any>[];

export function useColumnVisibility(sidebarWidth: number): VisibleColumns {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate available space after sidebar
  const availableWidth = windowWidth - sidebarWidth;

  return [
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
    ...(availableWidth >= BREAKPOINTS.sm ? [{
      id: 'size',
      header: 'Size',
      cell: () => null,
      sortable: true
    }] : []),
    ...(availableWidth >= BREAKPOINTS.md ? [{
      id: 'createdAt',
      header: 'Created',
      cell: () => null,
      sortable: true
    }] : []),
    ...(availableWidth >= BREAKPOINTS.lg ? [{
      id: 'status',
      header: 'Status',
      cell: () => null,
      sortable: true
    }] : []),
    {
      id: 'actions',
      header: '',
      cell: () => null
    }
  ];
}