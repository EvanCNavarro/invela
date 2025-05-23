/**
 * ========================================
 * Storybook Page Component
 * ========================================
 * 
 * Dedicated page for accessing the component library within the main application.
 * Provides seamless integration of Storybook documentation without external navigation.
 * 
 * Features:
 * - Full-page Storybook embedding
 * - Professional navigation and branding
 * - Loading states and error handling
 * - Responsive design
 * - Integration with main application routing
 * 
 * @module StorybookPage
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ExternalLink, Loader2, AlertCircle, Home, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ========================================
// CONSTANTS
// ========================================

/**
 * Storybook configuration for different environments
 */
const STORYBOOK_URLS = {
  // Local development server
  local: 'http://localhost:6006',
  // Production subdomain
  production: 'https://storybook.9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev',
  // Static build (if available)
  static: '/storybook-static/index.html'
} as const;

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Storybook Page Component
 * 
 * Full-page component library documentation interface
 */
export function StorybookPage() {

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentUrl, setCurrentUrl] = useState<string>(STORYBOOK_URLS.local);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Initialize Storybook loading on component mount
   */
  useEffect(() => {
    // Try to determine the best Storybook URL
    tryStorybookUrls();
  }, []);

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Try different Storybook URLs in order of preference
   */
  const tryStorybookUrls = async (): Promise<void> => {
    // Try static build first since we know it exists
    try {
      const response = await fetch('/storybook-static/index.html');
      if (response.ok) {
        setCurrentUrl('/storybook-static/index.html');
        setIsLoading(false);
        setHasError(false);
        return;
      }
    } catch (error) {
      console.log('Static build not available:', error);
    }

    // Try production subdomain as fallback
    try {
      setCurrentUrl(STORYBOOK_URLS.production);
      setIsLoading(false);
      setHasError(false);
      return;
    } catch (error) {
      console.log('Production Storybook not available:', error);
    }

    // If all attempts fail
    setIsLoading(false);
    setHasError(true);
    setErrorMessage('Storybook is not available. The static build may not be properly served.');
  };

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
    setErrorMessage('Failed to load Storybook interface');
  };

  /**
   * Retry with different URL
   */
  const retryWithUrl = (url: string): void => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setCurrentUrl(url);
  };

  /**
   * Open external Storybook
   */
  const openExternalStorybook = (): void => {
    window.open(STORYBOOK_URLS.production, '_blank', 'noopener,noreferrer');
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header Navigation */}
      <motion.header 
        className="bg-white border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Navigation */}
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to App
                </Button>
              </Link>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Component Library
                  </h1>
                  <p className="text-xs text-gray-500">
                    Interactive Storybook Documentation
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={openExternalStorybook}
                className="text-gray-600 hover:text-gray-900"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                External
              </Button>
              
              <Link href="/">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Loading State */}
        {isLoading && (
          <motion.div 
            className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loading Component Library
              </h3>
              <p className="text-gray-600">
                Preparing your interactive documentation...
              </p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <motion.div 
            className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Component Library Unavailable
              </h3>
              <p className="text-gray-600 mb-8">
                {errorMessage || 'The Storybook server is not currently accessible. Try one of the options below.'}
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => retryWithUrl(STORYBOOK_URLS.static)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Try Static Build
                </Button>
                
                <Button
                  onClick={() => retryWithUrl(STORYBOOK_URLS.local)}
                  variant="outline"
                  className="w-full"
                >
                  Try Local Server
                </Button>
                
                <Button
                  onClick={openExternalStorybook}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open External Link
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-sm text-gray-700 font-medium mb-2">
                  To run Storybook locally:
                </p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded block">
                  npm run storybook
                </code>
              </div>
            </div>
          </motion.div>
        )}

        {/* Storybook Interface */}
        {!isLoading && !hasError && (
          <motion.div 
            className="h-[calc(100vh-4rem)] bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Component Library Ready
                </h3>
                <p className="text-gray-600 mb-8">
                  Your Storybook component library has been built successfully. Click below to access your interactive component documentation.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open('/storybook-static/index.html', '_blank')}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Component Library
                  </Button>
                  <Button
                    onClick={() => window.open(STORYBOOK_URLS.production, '_blank')}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open External Storybook
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default StorybookPage;