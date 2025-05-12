/**
 * Tutorial Utility Functions
 * 
 * This module provides reusable utility functions for working with tutorials,
 * ensuring consistent behavior across different components.
 */

import { createTutorialLogger } from '@/lib/tutorial-logger';

const logger = createTutorialLogger('TutorialUtils');

/**
 * Normalize a tab name to its canonical form
 * 
 * This function ensures consistency across the application by converting
 * various forms of tab names to a standard format.
 * 
 * @param tabName - Raw tab name that may be in various formats
 * @returns Normalized tab name in kebab-case format
 */
export function normalizeTabName(tabName: string): string {
  if (!tabName) return '';
  
  // Convert to lowercase
  let normalized = tabName.toLowerCase();
  
  // Handle special cases and common variations
  switch (normalized) {
    case 'dashboard':
    case 'home':
      return 'dashboard';
      
    case 'risk-score':
    case 'riskscore':
    case 'risk_score':
    case 'risk score':
    case 'risk-score-configuration':
    case 'risk_score_configuration':
    case 'riskscoreconfiguration':
      return 'risk-score-configuration';
      
    case 'network':
    case 'connections':
    case 'relationship network':
    case 'relationship-network':
      return 'network';
      
    case 'claims':
    case 'claim':
      return 'claims';
      
    case 'file-vault':
    case 'files':
    case 'file_vault':
    case 'filevault':
    case 'documents':
      return 'file-vault';
      
    case 'insights':
    case 'insight':
    case 'analytics':
      return 'insights';
      
    default:
      // Convert spaces and underscores to dashes for other tab names
      normalized = normalized.replace(/[\s_]+/g, '-');
      logger.debug(`Normalized tab name: ${tabName} -> ${normalized}`);
      return normalized;
  }
}

/**
 * Create tutorial image URL based on tab name and step number
 * 
 * @param tabName - The tab name (will be normalized)
 * @param stepNumber - Current step number (1-based)
 * @returns Full URL to the tutorial image
 */
export function createTutorialImageUrl(tabName: string, stepNumber: number): string {
  const normalizedTabName = normalizeTabName(tabName);
  
  // Use the appropriate image base name based on tab type
  let imageBaseName = '';
  
  switch (normalizedTabName) {
    case 'dashboard':
      imageBaseName = 'modal_dash_';
      break;
    case 'risk-score-configuration':
      imageBaseName = 'modal_risk_';
      break;
    case 'network':
      imageBaseName = 'modal_network_';
      break;
    case 'claims':
      imageBaseName = 'modal_claims_';
      break;
    case 'file-vault':
      imageBaseName = 'modal_file_';
      break;
    case 'insights':
      imageBaseName = 'modal_insights_';
      break;
    default:
      // Create a reasonable fallback
      imageBaseName = `modal_${normalizedTabName.replace(/-/g, '_')}_`;
  }
  
  return `/assets/tutorials/${normalizedTabName}/${imageBaseName}${stepNumber}.png`;
}

export default {
  normalizeTabName,
  createTutorialImageUrl
};