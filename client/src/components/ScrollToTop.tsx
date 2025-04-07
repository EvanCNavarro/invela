import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * This component scrolls the window to the top when the path changes.
 * Place it near the top of your application, inside your router.
 */
export function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Scroll to top when location changes
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}