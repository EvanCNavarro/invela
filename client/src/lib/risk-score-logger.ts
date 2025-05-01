/**
 * Risk Score Logger Utility
 * 
 * This utility provides specific logging functions for the risk score configuration
 * to help track and debug issues with persistence and state synchronization.
 */

import { RiskDimension, RiskPriorities } from './risk-score-configuration-types';

class RiskScoreLogger {
  private readonly enabledTags: Set<string>;
  private showDiff: boolean = true;
  
  constructor() {
    // Initialize with all tags enabled by default
    this.enabledTags = new Set([
      'load', 'save', 'fetch', 'change', 'persist', 'validate', 'compare'
    ]);
  }
  
  /**
   * Enable or disable specific logging tags
   */
  setTagsEnabled(tags: string[], enabled: boolean): void {
    tags.forEach(tag => {
      if (enabled) {
        this.enabledTags.add(tag);
      } else {
        this.enabledTags.delete(tag);
      }
    });
  }
  
  /**
   * Enable or disable showing diffs in logs
   */
  setShowDiff(enabled: boolean): void {
    this.showDiff = enabled;
  }
  
  /**
   * Log a message with a specific tag if that tag is enabled
   */
  private log(tag: string, message: string, ...data: any[]): void {
    if (this.enabledTags.has(tag)) {
      console.log(`[RiskScore:${tag}] ${message}`, ...data);
    }
  }
  
  /**
   * Log error with a specific tag
   */
  private error(tag: string, message: string, ...data: any[]): void {
    if (this.enabledTags.has(tag)) {
      console.error(`[RiskScore:${tag}] ${message}`, ...data);
    }
  }
  
  /**
   * Compare two arrays of risk dimensions and log differences
   */
  compareDimensions(tag: string, name1: string, dimensions1: RiskDimension[], name2: string, dimensions2: RiskDimension[]): void {
    if (!this.enabledTags.has(tag)) return;
    
    if (!dimensions1 || !dimensions2) {
      this.log(tag, 'Cannot compare dimensions: one or both are undefined', {
        [name1]: dimensions1 ? 'defined' : 'undefined',
        [name2]: dimensions2 ? 'defined' : 'undefined'
      });
      return;
    }
    
    if (dimensions1.length !== dimensions2.length) {
      this.log(tag, `Dimension count mismatch: ${name1}=${dimensions1.length}, ${name2}=${dimensions2.length}`);
    }
    
    const sortedDim1 = [...dimensions1].sort((a, b) => a.id.localeCompare(b.id));
    const sortedDim2 = [...dimensions2].sort((a, b) => a.id.localeCompare(b.id));
    
    const allIds = new Set<string>([
      ...sortedDim1.map(d => d.id), 
      ...sortedDim2.map(d => d.id)
    ]);
    
    const differences: any[] = [];
    
    allIds.forEach(id => {
      const dim1 = sortedDim1.find(d => d.id === id);
      const dim2 = sortedDim2.find(d => d.id === id);
      
      if (!dim1) {
        differences.push({ id, type: 'missing', source: name1 });
        return;
      }
      
      if (!dim2) {
        differences.push({ id, type: 'missing', source: name2 });
        return;
      }
      
      // Compare the values and weights
      if (dim1.value !== dim2.value || dim1.weight !== dim2.weight) {
        differences.push({
          id,
          type: 'different',
          [`${name1}_value`]: dim1.value,
          [`${name2}_value`]: dim2.value,
          [`${name1}_weight`]: dim1.weight,
          [`${name2}_weight`]: dim2.weight,
        });
      }
    });
    
    if (differences.length > 0) {
      this.log(tag, `Found ${differences.length} differences between ${name1} and ${name2}:`, differences);
      
      if (this.showDiff) {
        this.log(tag, `Complete ${name1} dimensions:`, sortedDim1);
        this.log(tag, `Complete ${name2} dimensions:`, sortedDim2);
      }
    } else {
      this.log(tag, `No differences found between ${name1} and ${name2} dimensions`);
    }
  }
  
  /**
   * Log when loading initial risk priorities
   */
  logInitialLoad(priorities: RiskPriorities | null): void {
    this.log('load', 'Initial risk priorities loaded:', priorities);
  }
  
  /**
   * Log when risk priorities are loaded from API
   */
  logFetchSuccess(priorities: RiskPriorities): void {
    this.log('fetch', 'Successfully fetched risk priorities:', priorities);
  }
  
  /**
   * Log when fetching risk priorities fails
   */
  logFetchError(error: any): void {
    this.error('fetch', 'Error fetching risk priorities:', error);
  }
  
  /**
   * Log before saving risk priorities
   */
  logSaveAttempt(priorities: RiskPriorities): void {
    this.log('save', 'Attempting to save risk priorities:', priorities);
  }
  
  /**
   * Log when saving was successful
   */
  logSaveSuccess(priorities: RiskPriorities, response: any): void {
    this.log('save', 'Successfully saved risk priorities:', {
      priorities,
      response
    });
  }
  
  /**
   * Log when saving fails
   */
  logSaveError(priorities: RiskPriorities, error: any): void {
    this.error('save', 'Error saving risk priorities:', {
      priorities,
      error
    });
  }
  
  /**
   * Log when using direct update method
   */
  logDirectUpdate(priorities: RiskPriorities): void {
    this.log('persist', 'Using direct update method:', priorities);
  }
  
  /**
   * Log when dimensions are changed
   */
  logDimensionsChanged(oldDimensions: RiskDimension[], newDimensions: RiskDimension[], source: string): void {
    this.log('change', `Dimensions changed (source: ${source})`);
    this.compareDimensions('change', 'old', oldDimensions, 'new', newDimensions);
  }
  
  /**
   * Log validation of priorities before saving
   */
  logValidatePriorities(priorities: RiskPriorities, isValid: boolean, issues?: string[]): void {
    if (isValid) {
      this.log('validate', 'Risk priorities validated successfully');
    } else {
      this.error('validate', 'Risk priorities validation failed:', issues);
    }
  }
}

// Export a singleton instance
const riskScoreLogger = new RiskScoreLogger();
export default riskScoreLogger;
