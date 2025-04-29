import React, { createContext, useContext, useState, useEffect } from 'react';

type AccessibilityMode = 'standard' | 'high-contrast';

interface AccessibilityContextType {
  mode: AccessibilityMode;
  setMode: (mode: AccessibilityMode) => void;
  isHighContrast: boolean;
  isScreenReaderOptimized: boolean;
  toggleHighContrast: () => void;
  toggleScreenReaderOptimization: () => void;
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Load settings from localStorage on initial render
  const [mode, setMode] = useState<AccessibilityMode>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessibilityMode') as AccessibilityMode || 'standard';
    }
    return 'standard';
  });
  
  const [isScreenReaderOptimized, setIsScreenReaderOptimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('screenReaderOptimized') === 'true';
    }
    return false;
  });
  
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('fontSize');
      return savedFontSize ? parseInt(savedFontSize, 10) : 16;
    }
    return 16;
  });
  
  // Derived state
  const isHighContrast = mode === 'high-contrast';
  
  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibilityMode', mode);
      localStorage.setItem('screenReaderOptimized', String(isScreenReaderOptimized));
      localStorage.setItem('fontSize', String(fontSize));
      
      // Apply CSS variables for high contrast mode
      if (isHighContrast) {
        document.documentElement.classList.add('high-contrast-mode');
      } else {
        document.documentElement.classList.remove('high-contrast-mode');
      }
      
      // Apply CSS variables for screen reader optimization
      if (isScreenReaderOptimized) {
        document.documentElement.classList.add('screen-reader-optimized');
      } else {
        document.documentElement.classList.remove('screen-reader-optimized');
      }
      
      // Apply font size
      document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    }
  }, [mode, isScreenReaderOptimized, fontSize, isHighContrast]);
  
  // Toggle functions
  const toggleHighContrast = () => {
    setMode(prev => prev === 'standard' ? 'high-contrast' : 'standard');
  };
  
  const toggleScreenReaderOptimization = () => {
    setIsScreenReaderOptimized(prev => !prev);
  };
  
  // Font size handlers
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 28)); // Max size: 28px
  };
  
  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 12)); // Min size: 12px
  };
  
  const resetFontSize = () => {
    setFontSize(16); // Default size
  };
  
  return (
    <AccessibilityContext.Provider
      value={{
        mode,
        setMode,
        isHighContrast,
        isScreenReaderOptimized,
        toggleHighContrast,
        toggleScreenReaderOptimization,
        fontSize,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
