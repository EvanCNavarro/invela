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

// Navigation
import { useLocation } from "wouter";

// UI components and utilities
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Professional iconography
import { Zap, BookOpen, ExternalLink, ArrowRight, ArrowUpRight, Activity, SquareArrowOutUpRight, Maximize2, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

// Modal components
import ChangelogModal from "@/components/modals/ChangelogModal";
// Removed Storybook modal import

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
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setLocation] = useLocation();

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle Storybook access
   * Navigates to the dedicated Storybook page within the application
   */
  const handleStorybookAccess = (): void => {
    logger.info('Accessing Storybook component library', {
      timestamp: new Date().toISOString(),
      action: 'storybook_access'
    });

    setIsStorybookLoading(true);

    // Open React-based component library
    const componentLibraryUrl = '/component-library';
    logger.info('Opening React component library', { url: componentLibraryUrl });
    window.open(componentLibraryUrl, '_blank', 'noopener,noreferrer');

    // Reset loading state after a brief delay
    setTimeout(() => {
      setIsStorybookLoading(false);
    }, 1000);
  };

  /**
   * Handle changelog modal access
   * Opens changelog modal to show recent feature updates
   */
  const handleChangelogAccess = (): void => {
    logger.info('Changelog accessed', {
      timestamp: new Date().toISOString(),
      action: 'changelog_access'
    });

    setIsChangelogOpen(true);
  };

  /**
   * Handle demo login navigation
   * Navigates to the demo page for 3-step demo experience
   */
  const handleDemoLogin = (): void => {
    logger.info('Demo login accessed', {
      timestamp: new Date().toISOString(),
      action: 'demo_login_access'
    });

    // Navigate to demo page
    setLocation('/demo');
  };

  /**
   * Handle collapse/expand toggle
   * Toggles the visibility of the three action buttons with smooth animation
   */
  const handleToggleCollapse = (): void => {
    logger.info('LoginDemoHeader toggle', {
      timestamp: new Date().toISOString(),
      action: 'toggle_collapse',
      newState: !isCollapsed
    });

    setIsCollapsed(!isCollapsed);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={cn(
      "w-full",
      className
    )}>
      {/* Toggle Button */}
      <div className="bg-gray-100 rounded-t-lg border-b border-gray-200 px-4 py-2">
        <button
          onClick={handleToggleCollapse}
          className="flex items-center justify-center w-full text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 select-none user-select-none transition-all duration-200 group"
          style={{
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <div className="flex items-center space-x-2">
            {isCollapsed ? (
              <>
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">Show Development Tools</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium">Hide Development Tools</span>
              </>
            )}
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <ChevronUp className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
            )}
          </div>
        </button>
      </div>

      {/* Main container with collapsible content and smooth slide animation */}
      <div className={cn(
        "bg-gray-50 border-b border-gray-200 overflow-hidden p-1 transition-all duration-300 ease-in-out",
        isCollapsed ? "max-h-0 opacity-0 transform -translate-y-2" : "max-h-96 opacity-100 transform translate-y-0"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          
          {/* Left Button - Changelog Access */}
          <button
            onClick={handleChangelogAccess}
            className="p-3 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset transition-all duration-200 group rounded-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative w-7 h-7 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                  <Activity className="w-4 h-4 text-green-600" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-green-900">
                    View Changelog
                  </h3>
                </div>
              </div>
              <div className="flex items-center">
                <Maximize2 className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
          </button>

          {/* Middle Button - Storybook Access */}
          <button
            onClick={handleStorybookAccess}
            className="p-3 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset transition-all duration-200 group rounded-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-purple-900">
                    Component Library
                  </h3>
                </div>
              </div>
              <div className="flex items-center">
                <SquareArrowOutUpRight className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
          </button>

          {/* Right Button - Demo Access */}
          <button
            onClick={handleDemoLogin}
            className="p-3 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-all duration-200 group rounded-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Login to Demo Account
                  </h3>
                </div>
              </div>
              <div className="flex items-center">
                <ArrowRight className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal 
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />

      {/* Removed Storybook Modal - using direct component library access */}

    </div>
  );
}

// ========================================
// EXPORTS
// ========================================

export default LoginDemoHeader;