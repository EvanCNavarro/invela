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
import { Zap, BookOpen, ExternalLink, ArrowRight, ArrowUpRight, Activity, SquareArrowOutUpRight, Maximize2, ChevronUp, ChevronDown } from "lucide-react";

// Modal components
import ChangelogModal from "@/components/modals/ChangelogModal";
// Removed Storybook modal import

// Animation framework
import { motion, AnimatePresence } from "framer-motion";

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
  const [, setLocation] = useLocation();
  
  // 🚀 PHASE 1: Core Collapsible State Management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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
   * 🚀 PHASE 1: Toggle Collapsible State Handler
   * Handles the show/hide functionality with animation state management
   */
  const handleToggleCollapse = (): void => {
    try {
      // Prevent multiple rapid clicks during animation
      if (isAnimating) {
        logger.debug('Toggle blocked - animation in progress', {
          isAnimating,
          currentState: isCollapsed
        });
        return;
      }

      setIsAnimating(true);
      const newCollapsedState = !isCollapsed;
      
      logger.info('LoginDemoHeader collapse toggle', {
        previousState: isCollapsed,
        newState: newCollapsedState,
        timestamp: new Date().toISOString(),
        action: 'header_collapse_toggle'
      });

      setIsCollapsed(newCollapsedState);

      // Reset animation state after transition completes
      setTimeout(() => {
        setIsAnimating(false);
        logger.debug('Animation state reset', {
          finalState: newCollapsedState
        });
      }, 350); // Slightly longer than animation duration for safety

    } catch (error) {
      logger.error('Error toggling collapse state', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Reset states on error to prevent UI lock
      setIsAnimating(false);
    }
  };

  // ========================================
  // ANIMATION CONSTANTS
  // ========================================

  /**
   * 🚀 PHASE 2: Animation Configuration
   * Industry-standard animation timing and easing curves
   */
  const ANIMATION_CONFIG = {
    duration: 0.3,
    ease: [0.4, 0.0, 0.2, 1], // Material Design easing
    expandedHeight: 'auto',
    collapsedHeight: '16px'
  } as const;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={cn(
      "w-full relative", // Added relative for tab positioning
      className
    )}>
      {/* 🚀 PHASE 3: External Toggle Button - Above Container */}
      <div className="flex justify-end mb-2">
        <motion.button
          onClick={handleToggleCollapse}
          className="p-3 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-all duration-200 group rounded-md border border-gray-200 flex items-center space-x-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{
            duration: 0.2,
            ease: "easeInOut"
          }}
          aria-label={isCollapsed ? "Show header actions" : "Hide header actions"}
        >
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
              <motion.div
                animate={{ 
                  rotate: isCollapsed ? 180 : 0 
                }}
                transition={{
                  duration: ANIMATION_CONFIG.duration,
                  ease: ANIMATION_CONFIG.ease
                }}
              >
                <ChevronUp className="w-4 h-4 text-gray-600" />
              </motion.div>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {isCollapsed ? "Show Actions" : "Hide Actions"}
              </h3>
            </div>
          </div>
        </motion.button>
      </div>

      {/* 🚀 PHASE 2: Animated Container with Motion */}
      <motion.div 
        className="bg-gray-50 rounded-t-lg border-b border-gray-200 overflow-hidden"
        initial={false}
        animate={{
          height: isCollapsed ? ANIMATION_CONFIG.collapsedHeight : ANIMATION_CONFIG.expandedHeight
        }}
        transition={{
          duration: ANIMATION_CONFIG.duration,
          ease: ANIMATION_CONFIG.ease
        }}
        style={{
          // Ensure minimum height for collapsed state
          minHeight: isCollapsed ? ANIMATION_CONFIG.collapsedHeight : 'auto'
        }}
      >

        {/* 🚀 PHASE 2: Button Content with Conditional Rendering */}
        <div className="p-1">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                key="buttons-content"
                className="grid grid-cols-1 md:grid-cols-3 gap-1"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: ANIMATION_CONFIG.duration * 0.8,
                  ease: ANIMATION_CONFIG.ease
                }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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