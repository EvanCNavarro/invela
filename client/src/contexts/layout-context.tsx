/**
 * ========================================
 * Layout Context Provider
 * ========================================
 * 
 * Application layout state management providing layout information
 * to deeply nested components without prop drilling. Tracks layout
 * measurements and positioning data for the enterprise platform.
 * 
 * @module contexts/layout-context
 * @version 1.0.0
 * @since 2025-05-23
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

/**
 * Layout Context Interface
 * 
 * Provides application layout information to deeply nested components
 * without prop drilling.
 * 
 * This context tracks:
 * - Content area element reference
 * - Navbar height
 * - Sidebar width
 * - Whether components should position relative to content
 */

interface LayoutContextType {
  // Reference to the main content container element
  contentRef: React.RefObject<HTMLElement>;
  
  // Layout measurements
  navbarHeight: number;
  sidebarWidth: number;
  
  // Flag to indicate if elements should position relative to content 
  positionRelativeToContent: boolean;
  
  // Set the content container reference
  setContentRef: (ref: React.RefObject<HTMLElement>) => void;
}

// Create the context with default values
const LayoutContext = createContext<LayoutContextType>({
  contentRef: { current: null },
  navbarHeight: 64, // Default navbar height in pixels
  sidebarWidth: 70, // Default sidebar width in pixels
  positionRelativeToContent: true,
  setContentRef: () => {}
});

// Hook to use the layout context
export const useLayout = () => useContext(LayoutContext);

// Provider component that wraps the application
export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create a ref for the content container
  const contentRef = useRef<HTMLElement>(null);
  
  // Measurements state
  const [navbarHeight, setNavbarHeight] = useState(64);
  const [sidebarWidth, setSidebarWidth] = useState(70);
  
  // Update layout measurements when the window resizes
  useEffect(() => {
    const updateLayoutMeasurements = () => {
      // Measure navbar height
      const navbar = document.querySelector('nav') || document.querySelector('header');
      if (navbar) {
        setNavbarHeight(navbar.getBoundingClientRect().height);
      }
      
      // Measure sidebar width
      const sidebar = document.querySelector('aside') || document.getElementById('sidebar');
      if (sidebar) {
        setSidebarWidth(sidebar.getBoundingClientRect().width);
      }
    };
    
    // Initial measurement
    updateLayoutMeasurements();
    
    // Add resize listener
    window.addEventListener('resize', updateLayoutMeasurements);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateLayoutMeasurements);
    };
  }, []);
  
  // Set the content ref
  const setContentRef = (ref: React.RefObject<HTMLElement>) => {
    if (ref && ref.current) {
      contentRef.current = ref.current;
    }
  };
  
  // Context value
  const value: LayoutContextType = {
    contentRef,
    navbarHeight,
    sidebarWidth,
    positionRelativeToContent: true,
    setContentRef
  };
  
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export default LayoutContext;