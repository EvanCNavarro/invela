/**
 * Tutorial Cache Utility
 * 
 * This utility provides methods to cache and retrieve tutorial state information
 * in localStorage. It helps reduce the flash that occurs when loading completed tutorials
 * by allowing us to make faster decisions before API calls complete.
 */

import { createTutorialLogger } from './tutorial-logger';

// Create a dedicated logger for the cache system
const logger = createTutorialLogger('TutorialCache');

// Local storage key for tutorial cache
const TUTORIAL_CACHE_KEY = 'invela-tutorial-cache';

// Cache entry timeout in milliseconds (24 hours)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Structure of a single tutorial cache entry
 */
interface TutorialCacheEntry {
  tabName: string;
  completed: boolean;
  currentStep: number;
  timestamp: number;
}

/**
 * Structure of the entire tutorial cache
 */
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
    const cachedDataString = localStorage.getItem(TUTORIAL_CACHE_KEY);
    
    if (!cachedDataString) {
      logger.debug('No cache found, initializing new cache');
      return initializeCache(userId);
    }
    
    const cachedData = JSON.parse(cachedDataString) as TutorialCache;
    
    // If the cache is for a different user, create a new one
    if (cachedData.userId !== userId) {
      logger.debug(`User ID mismatch in cache (cached: ${cachedData.userId}, current: ${userId}), reinitializing`);
      return initializeCache(userId);
    }
    
    return cachedData;
  } catch (error) {
    logger.error('Error retrieving cache from localStorage', error);
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
    logger.debug('Cache saved successfully', { userId: cache.userId, entryCount: Object.keys(cache.entries).length });
  } catch (error) {
    logger.error('Error saving cache to localStorage', error);
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
  try {
    const cache = getCache(userId);
    const now = Date.now();
    
    // Create or update the cache entry
    cache.entries[tabName] = {
      tabName,
      completed,
      currentStep,
      timestamp: now
    };
    
    // Clean up expired entries
    Object.keys(cache.entries).forEach(key => {
      const entry = cache.entries[key];
      if (now - entry.timestamp > CACHE_EXPIRY_MS) {
        logger.debug(`Removing expired cache entry for tab: ${key}`);
        delete cache.entries[key];
      }
    });
    
    saveCache(cache);
    logger.debug(`Cached tutorial state for tab: ${tabName}`, { completed, currentStep });
  } catch (error) {
    logger.error(`Error caching tutorial state for tab: ${tabName}`, error);
  }
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
): TutorialCacheEntry | null {
  try {
    const cache = getCache(userId);
    const entry = cache.entries[tabName];
    
    if (!entry) {
      logger.debug(`No cached state found for tab: ${tabName}`);
      return null;
    }
    
    // Check if the entry is expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      logger.debug(`Cache entry for tab: ${tabName} has expired`);
      delete cache.entries[tabName];
      saveCache(cache);
      return null;
    }
    
    logger.debug(`Retrieved cached state for tab: ${tabName}`, entry);
    return entry;
  } catch (error) {
    logger.error(`Error retrieving cached state for tab: ${tabName}`, error);
    return null;
  }
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
  try {
    const cache = getCache(userId);
    
    if (tabName in cache.entries) {
      delete cache.entries[tabName];
      saveCache(cache);
      logger.debug(`Cleared cache for tab: ${tabName}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache for tab: ${tabName}`, error);
  }
}

/**
 * Clear the entire tutorial cache for the current user
 * 
 * @param userId - The ID of the current user
 */
export function clearAllCachedTutorialState(userId: number | null): void {
  try {
    const cache = initializeCache(userId);
    saveCache(cache);
    logger.debug('Cleared all tutorial cache entries');
  } catch (error) {
    logger.error('Error clearing all tutorial cache entries', error);
  }
}