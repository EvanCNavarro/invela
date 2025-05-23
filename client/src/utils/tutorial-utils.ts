/**
 * Tutorial System Utilities - Standardized functions for tutorial state management
 * 
 * Provides centralized utility functions for tutorial system operations including
 * tab name normalization, display logic, step identification, and debugging
 * support. Ensures consistent behavior across tutorial components and enables
 * proper state management for user onboarding experiences.
 * 
 * Features:
 * - Tab name normalization for consistent routing
 * - Tutorial display logic based on completion status
 * - Unique step ID generation for tracking
 * - Debug information for troubleshooting
 */

// ========================================
// CONSTANTS
// ========================================

/**
 * Tab name mapping configuration for tutorial system consistency
 * Maps various tab name formats to their normalized tutorial identifiers
 */
const TAB_NAME_MAPPINGS: Record<string, string> = {
  'risk-score-configuration': 'risk-score',
  'claims-risk-score': 'claims-risk',
  'file-vault': 'file-vault',
  'company-profile': 'company-profile'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Tutorial debug information interface
 * Provides structured data for tutorial troubleshooting and monitoring
 */
interface TutorialDebugInfo {
  tabName: string;
  normalizedTabName: string;
  tutorialState: unknown;
  timestamp: string;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Normalize tab names for consistent tutorial system mapping
 * 
 * Converts various tab name formats to standardized identifiers used
 * throughout the tutorial system. Ensures consistent behavior regardless
 * of how tab names are provided from routes or components.
 * 
 * @param tabName - Original tab name from route or component
 * @returns Normalized tab name for tutorial system usage
 */
export function normalizeTabName(tabName: string): string {
  return TAB_NAME_MAPPINGS[tabName] || tabName;
}

/**
 * Determine tutorial display eligibility based on completion status
 * 
 * Evaluates whether a tutorial should be shown to users based on their
 * completion status and any override flags. Supports forced display for
 * testing and re-onboarding scenarios.
 * 
 * @param isCompleted - Whether user has completed the tutorial
 * @param forceShow - Override flag to show tutorial regardless of completion
 * @returns Boolean indicating if tutorial should be displayed
 */
export function shouldShowTutorial(isCompleted: boolean, forceShow: boolean = false): boolean {
  return forceShow || !isCompleted;
}

/**
 * Generate unique tutorial step identifier for tracking and analytics
 * 
 * Creates consistent step IDs used for tutorial progress tracking, analytics
 * events, and debugging. Combines normalized tab names with step indices
 * to ensure uniqueness across the application.
 * 
 * @param tabName - Tab name for the tutorial context
 * @param stepIndex - Step number (1-based indexing)
 * @returns Unique step identifier string
 */
export function generateTutorialStepId(tabName: string, stepIndex: number): string {
  const normalizedTabName = normalizeTabName(tabName);
  return `tutorial-${normalizedTabName}-step-${stepIndex}`;
}

/**
 * Collect comprehensive tutorial debug information for troubleshooting
 * 
 * Aggregates tutorial state, tab information, and timestamp data for
 * debugging purposes. Provides structured data for support teams and
 * development troubleshooting of tutorial-related issues.
 * 
 * @param tabName - Current tab name context
 * @param tutorialState - Current tutorial state object
 * @returns Structured debug information object
 */
export function getTutorialDebugInfo(tabName: string, tutorialState: unknown): TutorialDebugInfo {
  return {
    tabName,
    normalizedTabName: normalizeTabName(tabName),
    tutorialState,
    timestamp: new Date().toISOString()
  };
}

// ========================================
// EXPORTS
// ========================================

export {
  normalizeTabName as default,
  shouldShowTutorial,
  generateTutorialStepId,
  getTutorialDebugInfo
};