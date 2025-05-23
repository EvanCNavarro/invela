/**
 * ========================================
 * User Context Manager - Session State Management
 * ========================================
 * 
 * Centralized user context management for the enterprise risk assessment platform.
 * Provides consistent storage and retrieval of user session data, ensuring
 * proper data isolation and security across multi-tenant operations.
 * 
 * @module lib/user-context
 * @version 1.0.0
 * @since 2025-05-23
 */

import getLogger from '@/utils/logger';

const logger = getLogger('UserContext');

// Define interface for user context data
export interface UserContextData {
  userId?: number | string;
  companyId?: number | string;
  taskId?: number | string;
  [key: string]: any; // Allow other properties
}

/**
 * User Context Manager - Singleton for managing user context
 */
class UserContextManager {
  private storageKey = 'user-context';
  
  /**
   * Get the current user context from storage
   */
  getContext(): UserContextData {
    try {
      const contextData = sessionStorage.getItem(this.storageKey);
      if (contextData) {
        return JSON.parse(contextData);
      }
    } catch (error) {
      logger.error('Error reading user context:', error);
    }
    
    return {};
  }
  
  /**
   * Set or update user context data
   * @param data User context data to store
   */
  setContext(data: UserContextData): void {
    try {
      // Merge with existing data instead of replacing
      const existingData = this.getContext();
      const mergedData = { ...existingData, ...data };
      
      // Log important context changes for debugging
      if (data.companyId && data.companyId !== existingData.companyId) {
        logger.info(`Company context changed to: ${data.companyId}`);
      }
      
      // Store in session storage
      sessionStorage.setItem(this.storageKey, JSON.stringify(mergedData));
    } catch (error) {
      logger.error('Error setting user context:', error);
    }
  }
  
  /**
   * Get the current company ID
   */
  getCompanyId(): number | undefined {
    const context = this.getContext();
    if (context.companyId) {
      // Convert to number if it's a string
      return typeof context.companyId === 'string' 
        ? parseInt(context.companyId, 10) 
        : context.companyId as number;
    }
    return undefined;
  }
  
  /**
   * Update the company ID
   * @param companyId The company ID to set
   */
  setCompanyId(companyId: number | string): void {
    this.setContext({ companyId });
  }
  
  /**
   * Clear all user context data
   */
  clearContext(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
      logger.info('User context cleared');
    } catch (error) {
      logger.error('Error clearing user context:', error);
    }
  }
}

// Export a singleton instance
export const userContext = new UserContextManager();

// Export convenience functions
export const getCompanyId = (): number | undefined => userContext.getCompanyId();
export const setCompanyId = (id: number | string): void => userContext.setCompanyId(id);
