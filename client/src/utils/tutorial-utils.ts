/**
 * ========================================
 * Tutorial System Utilities
 * ========================================
 * 
 * Utility functions for the tutorial system providing consistent behavior
 * and normalization across components in the enterprise risk assessment platform.
 * Handles tab name mapping, tutorial state management, and user interaction flows.
 * 
 * @module utils/tutorial-utils
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * Normalizes tab names to ensure consistent mapping between different formats
 * 
 * @param tabName - The original tab name from the route or component
 * @returns The normalized tab name for use with the tutorial system
 */
export function normalizeTabName(tabName: string): string {
  // Map of original tab names to their normalized versions
  const tabNameMap: Record<string, string> = {
    'risk-score-configuration': 'risk-score',
    'claims-risk-score': 'claims-risk',
    'file-vault': 'file-vault',
    'company-profile': 'company-profile',
    // Add more mappings as needed
  };

  // Return the normalized name or the original if no mapping exists
  return tabNameMap[tabName] || tabName;
}

/**
 * Determine if a tutorial should be displayed based on its status
 * 
 * @param isCompleted - Whether the tutorial has been completed
 * @param forceShow - Whether to force showing the tutorial regardless of completion
 * @returns Boolean indicating if the tutorial should be displayed
 */
export function shouldShowTutorial(isCompleted: boolean, forceShow: boolean = false): boolean {
  return forceShow || !isCompleted;
}

/**
 * Generate a consistent tutorial step ID
 * 
 * @param tabName - The tab name for the tutorial
 * @param stepIndex - The step index (1-based)
 * @returns A unique identifier for the tutorial step
 */
export function generateTutorialStepId(tabName: string, stepIndex: number): string {
  const normalizedTabName = normalizeTabName(tabName);
  return `tutorial-${normalizedTabName}-step-${stepIndex}`;
}

/**
 * Get debug information for tutorial troubleshooting
 * 
 * @param tabName - The tab name 
 * @param tutorialState - The current state of the tutorial
 * @returns Object with debugging information
 */
export function getTutorialDebugInfo(tabName: string, tutorialState: any): Record<string, any> {
  return {
    tabName,
    normalizedTabName: normalizeTabName(tabName),
    tutorialState,
    timestamp: new Date().toISOString(),
  };
}