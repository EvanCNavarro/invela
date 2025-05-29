/**
 * ========================================
 * Changelog Modal Component
 * ========================================
 * 
 * Professional changelog modal displaying recent feature updates
 * and development progress with modern design and accessibility features.
 * 
 * Features:
 * - Clean, modern modal interface
 * - Chronological changelog entries
 * - Badge-based categorization
 * - Smooth animations and transitions
 * - Responsive design
 * - Keyboard navigation support
 * 
 * @module ChangelogModal
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Code, Palette, Settings, Zap, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Changelog entry type categorization
 */
export type ChangelogEntryType = 
  | 'feature'     // New features
  | 'enhancement' // Improvements to existing features
  | 'fix'         // Bug fixes
  | 'design'      // UI/UX improvements
  | 'docs'        // Documentation updates
  | 'performance' // Performance improvements;

/**
 * Individual changelog entry structure
 */
export interface ChangelogEntry {
  id: string;
  date: string;
  type: ChangelogEntryType;
  title: string;
  description: string;
  details?: string[];
  version?: string;
}

/**
 * Component props interface
 */
interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// ========================================
// CHANGELOG DATA
// ========================================

/**
 * Changelog entries data
 * Maintained in chronological order (newest first)
 */
const changelogEntries: ChangelogEntry[] = [
  {
    id: 'console-logging-cleanup-2025-05-29',
    date: '2025-05-29',
    type: 'enhancement',
    title: 'Developer Experience Console Logging Cleanup',
    description: 'Systematic cleanup of excessive console logging to improve developer debugging experience and reduce console spam',
    details: [
      'Removed verbose field visibility logging from DemoStep2 component that fired on every render',
      'Cleaned up DemoStepVisual asset switching logs that triggered during navigation',
      'Eliminated repetitive step progression logging while preserving essential error handling',
      'Reduced console output by 20+ log statements without affecting functionality',
      'Maintained comprehensive error logging for production debugging needs',
      'Improved developer experience during demo flow testing and development'
    ],
    version: '1.8.1'
  },
  {
    id: 'comprehensive-system-updates-2025-05-29',
    date: '2025-05-29',
    type: 'enhancement',
    title: 'Comprehensive System Enhancement & Security Updates',
    description: 'Major platform improvements including risk cluster unification, security enhancements, and data management optimization',
    details: [
      'Unified risk cluster categories across all generation functions with new standardized schema',
      'Implemented comprehensive company name security system with blacklist validation',
      'Created unified business details generator providing consistent 16+ field profiles',
      'Built comprehensive demo data cleanup system with cascading deletion safety',
      'Enhanced data integrity validation for accreditation status compliance',
      'Standardized revenue formatting and employee count display across all components'
    ],
    version: '1.8.0'
  },
  {
    id: 'complete-demo-flow-system-2025-05-28',
    date: '2025-05-28',
    type: 'feature',
    title: 'Complete Enterprise Demo Flow System',
    description: 'Production-ready demo flow with advanced company generation, network creation, and persona-specific experiences',
    details: [
      'Advanced company name generation system with 118,000+ unique combinations',
      'Intelligent network creation for Data Provider persona (13 FinTech relationships)',
      'Production-ready persona system with proper demo flags and user settings',
      'Seamless authentication flow with automatic login after demo completion',
      'Email invitation system with secure code generation for enterprise onboarding',
      'Persona-specific platform access: 1, 4, 7, or 8 tabs based on user type',
      'Clean production logging with comprehensive error tracking',
      'Efficient database operations with proper connection management'
    ],
    version: '1.7.0'
  },
  {
    id: 'demo-flow-user-creation-fixes-2025-05-27',
    date: '2025-05-27',
    type: 'fix',
    title: 'Demo Flow User Creation System Overhaul',
    description: 'Complete resolution of persona-based onboarding issues with enhanced demo user tracking',
    details: [
      'Fixed critical role mapping where frontend sent raw persona titles instead of mapped roles',
      'Resolved demo user data population by integrating demo fields into main database schema',
      'Corrected onboarding logic so New Data Recipients see onboarding modal while others skip',
      'Added comprehensive demo session tracking with unique session IDs and metadata',
      'Enhanced backend user creation with proper persona-based field validation and logging',
      'Implemented proper role mapping: New Data Recipient → "user", Accredited Data Recipient → "accredited_user"',
      'Standardized demo data structure across frontend and backend systems'
    ],
    version: '1.6.0'
  },
  {
    id: 'enhanced-demo-generation-2025-05-25',
    date: '2025-05-25',
    type: 'enhancement',
    title: 'Enhanced Enterprise Demo Generation System',
    description: 'Intelligent risk assessment and company data generation for realistic demo experiences',
    details: [
      'Smart risk cluster distribution that correlates with company risk profiles',
      'Legal structure randomization with realistic business entity types',
      'Risk categories that mathematically sum to the company\'s overall risk score',
      'Premium business address generation for enterprise-grade companies',
      'Enhanced company size mapping with realistic revenue and employee ranges',
      'Improved API route priority for reliable JSON responses',
      'Comprehensive error handling and database integration'
    ],
    version: '1.5.0'
  },
  {
    id: 'demo-flow-implementation-2025-05-24',
    date: '2025-05-24',
    type: 'feature',
    title: 'Interactive Demo Flow Implementation',
    description: 'Complete three-step demo journey with persona selection system and professional design enhancements',
    details: [
      'Professional persona cards: New Data Recipient, Accredited Data Recipient, Data Provider, and Consumer',
      'Dynamic visual content that changes based on active step progression',
      'Personalized experience with tailored content based on user persona selection',
      'Seamless navigation between steps with consistent button styling',
      'Review page (Step 3) with personalized summary and Sign In functionality',
      'Enhanced visual hierarchy with clean gray backgrounds and proper styling',
      'Professional "Back to Login" button with improved visibility'
    ],
    version: '1.4.0'
  },
  {
    id: 'component-library-v1-2025-05-24',
    date: '2025-05-24',
    type: 'feature',
    title: 'Invela Trust Network Component Library v1.0',
    description: 'Custom React-based component library with live documentation and authentic branding',
    details: [
      'Interactive documentation using actual Button, Input, and Table components',
      'Live demos with authentic Invela Trust Network styling and branding',
      'Professional blue theme design system documentation',
      'Real component examples with risk assessment data',
      'Accessible via Component Library button on login page',
      'Zero maintenance overhead - always in sync with actual components'
    ],
    version: '1.3.0'
  },
  {
    id: 'changelog-modal-2025-05-23',
    date: '2025-05-23',
    type: 'feature',
    title: 'Changelog Modal Implementation',
    description: 'Added comprehensive changelog modal with tracking system for development updates',
    details: [
      'Beautiful modal interface with smooth animations',
      'Badge-based categorization system',
      'Chronological entry display',
      'Responsive design with keyboard navigation'
    ],
    version: '1.2.0'
  },
  {
    id: 'coding-standards-2025-05-23',
    date: '2025-05-23',
    type: 'enhancement',
    title: 'Project File Coding Standard Cleanup',
    description: 'Systematic improvement of code quality and documentation standards across the platform',
    details: [
      'Enhanced TypeScript interfaces and type definitions',
      'Comprehensive JSDoc documentation',
      'Consistent file structure and naming conventions',
      'Improved error handling and logging patterns',
      'Professional code organization and best practices'
    ],
    version: '1.1.0'
  }
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get icon component for changelog entry type
 */
const getTypeIcon = (type: ChangelogEntryType) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (type) {
    case 'feature':
      return <Zap {...iconProps} />;
    case 'enhancement':
      return <Settings {...iconProps} />;
    case 'fix':
      return <CheckCircle {...iconProps} />;
    case 'design':
      return <Palette {...iconProps} />;
    case 'docs':
      return <Code {...iconProps} />;
    case 'performance':
      return <Zap {...iconProps} />;
    default:
      return <Code {...iconProps} />;
  }
};

/**
 * Get badge styling for changelog entry type
 */
const getTypeBadge = (type: ChangelogEntryType) => {
  const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
  
  switch (type) {
    case 'feature':
      return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
    case 'enhancement':
      return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
    case 'fix':
      return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
    case 'design':
      return `${baseClasses} bg-purple-100 text-purple-800 border border-purple-200`;
    case 'docs':
      return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    case 'performance':
      return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
  }
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * Changelog Modal Component
 * 
 * Displays recent development updates in a professional modal interface
 */
export function ChangelogModal({ 
  isOpen, 
  onClose, 
  className 
}: ChangelogModalProps) {

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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden",
              "flex flex-col max-h-[90vh]",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Platform Changelog
                  </h2>
                  <p className="text-sm text-gray-600">
                    Recent updates and improvements
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {changelogEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative pl-8 pb-6 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-white border-2 border-gray-300 rounded-full" />
                    
                    {/* Entry content */}
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={getTypeBadge(entry.type)}>
                              {getTypeIcon(entry.type)}
                              {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                            </span>
                            {entry.version && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-mono">
                                v{entry.version}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {entry.title}
                          </h3>
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 leading-relaxed">
                        {entry.description}
                      </p>

                      {/* Details */}
                      {entry.details && entry.details.length > 0 && (
                        <ul className="space-y-1 text-sm text-gray-600">
                          {entry.details.map((detail, detailIndex) => (
                            <li key={detailIndex} className="flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {changelogEntries.length} recent updates
                </p>
                <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
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

export default ChangelogModal;