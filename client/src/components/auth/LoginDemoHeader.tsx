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
      "w-full max-w-[980px] mx-auto mb-2",
      className
    )}>
      {/* Main container with professional styling */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          {/* Left Button - Storybook Access */}
          <button
            onClick={handleStorybookAccess}
            disabled={isStorybookLoading}
            className="p-3 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                <BookOpen className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-purple-900">
                  {isStorybookLoading ? 'Opening...' : 'Component Library'}
                </h3>
              </div>
              {isStorybookLoading && (
                <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              )}
            </div>
          </button>

          {/* Right Button - Demo Access */}
          <button
            onClick={handleDemoLogin}
            className="p-3 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-slate-200 group-hover:bg-slate-300 rounded-lg flex items-center justify-center transition-colors">
                <Zap className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-slate-900">
                  Demo Access
                </h3>
              </div>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}

// ========================================
// EXPORTS
// ========================================

export default LoginDemoHeader;