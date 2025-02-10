import { useEffect, useState } from 'react';

export type ColumnId = 'name' | 'size' | 'status' | 'createdAt' | 'version' | 'actions';

interface BreakpointConfig {
  breakpoint: number;
  columns: ColumnId[];
}

const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { breakpoint: 0, columns: ['name', 'actions'] }, // Mobile
  { breakpoint: 640, columns: ['name', 'size', 'actions'] }, // sm
  { breakpoint: 768, columns: ['name', 'size', 'status', 'actions'] }, // md
  { breakpoint: 1024, columns: ['name', 'size', 'status', 'createdAt', 'actions'] }, // lg
  { breakpoint: 1280, columns: ['name', 'size', 'status', 'createdAt', 'version', 'actions'] }, // xl
];

export function useColumnVisibility(
  sidebarWidth: number = 0,
  customBreakpoints: BreakpointConfig[] = DEFAULT_BREAKPOINTS
) {
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(['name', 'actions']));

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = window.innerWidth - sidebarWidth;
      
      // Find the highest matching breakpoint
      const matchingConfig = [...customBreakpoints]
        .reverse()
        .find(config => availableWidth >= config.breakpoint);

      if (matchingConfig) {
        setVisibleColumns(new Set(matchingConfig.columns));
      }
    };

    // Initial calculation
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidth, customBreakpoints]);

  return visibleColumns;
}
