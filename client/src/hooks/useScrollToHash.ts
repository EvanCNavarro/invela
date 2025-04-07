import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

/**
 * Custom hook to scroll to the element matching the current URL hash
 * Use this hook in page components to enable automatic scrolling to anchor sections
 */
export function useScrollToHash() {
  const [location] = useLocation();
  
  const scrollToHash = useCallback(() => {
    // Extract the hash from the URL
    const hash = window.location.hash;
    
    if (hash) {
      // Remove the '#' character from the hash
      const targetId = hash.substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Add a small delay to ensure the page is fully rendered
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);

  // Run the effect when location changes or on initial load
  useEffect(() => {
    // Scroll to hash on initial render
    scrollToHash();
    
    // Add event listener for hashchange event (for manual hash changes)
    window.addEventListener('hashchange', scrollToHash);
    
    return () => {
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, [location, scrollToHash]);
}

export default useScrollToHash;