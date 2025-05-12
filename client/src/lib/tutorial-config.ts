/**
 * Tutorial Configuration
 * 
 * This module provides a centralized configuration for tutorial-related settings
 * including image naming patterns, step counts, and other tutorial-specific options.
 * 
 * This ensures consistency across the application and makes it easier to manage
 * tutorial content and behavior from a single location.
 */

import { createTutorialLogger } from '@/lib/tutorial-logger';
import { normalizeTabName } from '@/utils/tutorial-utils';

// Create a dedicated logger for the tutorial configuration
const logger = createTutorialLogger('TutorialConfig');

/**
 * Tutorial tab configuration interface
 */
export interface TutorialTabConfig {
  // Base file name pattern for tutorial images (e.g. 'modal_dash_')
  imageBaseName: string;
  // Number of steps in this tutorial
  stepCount: number;
  // Base route for determining when to show this tutorial
  baseRoute: string;
  // Whether this tutorial is enabled
  enabled: boolean;
}

/**
 * Complete mapping of all tutorial configurations
 * 
 * This object maps canonical tab names to their configuration settings.
 * When adding a new tutorial, add its configuration here.
 */
export const TUTORIAL_CONFIGS: Record<string, TutorialTabConfig> = {
  'dashboard': {
    imageBaseName: 'modal_dash_',
    stepCount: 3,
    baseRoute: '/',
    enabled: true
  },
  'network': {
    imageBaseName: 'modal_network_',
    stepCount: 3,
    baseRoute: '/network',
    enabled: true
  },
  'claims': {
    imageBaseName: 'modal_claims_',
    stepCount: 2,
    baseRoute: '/claims',
    enabled: true
  },
  'file-vault': {
    imageBaseName: 'modal_file_',
    stepCount: 2,
    baseRoute: '/file-vault',
    enabled: true
  },
  'insights': {
    imageBaseName: 'modal_insights_',
    stepCount: 3,
    baseRoute: '/insights',
    enabled: true
  },
  'risk-score-configuration': {
    imageBaseName: 'modal_risk_',
    stepCount: 3,
    baseRoute: '/risk-score-configuration',
    enabled: true
  }
};

/**
 * Get the appropriate image base name for a tab
 * 
 * @param tabName Canonical tab name
 * @returns Base name for tutorial images or a fallback if not found
 */
export function getImageBaseName(tabName: string): string {
  // Normalize the tab name to ensure consistent lookups
  const normalizedTabName = normalizeTabName(tabName);
  
  const config = TUTORIAL_CONFIGS[normalizedTabName];
  
  if (!config) {
    logger.warn(`No tutorial configuration found for tab: ${normalizedTabName} (original: ${tabName})`);
    // Generate a reasonable fallback pattern based on tab name
    return `modal_${normalizedTabName.replace(/-/g, '_')}_`;
  }
  
  return config.imageBaseName;
}

/**
 * Get the step count for a tutorial tab
 * 
 * @param tabName Canonical tab name
 * @returns Number of steps for the tutorial
 */
export function getStepCount(tabName: string): number {
  // Normalize the tab name to ensure consistent lookups
  const normalizedTabName = normalizeTabName(tabName);
  
  const config = TUTORIAL_CONFIGS[normalizedTabName];
  
  if (!config) {
    logger.warn(`No tutorial configuration found for tab: ${normalizedTabName} (original: ${tabName})`);
    return 3; // Default to 3 steps if not found
  }
  
  return config.stepCount;
}

/**
 * Check if a tutorial is enabled for a tab
 * 
 * @param tabName Canonical tab name
 * @returns Boolean indicating if the tutorial is enabled
 */
export function isTutorialEnabled(tabName: string): boolean {
  // Normalize the tab name to ensure consistent lookups
  const normalizedTabName = normalizeTabName(tabName);
  
  const config = TUTORIAL_CONFIGS[normalizedTabName];
  
  if (!config) {
    logger.warn(`No tutorial configuration found for tab: ${normalizedTabName} (original: ${tabName})`);
    return false; // Default to disabled if not found
  }
  
  return config.enabled;
}

/**
 * Get the base route for a tab's tutorial
 * 
 * @param tabName Canonical tab name
 * @returns Base route string
 */
export function getBaseRoute(tabName: string): string {
  // Normalize the tab name to ensure consistent lookups
  const normalizedTabName = normalizeTabName(tabName);
  
  const config = TUTORIAL_CONFIGS[normalizedTabName];
  
  if (!config) {
    logger.warn(`No tutorial configuration found for tab: ${normalizedTabName} (original: ${tabName})`);
    return `/${normalizedTabName}`; // Reasonable fallback
  }
  
  return config.baseRoute;
}

export default {
  getImageBaseName,
  getStepCount,
  isTutorialEnabled,
  getBaseRoute,
  TUTORIAL_CONFIGS
};