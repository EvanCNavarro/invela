/**
 * Tutorial Cache Utility
 * 
 * This utility provides methods to cache and retrieve tutorial state information
 * in localStorage. It helps reduce the flash that occurs when loading completed tutorials
 * by allowing us to make faster decisions before API calls complete.
 */

import { createTutorialLogger } from './tutorial-logger';

// Create a dedicated logger for the tutorial cache
const logger = createTutorialLogger('TutorialCache');

// The key used for storing the tutorial cache in localStorage
const TUTORIAL_CACHE_KEY = 'invela_tutorial_cache';

// Maximum age of cache entries in milliseconds (12 hours)
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000;

// Type definitions for the tutorial cache
interface TutorialCacheEntry {
  tabName: string;
  completed: boolean;
  currentStep: number;
  timestamp: number;
}

interface TutorialCache {
  entries: Record<string, TutorialCacheEntry>;
  userId: number | null;
}

/**
 * Initialize the tutorial cache
 * 
 * @param userId - The ID of the current user
 * @returns The initialized cache
 */
function initializeCache(userId: number | null): TutorialCache {
  logger.info('Initializing tutorial cache for user', userId);
  return {
    entries: {},
    userId
  };
}

/**
 * Get the tutorial cache from localStorage
 * 
 * @param userId - The ID of the current user
 * @returns The tutorial cache for the current user
 */
function getCache(userId: number | null): TutorialCache {
  try {
    const cacheString = localStorage.getItem(TUTORIAL_CACHE_KEY);
    if (!cacheString) {
      return initializeCache(userId);
    }

    const cache = JSON.parse(cacheString) as TutorialCache;
    
    // If the user ID doesn't match, reset the cache
    if (cache.userId !== userId) {
      logger.info('User ID mismatch, resetting cache', { 
        cachedUserId: cache.userId, 
        currentUserId: userId 
      });
      return initializeCache(userId);
    }
    
    // Clean up expired entries
    const now = Date.now();
    let entriesRemoved = 0;
    
    Object.keys(cache.entries).forEach(key => {
      const entry = cache.entries[key];
      if (now - entry.timestamp > CACHE_MAX_AGE) {
        delete cache.entries[key];
        entriesRemoved++;
      }
    });
    
    if (entriesRemoved > 0) {
      logger.debug(`Removed ${entriesRemoved} expired cache entries`);
    }
    
    return cache;
  } catch (error) {
    logger.error('Error retrieving tutorial cache', error);
    return initializeCache(userId);
  }
}

/**
 * Save the tutorial cache to localStorage
 * 
 * @param cache - The tutorial cache to save
 */
function saveCache(cache: TutorialCache): void {
  try {
    localStorage.setItem(TUTORIAL_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    logger.error('Error saving tutorial cache', error);
  }
}

/**
 * Cache the state of a tutorial
 * 
 * @param userId - The ID of the current user
 * @param tabName - The name of the tab (tutorial)
 * @param completed - Whether the tutorial is completed
 * @param currentStep - The current step of the tutorial
 */
export function cacheTutorialState(
  userId: number | null,
  tabName: string,
  completed: boolean,
  currentStep: number
): void {
  const cache = getCache(userId);
  
  cache.entries[tabName] = {
    tabName,
    completed,
    currentStep,
    timestamp: Date.now()
  };
  
  logger.debug(`Cached tutorial state for tab "${tabName}"`, { 
    completed, 
    currentStep 
  });
  
  saveCache(cache);
}

/**
 * Get the cached state of a tutorial
 * 
 * @param userId - The ID of the current user
 * @param tabName - The name of the tab (tutorial)
 * @returns The cached tutorial state or null if not found
 */
export function getCachedTutorialState(
  userId: number | null,
  tabName: string
): { completed: boolean; currentStep: number } | null {
  const cache = getCache(userId);
  const entry = cache.entries[tabName];
  
  if (!entry) {
    logger.debug(`No cached state found for tab "${tabName}"`);
    return null;
  }
  
  logger.debug(`Retrieved cached state for tab "${tabName}"`, { 
    completed: entry.completed, 
    currentStep: entry.currentStep,
    age: Math.round((Date.now() - entry.timestamp) / 1000) + 's'
  });
  
  return {
    completed: entry.completed,
    currentStep: entry.currentStep
  };
}

/**
 * Clear the tutorial cache for a specific tab
 * 
 * @param userId - The ID of the current user
 * @param tabName - The name of the tab (tutorial) to clear
 */
export function clearCachedTutorialState(
  userId: number | null,
  tabName: string
): void {
  const cache = getCache(userId);
  
  if (cache.entries[tabName]) {
    delete cache.entries[tabName];
    logger.debug(`Cleared cached state for tab "${tabName}"`);
    saveCache(cache);
  }
}

/**
 * Clear the entire tutorial cache for the current user
 * 
 * @param userId - The ID of the current user
 */
export function clearAllCachedTutorialState(userId: number | null): void {
  const cache = initializeCache(userId);
  logger.info('Cleared all cached tutorial states');
  saveCache(cache);
}