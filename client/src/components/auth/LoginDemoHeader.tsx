/**
 * ========================================
 * Login Demo Header Component
 * ========================================
 * 
 * Professional header component for the login page that provides access to
 * development tools and demo functionality. Features a two-box layout with
 * consistent purple theming matching the demo autofill button aesthetic.
 * 
 * Key Features:
 * - Storybook component library access
 * - Demo login functionality (future expansion)
 * - Purple theme consistency with existing demo components
 * - Responsive design for all device sizes
 * - Professional floating card aesthetic
 * 
 * Dependencies:
 * - Lucide React: Professional iconography
 * - Tailwind CSS: Utility-first styling
 * - Logger utility: Development and debugging support
 * 
 * @module LoginDemoHeader
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// React core functionality
import { useState } from "react";

// UI components and utilities
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Professional iconography
import { Zap, BookOpen, ExternalLink } from "lucide-react";

// Development utilities
import getLogger from '@/utils/logger';

// ========================================
// LOGGER INITIALIZATION
// ========================================

const logger = getLogger('LoginDemoHeader');

// ========================================
// TYPES & INTERFACES
// ========================================

interface LoginDemoHeaderProps {
  className?: string;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Design system colors matching the existing demo autofill button
 * These colors ensure visual consistency across the application
 */
const DEMO_THEME_STYLES = {
  container: "bg-purple-50 border-purple-200 text-purple-700",
  hover: "hover:bg-purple-100 hover:text-purple-800",
  border: "border-purple-200",
  focus: "focus:ring-purple-500 focus:border-purple-500"
} as const;

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * LoginDemoHeader Component
 * 
 * Renders a professional header above the login form with development tools
 * access and demo functionality. Uses the established purple color scheme
 * for consistency with existing demo components.
 */
export function LoginDemoHeader({ className }: LoginDemoHeaderProps) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [isStorybookLoading, setIsStorybookLoading] = useState(false);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle Storybook access
   * Opens the component library in a new tab for development use
   */
  const handleStorybookAccess = (): void => {
    logger.info('Accessing Storybook component library', {
      timestamp: new Date().toISOString(),
      action: 'storybook_access'
    });

    setIsStorybookLoading(true);

    // Check if we're in development mode first
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // In development, try to open localhost Storybook
      const storybookUrl = 'http://localhost:6006';
      logger.info('Opening development Storybook', { url: storybookUrl });
      window.open(storybookUrl, '_blank');
    } else {
      // In production, use the subdomain
      const currentDomain = window.location.hostname;
      const storybookSubdomain = `https://storybook.${currentDomain}`;
      logger.info('Opening production Storybook subdomain', { url: storybookSubdomain });
      window.open(storybookSubdomain, '_blank');
    }

    // Reset loading state after a brief delay
    setTimeout(() => {
      setIsStorybookLoading(false);
    }, 1000);
  };

  /**
   * Handle demo login preparation
   * Placeholder for future demo login functionality
   */
  const handleDemoLogin = (): void => {
    logger.info('Demo login accessed', {
      timestamp: new Date().toISOString(),
      action: 'demo_login_access'
    });

    // Future implementation: Demo login functionality
    console.log('Demo login functionality - coming soon!');
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={cn(
      "w-full max-w-2xl mx-auto mb-8",
      className
    )}>
      {/* Main container with professional styling */}
      <div className={cn(
        "rounded-lg border-2 p-1 shadow-sm",
        DEMO_THEME_STYLES.container,
        DEMO_THEME_STYLES.border
      )}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          
          {/* Left Box: Storybook Access */}
          <div className={cn(
            "p-6 rounded-md border transition-all duration-200",
            "bg-white/50 border-purple-100",
            DEMO_THEME_STYLES.hover,
            "cursor-pointer group"
          )}
          onClick={handleStorybookAccess}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-md transition-colors",
                  "bg-purple-100 group-hover:bg-purple-200"
                )}>
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800">
                    Design System
                  </h3>
                  <p className="text-sm text-purple-600">
                    Component Library
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <p className="text-sm text-purple-600 mb-4">
              Explore our comprehensive UI component library with interactive examples and documentation.
            </p>
            
            <Button
              variant="outline"
              size="sm"
              disabled={isStorybookLoading}
              className={cn(
                "w-full border-purple-200 text-purple-700",
                "hover:bg-purple-100 hover:text-purple-800",
                "disabled:opacity-50"
              )}
            >
              {isStorybookLoading ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-pulse" />
                  Opening...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Components
                </>
              )}
            </Button>
          </div>

          {/* Right Box: Demo Login */}
          <div className={cn(
            "p-6 rounded-md border transition-all duration-200",
            "bg-white/50 border-purple-100",
            DEMO_THEME_STYLES.hover,
            "cursor-pointer group"
          )}
          onClick={handleDemoLogin}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-md transition-colors",
                  "bg-purple-100 group-hover:bg-purple-200"
                )}>
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800">
                    Demo Access
                  </h3>
                  <p className="text-sm text-purple-600">
                    Quick Demo Login
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-purple-600 mb-4">
              Quick access to demo functionality and testing features for development.
            </p>
            
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full border-purple-200 text-purple-700",
                "hover:bg-purple-100 hover:text-purple-800"
              )}
            >
              <Zap className="mr-2 h-4 w-4" />
              Demo Login
            </Button>
          </div>
        </div>
      </div>
      
      {/* Subtle helper text */}
      <p className="text-center text-xs text-purple-500 mt-3">
        Development tools for testing and component exploration
      </p>
    </div>
  );
}

// ========================================
// EXPORTS
// ========================================

export default LoginDemoHeader;