/**
 * ========================================
 * Login Demo Header Component
 * ========================================
 * 
 * Two separate white boxes design:
 * 1. LOGIN BOX - Completely separate white container for login
 * 2. BUTTONS BOX - Separate white container with complete hide/show functionality
 * 
 * @module LoginDemoHeader
 * @version 2.0.0
 * @since 2025-06-09
 */

// ========================================
// IMPORTS
// ========================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  Layers, 
  UserCheck, 
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChangelogModal } from '@/components/modals/ChangelogModal';
// import { ComponentLibraryModal } from '@/components/modals/ComponentLibraryModal';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// ========================================
// TYPES
// ========================================

interface LoginDemoHeaderProps {
  className?: string;
}

// ========================================
// ANIMATION CONFIGURATION
// ========================================

const ANIMATION_CONFIG = {
  duration: 0.3,
  ease: "easeInOut"
} as const;

// ========================================
// COMPONENT
// ========================================

export function LoginDemoHeader({ className }: LoginDemoHeaderProps) {
  // ========================================
  // STATE
  // ========================================

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  // const [showComponentLibrary, setShowComponentLibrary] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const { toast } = useToast();

  // ========================================
  // HANDLERS
  // ========================================

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    try {
      const response = await apiRequest('/api/demo-login', {
        method: 'POST',
        body: JSON.stringify({})
      }) as any;

      if (response?.success) {
        toast({
          title: "Demo login successful",
          description: "Redirecting to dashboard...",
        });
        window.location.href = '/dashboard';
      } else {
        toast({
          title: "Demo login failed",
          description: response?.message || "Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Demo login failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={cn(
      "w-full space-y-4", // Outer container with spacing between boxes
      className
    )}>


      {/* 🚀 BUTTONS BOX - Completely Separate with Hide/Show */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            key="buttons-box"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{
              duration: ANIMATION_CONFIG.duration,
              ease: ANIMATION_CONFIG.ease
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangelog(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <Book className="h-4 w-4 mr-2" />
                    View Changelog
                  </Button>
                  

                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDemoLogin}
                    disabled={isLoggingIn}
                    className="text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        Login to Demo Account
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Hide Button - Part of this box */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleCollapse}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 SHOW BUTTON - Only visible when buttons box is hidden */}
      {isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: ANIMATION_CONFIG.duration,
            ease: ANIMATION_CONFIG.ease
          }}
          className="flex justify-end"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleCollapse}
            className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            Show Actions
          </Button>
        </motion.div>
      )}

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />


    </div>
  );
}