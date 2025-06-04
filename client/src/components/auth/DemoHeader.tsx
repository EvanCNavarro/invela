/**
 * ========================================
 * Demo Header Component
 * ========================================
 * 
 * Header component for the demo page that provides a "Back to Login" button
 * styled to match the changelog button aesthetic with greyed out skeleton design.
 * 
 * @module components/auth/DemoHeader
 * @version 1.0.0
 * @since 2025-05-24
 */

import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import getLogger from '@/utils/logger';

const logger = getLogger('DemoHeader');

// ========================================
// TYPE DEFINITIONS
// ========================================

interface DemoHeaderProps {
  className?: string;
}

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * DemoHeader Component
 * 
 * Renders a header for the demo page with a "Back to Login" button
 * styled to match the existing changelog button design.
 */
export function DemoHeader({ className }: DemoHeaderProps) {
  const [, setLocation] = useLocation();

  /**
   * Handle back to login navigation
   */
  const handleBackToLogin = (): void => {
    logger.info('Returning to login page', {
      timestamp: new Date().toISOString(),
      action: 'back_to_login'
    });

    setLocation('/login');
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Main container with professional styling matching LoginDemoHeader */}
      <div className="bg-gray-100 rounded-t-lg overflow-hidden p-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
          
          {/* Back to Login Button - positioned in first column like changelog */}
          <button
            onClick={handleBackToLogin}
            className="p-3 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-inset transition-all duration-200 group rounded-md border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-gray-200 group-hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors">
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Back to Login
                  </h3>
                </div>
              </div>
            </div>
          </button>

          {/* Empty middle column */}
          <div></div>

          {/* Empty right column */}
          <div></div>
        </div>
      </div>
    </div>
  );
}

export default DemoHeader;