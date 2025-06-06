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
 * - Audience-based filtering (Product/Developer/All)
 * - Smooth animations and transitions
 * - Responsive design
 * - Keyboard navigation support
 * 
 * Usage:
 * ```tsx
 * import { ChangelogModal } from '@/components/modals/ChangelogModal';
 * 
 * function MyComponent() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   
 *   return (
 *     <ChangelogModal 
 *       isOpen={isOpen} 
 *       onClose={() => setIsOpen(false)} 
 *     />
 *   );
 * }
 * ```
 * 
 * See docs/features/CHANGELOG_MODAL.md for detailed implementation guide.
 * 
 * @module ChangelogModal
 * @version 1.1.0
 * @since 2025-05-23
 * @updated 2025-05-30 - Added audience filtering system
 */

import { useState, useEffect, useMemo } from "react";
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
 * Changelog entry audience categorization
 */
export type ChangelogAudience = 
  | 'product'    // User-facing features and improvements
  | 'developer'  // Internal development and technical changes

/**
 * Filter options for changelog display
 */
export type ChangelogFilter = 'all' | 'product' | 'developer';

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
  audience: ChangelogAudience;
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
    id: 'icon-system-standardization-2025-06-06',
    date: '2025-06-06',
    type: 'enhancement',
    title: 'Icon System Standardization',
    description: 'Unified icon usage across dashboard components with consistent sizing and unique identifiers',
    details: [
      'Standardized lucide-react icon imports and usage patterns',
      'Implemented unique icons for each quick action button (FileText for claims, Shield for risk)',
      'Applied consistent h-4 w-4 sizing across all interactive elements',
      'Enhanced visual hierarchy with proper icon-text relationships',
      'Improved accessibility with meaningful icon representations'
    ],
    version: '2.1.4',
    audience: 'developer'
  },
  {
    id: 'invela-admin-customization-2025-06-06',
    date: '2025-06-06',
    type: 'feature',
    title: 'Invela Administrative Dashboard Customization',
    description: 'Implemented specialized dashboard configuration for Invela administrative users with optimized widget layout',
    details: [
      'Created INVELA_DEFAULT_WIDGETS configuration excluding Risk Radar and Risk Monitoring',
      'Implemented 2-column grid layout with balanced Company Snapshot and QuickActions positioning',
      'Enhanced administrative workflow efficiency with prominent quick action shortcuts',
      'Provided direct navigation to risk analysis and company management features',
      'Maintained consistent theming with blue accent colors (#3b82f6)'
    ],
    version: '2.1.3',
    audience: 'product'
  },
  {
    id: 'terminology-data-recipient-2025-06-06',
    date: '2025-06-06',
    type: 'enhancement',
    title: 'Data Recipient Terminology Update',
    description: 'Standardized business terminology by replacing FinTech references with Data Recipient across invite workflows',
    details: [
      'Updated invite modal dialog title to "Invite a New Data Recipient"',
      'Changed description text to reference "data recipient invitation"',
      'Modified checkbox label to "Create as Demo Data Recipient"',
      'Maintained consistent business language throughout user interface',
      'Improved clarity for enterprise users and administrative workflows'
    ],
    version: '2.1.2',
    audience: 'product'
  },
  {
    id: 'navigation-risk-score-fix-2025-06-06',
    date: '2025-06-06',
    type: 'fix',
    title: 'Risk Score Navigation Enhancement',
    description: 'Fixed Risk Score button navigation to properly route to company profile risk analysis tab',
    details: [
      'Updated navigation path from /company-profile/1?tab=risk to /network/company/1?tab=risk',
      'Aligned with existing risk monitoring component navigation patterns',
      'Ensured consistent routing across all dashboard quick action buttons',
      'Verified proper tab parameter handling for risk analysis display'
    ],
    version: '2.1.1',
    audience: 'product'
  },
  {
    id: 'dashboard-quickactions-widget-2025-06-06',
    date: '2025-06-06',
    type: 'feature',
    title: 'QuickActions Dashboard Widget',
    description: 'Implemented comprehensive 8-button quick actions panel with enhanced navigation and professional styling',
    details: [
      'Created 2x4 grid layout with Company Profile, Insights, File Upload, Invite Recipient actions',
      'Added Task Center, Risk Score, Network View, and Manage Claims functionality',
      'Enhanced button styling with h-14 height for better space utilization',
      'Replaced chevron icons with proper ArrowRight icons for navigation clarity',
      'Implemented hover animations with scale and shadow transitions',
      'Integrated with existing FileVault and InviteModal components'
    ],
    version: '2.1.0',
    audience: 'product'
  },
  {
    id: 'demo-network-size-scaling-2025-06-06',
    date: '2025-06-06',
    type: 'enhancement',
    title: 'Demo Network Size Scaling & Validation',
    description: 'Expanded demo network capacity from 100 to 1000 relationships with comprehensive validation and cleanup improvements',
    details: [
      'Increased maximum network size from 100 to 1000 relationships for realistic enterprise demos',
      'Fixed hardcoded network size limit in demo data transformer that was capping user selections',
      'Validated large-scale demo creation with 919 relationship network successfully',
      'Enhanced demo cleanup system with proper cascade deletion of relationships and associated data',
      'Improved network visualization performance for handling larger datasets',
      'Added comprehensive logging for demo creation and relationship management',
      'Preserved 1,108 FinTech company pool for consistent demo network generation'
    ],
    version: '2.0.9',
    audience: 'product'
  },
  {
    id: 'demo-data-transformer-architecture-2025-06-06',
    date: '2025-06-06',
    type: 'enhancement',
    title: 'Demo Data Transformer Architecture Overhaul',
    description: 'Refactored demo data transformation pipeline with improved validation logic and scalable network relationship management',
    details: [
      'Updated MAX_NETWORK_SIZE constant from 100 to 1000 in demo-data-transformer.ts',
      'Enhanced network size validation logic to respect user selections within 5-1000 range',
      'Improved demo cleanup cascade deletion handling for foreign key constraints',
      'Added comprehensive database cleanup sequence: relationships → users → accreditation history → companies',
      'Optimized demo session service for handling larger relationship datasets',
      'Enhanced logging throughout transformation pipeline for better debugging',
      'Maintained backward compatibility with existing demo configurations'
    ],
    version: '2.0.8',
    audience: 'developer'
  },
  {
    id: 'file-vault-authentication-fix-2025-06-06',
    date: '2025-06-06',
    type: 'fix',
    title: 'FileVault Authentication & Display Resolution',
    description: 'Fixed critical FileVault functionality including user authentication, file list display, and upload processing',
    details: [
      'Resolved module resolution conflict causing upload failures by removing duplicate toast hook file',
      'Fixed circular dependency in FileVault query logic preventing file list display',
      'Corrected user authentication hook import to use working API endpoint (/api/user)',
      'Enhanced server logging for debugging authentication flow and request tracking',
      'Verified file uploads work correctly on server side with proper WebSocket notifications',
      'Confirmed API endpoint returns complete user data including company_id field',
      'FileVault now displays uploaded files properly and handles new file uploads successfully'
    ],
    version: '2.0.7',
    audience: 'product'
  },
  {
    id: 'banking-specific-company-name-generation-2025-06-06',
    date: '2025-06-06',
    type: 'feature',
    title: 'Banking-Specific Company Name Generation',
    description: 'Enhanced Data Provider persona with banking suffix rules and specialized name generation',
    details: [
      'Implemented banking suffix rule ensuring Data Provider names end with "Bank" or "Credit Union"',
      'Enhanced company name generation API with persona parameter support for specialized naming',
      'Added banking-specific generation function with 50/50 distribution between short and long formats',
      'Integrated persona-aware routing maintaining 118,000+ combination diversity in name generation',
      'Extended API interfaces with persona metadata for improved debugging and strategy identification',
      'Updated frontend to automatically pass selected persona information to backend APIs',
      'Maintained backwards compatibility with existing generation logic for all other personas'
    ],
    version: '2.0.6',
    audience: 'product'
  },
  {
    id: 'network-management-company-discovery-2025-06-05',
    date: '2025-06-05',
    type: 'feature',
    title: 'Network Management & Company Discovery System',
    description: 'Complete network expansion system with advanced filtering, connection management, and intelligent company discovery',
    details: [
      'Created comprehensive network expansion interface with server-side filtering capabilities',
      'Implemented intelligent default filtering showing only low-risk, approved companies (24 vs 102 total)',
      'Built responsive pagination system with 5 companies per page for optimal viewing',
      'Added real-time connection request functionality with visual status tracking',
      'Enhanced network summary component with improved data presentation and member metrics',
      'Developed connection management system with proper accreditation validation',
      'Integrated toast notifications for connection success/failure feedback',
      'Added comprehensive company card layouts with risk score indicators and accreditation badges'
    ],
    version: '1.9.9',
    audience: 'product'
  },
  {
    id: 'risk-monitoring-insights-platform-2025-06-05',
    date: '2025-06-05',
    type: 'enhancement',
    title: 'Risk Monitoring & Insights Platform Overhaul',
    description: 'Enhanced risk monitoring dashboard with unified thresholds, authentic data integration, and advanced analytics',
    details: [
      'Enhanced RiskMonitoringInsight component with unified risk thresholds (≥70 for blocked status)',
      'Integrated authentic company risk data replacing placeholder information throughout system',
      'Added advanced filtering options for blocked/deteriorating companies with real-time updates',
      'Implemented comprehensive risk calculation engine with 7-day and 30-day trend analysis',
      'Created dynamic alert system for high-risk company identification with automated detection',
      'Added deteriorating risk detection algorithms with configurable sensitivity settings',
      'Enhanced visual design with proper alert styling and priority indicators',
      'Implemented session-based data caching for improved performance and user experience'
    ],
    version: '1.9.9',
    audience: 'product'
  },
  {
    id: 'server-side-filtering-architecture-2025-06-05',
    date: '2025-06-05',
    type: 'enhancement',
    title: 'Server-Side Filtering Architecture & Performance',
    description: 'Migrated filtering logic from client to server with standardized risk classification and enhanced performance',
    details: [
      'Migrated all filtering logic from client to server for improved performance and data accuracy',
      'Implemented comprehensive query parameter support for riskLevel, accreditation, size, industry, and search',
      'Unified risk level thresholds across entire platform (Low: <40, Medium: 40-70, High: ≥70)',
      'Added debug logging systems for filter application tracking and troubleshooting',
      'Removed redundant client-side filtering to reduce processing overhead and improve response times',
      'Streamlined data transfer by sending only filtered results from server to client',
      'Enhanced React Query integration for automatic cache invalidation on filter changes',
      'Created centralized risk calculation utilities for consistent application across components'
    ],
    version: '1.9.9',
    audience: 'developer'
  },
  {
    id: 'responsive-design-ux-improvements-2025-06-05',
    date: '2025-06-05',
    type: 'enhancement',
    title: 'Responsive Design & User Experience Improvements',
    description: 'Enhanced mobile compatibility, search functionality, and visual design across network components',
    details: [
      'Enhanced mobile and tablet compatibility across all network pages with responsive design',
      'Improved filter layout with single-row responsive design and natural wrapping behavior',
      'Added advanced search functionality with real-time filtering and instant visual feedback',
      'Created clear filter buttons with proper reset functionality and improved accessibility',
      'Standardized color schemes and styling across network components for visual consistency',
      'Enhanced company card designs with consistent risk indicators and professional styling',
      'Improved accreditation status display with centered alignment and proper badge styling',
      'Added loading states and skeleton screens for better perceived performance during data loading'
    ],
    version: '1.9.9',
    audience: 'product'
  },
  {
    id: 'risk-score-comparative-visualization-2025-06-04',
    date: '2025-06-04',
    type: 'enhancement',
    title: 'Risk Score Comparative Visualization Enhancements',
    description: 'Comprehensive improvements to the risk comparison system with authentic data integration, bug fixes, and enhanced user experience',
    details: [
      'Fixed critical ID mismatch bug preventing industry average removal (was checking id === -1 but data has id: 0)',
      'Implemented proper toggle functionality for add/remove industry average operations with comprehensive logging',
      'Replaced mock rainbow colors with authentic application palette for risk dimensions',
      'Integrated real company risk scores from database instead of synthetic placeholder data',
      'Redesigned company comparison slots with professional styling (dashed borders for empty slots)',
      'Added intuitive "Add Company" buttons for slot management',
      'Optimized search interface with fixed 320px width for better layout control',
      'Enhanced button text clarity (changed "AVG" to "Average" for better readability)',
      'Removed duplicate legends and card headers to maximize chart space utilization',
      'Improved radar chart sizing to prevent dimension label truncation',
      'Enhanced priority badge display by removing percentage weights',
      'Implemented compact red alert background for streamlined visual hierarchy'
    ],
    version: '1.9.7',
    audience: 'product'
  },
  {
    id: 'visual-assets-deployment-fix-2025-06-04',
    date: '2025-06-04',
    type: 'fix',
    title: 'Visual Tutorial System Deployment Restoration',
    description: 'Resolved deployment failures and restored complete visual tutorial and onboarding system with 130MB of recovered assets',
    details: [
      'Fixed deployment bloat issue preventing successful builds of working codebase',
      'Recovered 130MB of missing visual assets from git history including tutorial modals and onboarding images',
      'Restored welcome_1.png through welcome_7.png for complete onboarding experience',
      'Fixed tutorial image path resolution from /attached_assets/ to /assets/tutorials/',
      'Resolved modal_claims and modal_dash tutorial images for interactive guidance system',
      'Optimized project size from 5.2GB to 4.4GB while maintaining full visual functionality',
      'Successfully deployed application with complete tutorial and demo visual system intact'
    ],
    version: '1.9.6',
    audience: 'product'
  },
  {
    id: 'company-profile-complete-overhaul-2025-06-02',
    date: '2025-06-02',
    type: 'feature',
    title: 'Complete Company Profile System Overhaul',
    description: 'Comprehensive rebuild of network company profile pages with new routing, enhanced UI, and full functionality restoration',
    details: [
      'Migrated from legacy company profile to new simple-company-profile component architecture',
      'Fixed critical network routing: company profiles now properly accessible from network page clicks',
      'Implemented three-tab layout: Overview (business details), Users (team members), and Risk (assessment data)',
      'Built comprehensive bento grid layout with standardized typography and consistent styling',
      'Resolved Users tab backend API: fixed route registration and data structure handling',
      'Enhanced fuzzy search functionality with name and email filtering across all company users',
      'Added proper loading states, error handling, and debug logging throughout the system',
      'Streamlined UI design: removed unnecessary columns and optimized avatar sizing',
      'Complete data flow restoration: backend → API → frontend → UI now fully functional',
      'Professional fact sheet design displaying S&P DARS scores, accreditation status, and business information'
    ],
    version: '1.9.5',
    audience: 'product'
  },
  {
    id: 'accreditation-validity-system-2025-06-01',
    date: '2025-06-01',
    type: 'feature',
    title: 'Accreditation Validity System Implementation',
    description: 'Complete accreditation lifecycle management with 365-day expiration tracking for Data Recipients and permanent status for Data Providers',
    details: [
      'Built comprehensive AccreditationService with automatic expiration date calculation',
      'Enhanced dashboard to display accreditation status and days until expiration',
      'Fixed critical gap: demo companies now receive proper accreditation records',
      'Added accreditation history tracking with incremental numbering system',
      'Created API endpoints for accreditation retrieval and status checking',
      'Implemented visual indicators for expired, expiring, and permanent accreditations',
      'Integrated accreditation creation into demo company workflow with error handling'
    ],
    version: '1.9.4',
    audience: 'product'
  },
  {
    id: 'terminology-standardization-2025-06-01',
    date: '2025-06-01',
    type: 'enhancement',
    title: 'UI Terminology Standardization',
    description: 'Systematic update of user-facing terminology from "Bank/FinTech" to "Data Provider/Data Recipient" across the platform',
    details: [
      'Updated Claims modal section headers and form labels to use "Data Recipient"',
      'Changed Claims table column headers to display "Data Provider" and "Data Recipient"',
      'Modified Claims detail page sections and field labels throughout',
      'Updated Risk Flow Visualization legend terminology',
      'Revised skeleton loading state comments for consistency',
      'Updated navigation menu descriptions for liability insurance',
      'Preserved all backend business logic and database schema',
      'Maintained internal categorization systems for data integrity'
    ],
    version: '1.9.3',
    audience: 'product'
  },
  {
    id: 'onboarding-modal-ui-improvements-2025-05-31',
    date: '2025-05-31',
    type: 'enhancement',
    title: 'Onboarding Modal UI Improvements',
    description: 'Enhanced visual consistency and messaging across all onboarding steps for better user experience',
    details: [
      'Fixed StepLayout component to properly render description text',
      'Simplified final step content with clear action-focused messaging',
      'Replaced verbose marketing copy with specific task overview',
      'Applied consistent spacing and typography across all 7 steps',
      'Enhanced user flow with "Join the Invela Trust Network" messaging',
      'Improved visual alignment using CheckListItem components'
    ],
    version: '1.9.2',
    audience: 'product'
  },
  {
    id: 'changelog-audience-filtering-2025-05-30',
    date: '2025-05-30',
    type: 'feature',
    title: 'Changelog Audience Filtering System',
    description: 'Added Product/Developer/All filter controls to changelog modal for better content organization',
    details: [
      'Implemented audience-based filtering with Product, Developer, and All options',
      'Added light blue active state styling for filter buttons',
      'Created responsive filter UI with smooth transitions',
      'Enhanced user experience with filtered view of relevant updates',
      'Added comprehensive documentation in docs/features/CHANGELOG_MODAL.md',
      'Optimized performance with useMemo for filtered entry computation'
    ],
    version: '1.9.1',
    audience: 'product'
  },
  {
    id: 'documentation-overhaul-2025-05-30',
    date: '2025-05-30',
    type: 'docs',
    title: 'Documentation Overhaul & System Investigation',
    description: 'Comprehensive documentation cleanup and live system analysis with architecture investigation',
    details: [
      'Conducted live system analysis revealing sophisticated multi-workflow architecture',
      'Documented KYB, KY3P, Open Banking, and Security assessment workflows',
      'Analyzed WebSocket real-time communication system with authentication flow',
      'Investigated company-scoped data isolation and session management',
      'Removed 9 redundant documentation files (1,356 lines of outdated content)',
      'Renamed all documentation to follow industry standards (README.md, CONTRIBUTING.md, etc.)',
      'Achieved 100% naming convention compliance across documentation',
      'Created organized structure with features subdirectory',
      'Updated coding standards to specify UPPERCASE.md for documentation files'
    ],
    version: '1.9.0',
    audience: 'developer'
  },
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
    version: '1.8.1',
    audience: 'developer'
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
    version: '1.8.0',
    audience: 'developer'
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
    version: '1.7.0',
    audience: 'product'
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
    version: '1.6.0',
    audience: 'product'
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
    version: '1.5.0',
    audience: 'product'
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
    version: '1.4.0',
    audience: 'product'
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
    version: '1.3.0',
    audience: 'product'
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
    version: '1.2.0',
    audience: 'product'
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
    version: '1.1.0',
    audience: 'developer'
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
  // STATE MANAGEMENT
  // ========================================

  const [activeFilter, setActiveFilter] = useState<ChangelogFilter>('product');

  // ========================================
  // DATA FILTERING
  // ========================================

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') {
      return changelogEntries;
    }
    return changelogEntries.filter(entry => entry.audience === activeFilter);
  }, [activeFilter]);

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
              
              <div className="flex items-center gap-4">
                {/* Filter Controls */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(['all', 'product', 'developer'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                        activeFilter === filter
                          ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {filteredEntries.map((entry, index) => (
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
                  Showing {filteredEntries.length} recent updates
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