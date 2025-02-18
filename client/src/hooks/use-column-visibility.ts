import { useState, useEffect } from 'react';

// Define breakpoints
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useColumnVisibility(sidebarWidth: number) {
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

  return {
    showSize: availableWidth >= BREAKPOINTS.sm,
    showCreatedAt: availableWidth >= BREAKPOINTS.md,
    showStatus: availableWidth >= BREAKPOINTS.lg,
    showActions: true, // Always show actions
  };
}
