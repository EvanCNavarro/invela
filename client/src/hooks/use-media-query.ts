import { useState, useEffect } from 'react';

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Default to false for SSR
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') {
      return;
    }
    
    // Create media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Define listener with proper type
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } 
    // Fallback for older browsers
    else {
      // @ts-ignore - For older browsers that use the deprecated addListener
      mediaQuery.addListener(handleChange);
      return () => {
        // @ts-ignore - For older browsers that use the deprecated removeListener
        mediaQuery.removeListener(handleChange);
      };
    }
  }, [query]);
  
  return matches;
} 