/**
 * Tutorial System Constants
 * 
 * This file contains core constants and utility functions that are used
 * across the tutorial system. By centralizing these, we avoid circular 
 * dependencies and ensure consistent behavior.
 */

// Common tab names used throughout the system
export const TAB_NAMES = {
  DASHBOARD: 'dashboard',
  RISK_SCORE: 'risk-score-configuration',
  NETWORK: 'network',
  CLAIMS: 'claims',
  FILE_VAULT: 'file-vault',
  INSIGHTS: 'insights',
};

// List of tabs that should have tutorials
export const TUTORIAL_ENABLED_TABS = [
  TAB_NAMES.DASHBOARD,
  TAB_NAMES.RISK_SCORE,
  TAB_NAMES.NETWORK,
  TAB_NAMES.CLAIMS, 
  TAB_NAMES.FILE_VAULT,
  TAB_NAMES.INSIGHTS,
];

// Base routes for each tab
export const TAB_BASE_ROUTES = {
  [TAB_NAMES.DASHBOARD]: '/',
  [TAB_NAMES.RISK_SCORE]: '/risk-score-configuration',
  [TAB_NAMES.NETWORK]: '/network',
  [TAB_NAMES.CLAIMS]: '/claims',
  [TAB_NAMES.FILE_VAULT]: '/file-vault',
  [TAB_NAMES.INSIGHTS]: '/insights',
};

// Image base names for each tutorial
export const TUTORIAL_IMAGE_BASE_NAMES = {
  [TAB_NAMES.DASHBOARD]: 'modal_dash_',
  [TAB_NAMES.RISK_SCORE]: 'modal_risk_',
  [TAB_NAMES.NETWORK]: 'modal_network_',
  [TAB_NAMES.CLAIMS]: 'modal_claims_',
  [TAB_NAMES.FILE_VAULT]: 'modal_filevault_',
  [TAB_NAMES.INSIGHTS]: 'modal_insights_',
};

// Step counts for each tutorial
export const TUTORIAL_STEP_COUNTS = {
  [TAB_NAMES.DASHBOARD]: 3,
  [TAB_NAMES.RISK_SCORE]: 3,
  [TAB_NAMES.NETWORK]: 3,
  [TAB_NAMES.CLAIMS]: 3,
  [TAB_NAMES.FILE_VAULT]: 2,
  [TAB_NAMES.INSIGHTS]: 3,
};

/**
 * Normalize a tab name to its canonical form
 * 
 * This is the single source of truth for tab name normalization
 * throughout the application. All components should use this function.
 * 
 * @param tabName Tab name to normalize
 * @returns Normalized tab name
 */
export function normalizeTabName(tabName: string): string {
  if (!tabName) return '';
  
  // Convert to lowercase
  const normalized = tabName.toLowerCase().trim();
  
  // Handle special cases and common variations
  switch (normalized) {
    case 'dashboard':
    case 'home':
    case 'main':
      return TAB_NAMES.DASHBOARD;
      
    case 'risk-score':
    case 'riskscore':
    case 'risk_score':
    case 'risk score':
    case 'risk-score-configuration':
    case 'risk_score_configuration':
    case 'riskscoreconfiguration':
      return TAB_NAMES.RISK_SCORE;
      
    case 'network':
    case 'connections':
    case 'relationship network':
    case 'relationship-network':
      return TAB_NAMES.NETWORK;
      
    case 'claims':
    case 'claim':
      return TAB_NAMES.CLAIMS;
      
    case 'file-vault':
    case 'files':
    case 'file_vault':
    case 'filevault':
    case 'documents':
      return TAB_NAMES.FILE_VAULT;
      
    case 'insights':
    case 'insight':
    case 'analytics':
      return TAB_NAMES.INSIGHTS;
      
    default:
      // Convert spaces and underscores to dashes for other tab names
      return normalized.replace(/[\s_]+/g, '-');
  }
}

/**
 * Create a URL for a tutorial image based on tab name and step
 * 
 * @param tabName The tab name
 * @param step The step number (1-based)
 * @returns URL to the tutorial image
 */
export function createTutorialImageUrl(tabName: string, step: number): string {
  const normalizedTab = normalizeTabName(tabName);
  const baseName = TUTORIAL_IMAGE_BASE_NAMES[normalizedTab] || `modal_${normalizedTab.replace(/-/g, '_')}_`;
  return `/assets/tutorials/${normalizedTab}/${baseName}${step}.png`;
}

/**
 * Get the base route for a tab
 * 
 * @param tabName The tab name
 * @returns Base route for the tab
 */
export function getTabBaseRoute(tabName: string): string {
  const normalizedTab = normalizeTabName(tabName);
  return TAB_BASE_ROUTES[normalizedTab] || `/${normalizedTab}`;
}

/**
 * Get the number of steps for a tab's tutorial
 * 
 * @param tabName The tab name
 * @returns Number of steps
 */
export function getTutorialStepCount(tabName: string): number {
  const normalizedTab = normalizeTabName(tabName);
  return TUTORIAL_STEP_COUNTS[normalizedTab] || 3; // Default to 3 steps
}

/**
 * Check if a tutorial is enabled for a tab
 * 
 * @param tabName The tab name
 * @returns True if tutorial is enabled
 */
export function isTutorialEnabledForTab(tabName: string): boolean {
  const normalizedTab = normalizeTabName(tabName);
  return TUTORIAL_ENABLED_TABS.includes(normalizedTab);
}

/**
 * Extract tab name from a URL path
 * 
 * @param path URL path
 * @returns Tab name
 */
export function extractTabNameFromPath(path: string): string {
  if (!path) return '';
  
  // Handle dashboard as a special case
  if (path === '/' || path === '') {
    return TAB_NAMES.DASHBOARD;
  }
  
  // Extract the first part of the path
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const firstSegment = cleanPath.split('/')[0];
  
  return normalizeTabName(firstSegment);
}