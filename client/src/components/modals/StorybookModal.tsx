/**
 * ========================================
 * Storybook Embedded Modal Component
 * ========================================
 * 
 * Professional embedded Storybook viewer modal that displays the component
 * library directly within the development interface without external navigation.
 * 
 * Features:
 * - Full-screen embedded Storybook interface
 * - Seamless integration within development workflow
 * - Loading states and error handling
 * - Responsive design with proper iframe handling
 * - Professional modal styling
 * 
 * @module StorybookModal
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Component props interface
 */
interface StorybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Storybook configuration
 */
const STORYBOOK_CONFIG = {
  // Local Storybook URL for development
  localUrl: 'http://localhost:6006',
  // Production subdomain URL
  productionUrl: 'https://storybook.9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev',
  // Fallback local port for Replit
  replitLocalUrl: 'http://localhost:6006'
} as const;

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Storybook Embedded Modal Component
 * 
 * Displays Storybook interface in a full-screen modal for seamless development workflow
 */
export function StorybookModal({ 
  isOpen, 
  onClose, 
  className 
}: StorybookModalProps) {

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>(STORYBOOK_CONFIG.localUrl);

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Handle escape key press to close modal
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Reset states when modal opens
      setIsLoading(true);
      setHasError(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle iframe load success
   */
  const handleIframeLoad = (): void => {
    setIsLoading(false);
    setHasError(false);
  };

  /**
   * Handle iframe load error
   */
  const handleIframeError = (): void => {
    setIsLoading(false);
    setHasError(true);
  };

  /**
   * Try alternative Storybook URL
   */
  const tryAlternativeUrl = (): void => {
    setIsLoading(true);
    setHasError(false);
    setCurrentUrl(STORYBOOK_CONFIG.replitLocalUrl);
  };

  /**
   * Open Storybook in external tab
   */
  const openExternalStorybook = (): void => {
    window.open(STORYBOOK_CONFIG.productionUrl, '_blank', 'noopener,noreferrer');
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden",
              "flex flex-col max-h-[95vh]",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Component Library
                  </h2>
                  <p className="text-sm text-gray-600">
                    Interactive Storybook documentation
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openExternalStorybook}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open External
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-white">
              {/* Loading State */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading Storybook...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {hasError && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <div className="text-center max-w-md mx-auto p-6">
                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Storybook Not Available
                    </h3>
                    <p className="text-gray-600 mb-6">
                      The local Storybook server isn't running. You can start it manually or open the external version.
                    </p>
                    <div className="space-y-3">
                      <Button
                        onClick={tryAlternativeUrl}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        Try Alternative URL
                      </Button>
                      <Button
                        onClick={openExternalStorybook}
                        variant="outline"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open External Storybook
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      To run locally: <code className="bg-gray-200 px-1 rounded">npm run storybook</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Storybook Iframe */}
              <iframe
                src={currentUrl}
                className="w-full h-full border-0"
                title="Storybook Component Library"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="scripts"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Interactive component documentation</span>
                </div>
                <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default StorybookModal;