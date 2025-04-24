import { useEffect } from 'react';

/**
 * Custom hook to prevent automatic focusing on elements in a component.
 * Use this in components that have inputs that might be automatically focused
 * when the page loads or refreshes.
 * 
 * @param enabled - Whether the focus prevention is enabled (default: true)
 * @param delay - Delay in ms after which to prevent focus (default: 100)
 */
export function usePreventFocus(enabled = true, delay = 100) {
  useEffect(() => {
    if (!enabled) return;
    
    // Function to remove focus from active element
    const preventFocus = () => {
      if (document.activeElement instanceof HTMLElement && 
          document.activeElement !== document.body) {
        console.log('[usePreventFocus] Removing focus from', document.activeElement);
        document.activeElement.blur();
      }
    };
    
    // Apply right away
    preventFocus();
    
    // And after a small delay to catch any delayed focusing
    const timeoutId = setTimeout(preventFocus, delay);
    
    // Clean up
    return () => clearTimeout(timeoutId);
  }, [enabled, delay]);
}