import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FormSection } from '@/components/forms/SectionNavigation';
import type { FormField } from '@/services/formService';

export interface UseFormProgressOptions {
  sections: FormSection[];
  getFormValues: () => Record<string, any>;
  fields: FormField[];
  requiredOnly?: boolean;
}

export interface FormProgressState {
  completedSections: Record<string | number, boolean>;
  overallProgress: number;
  activeSection: number;
  setActiveSection: (sectionIndex: number) => void;
  getSectionProgress: (sectionId: string | number) => number;
}

// Cache calculated section progress to prevent unnecessary recalculations
type ProgressCache = Record<string, Record<string, number>>;

/**
 * A hook to manage form progress state across sections
 * Optimized for performance to prevent freezing when navigating between steps
 */
export function useFormProgress({
  sections,
  getFormValues,
  fields,
  requiredOnly = true
}: UseFormProgressOptions): FormProgressState {
  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Record<string | number, boolean>>({});
  
  // Use a ref for progress cache to avoid triggering re-renders when updating the cache
  const progressCacheRef = useRef<ProgressCache>({});
  
  // If active section changes rapidly, use this ref to prevent stale closures
  const activeTransitionRef = useRef<number | null>(null);
  
  // Throttle rapid updates to prevent UI freezing
  const throttleTimerRef = useRef<number | null>(null);

  // Using a stable function reference for setting active section
  const handleSetActiveSection = useCallback((sectionIndex: number) => {
    // Record the transition in a ref to allow other effects to detect rapid changes
    activeTransitionRef.current = Date.now();
    
    // Cancel any pending throttled updates
    if (throttleTimerRef.current !== null) {
      window.clearTimeout(throttleTimerRef.current);
    }
    
    // Immediately update the active section for better UI response
    setActiveSection(sectionIndex);
    
    // Reset the transition timestamp after a short delay
    throttleTimerRef.current = window.setTimeout(() => {
      activeTransitionRef.current = null;
      throttleTimerRef.current = null;
    }, 300);
  }, []);

  // Get fields for each section - memoized to only recalculate when sections or fields change
  const sectionFields = useMemo(() => {
    return sections.reduce<Record<string | number, FormField[]>>((acc, section) => {
      if (Array.isArray(section.fields)) {
        // If section already has fields property with keys
        acc[section.id] = fields.filter(field => 
          section.fields?.includes(field.key)
        );
      } else {
        // Find fields that belong to this section
        acc[section.id] = fields.filter(field => field.section === section.title);
      }
      return acc;
    }, {});
  }, [sections, fields]);

  // Optimization constants
  const MAX_CACHE_ENTRIES = 20;     // Maximum entries per section cache
  const HASH_STRING_LIMIT = 50;     // Maximum length for string value in hash
  const CACHE_REUSE_TIMEOUT = 2000; // Milliseconds to keep using cached values
  
  // Last calculation timestamp to throttle expensive updates even more
  const lastCalculationRef = useRef<Record<string, number>>({});
  
  // Calculate if a section is complete - extreme optimization with aggressive caching
  const getSectionProgress = useCallback((sectionId: string | number): number => {
    // Convert the section ID to a string for consistent cache keys
    const cacheKey = String(sectionId);
    
    // OPTIMIZATION 1: Return cached values during transitions or when calculations are too frequent
    const now = Date.now();
    const lastCalculation = lastCalculationRef.current[cacheKey] || 0;
    const isRapidRecalculation = (now - lastCalculation) < CACHE_REUSE_TIMEOUT;
    
    if (activeTransitionRef.current !== null || isRapidRecalculation) {
      const lastKnownValues = progressCacheRef.current[cacheKey];
      if (lastKnownValues && Object.keys(lastKnownValues).length > 0) {
        // Use the most recent cached value
        const values = Object.values(lastKnownValues);
        return values[values.length - 1] ?? 0;
      }
      return 0; // Default value when no cache exists
    }
    
    // Update last calculation timestamp
    lastCalculationRef.current[cacheKey] = now;
    
    // OPTIMIZATION 2: Early return for empty sections
    const sectionFieldList = sectionFields[sectionId] || [];
    if (sectionFieldList.length === 0) return 0;

    // OPTIMIZATION 3: Lazy evaluation - only get form values when actually needed
    const formValues = getFormValues();
    
    // OPTIMIZATION 4: Filter relevant fields only once
    const relevantFields = requiredOnly 
      ? sectionFieldList.filter(field => field.validation?.required)
      : sectionFieldList;
    
    if (relevantFields.length === 0) return 0;
    
    // OPTIMIZATION 5: Ultra-efficient hash generation
    let hashKeys = '';
    let hashValues = '';
    
    // Directly build strings instead of using array operations and joins
    for (let i = 0; i < relevantFields.length; i++) {
      const field = relevantFields[i];
      hashKeys += field.key + (i < relevantFields.length - 1 ? ',' : '');
      
      const value = formValues[field.key];
      // Convert to string and limit length
      const valueStr = value !== undefined && value !== null 
        ? String(value).substring(0, HASH_STRING_LIMIT) 
        : '';
      hashValues += valueStr + (i < relevantFields.length - 1 ? '|' : '');
    }
    
    const formDataHash = `${hashKeys}:${hashValues}`;
    
    // OPTIMIZATION 6: Direct cache lookup without optional chaining for speed
    const sectionCache = progressCacheRef.current[cacheKey];
    if (sectionCache && sectionCache[formDataHash] !== undefined) {
      return sectionCache[formDataHash];
    }
    
    // OPTIMIZATION 7: Count filled fields with single-pass direct comparison
    let filledCount = 0;
    for (const field of relevantFields) {
      const value = formValues[field.key];
      if (value !== undefined && value !== null && value !== '') {
        filledCount++;
      }
    }

    const progress = Math.round((filledCount / relevantFields.length) * 100);
    
    // OPTIMIZATION 8: Fast cache creation with pre-check
    if (!progressCacheRef.current[cacheKey]) {
      progressCacheRef.current[cacheKey] = {};
    }
    
    // OPTIMIZATION 9: Efficient cache limit enforcement for memory management
    const cacheObj = progressCacheRef.current[cacheKey];
    const cacheKeys = Object.keys(cacheObj);
    
    if (cacheKeys.length >= MAX_CACHE_ENTRIES) {
      // Remove oldest 20% of entries in bulk for better performance
      const removeCount = Math.max(1, Math.floor(MAX_CACHE_ENTRIES * 0.2));
      for (let i = 0; i < removeCount; i++) {
        delete cacheObj[cacheKeys[i]];
      }
    }
    
    // Store the result in cache
    cacheObj[formDataHash] = progress;
    
    return progress;
  }, [sectionFields, requiredOnly]); // Important: keep getFormValues out of dependencies

  // Last updated timestamp to prevent excessive recalculation
  const lastUpdateRef = useRef<number>(0);
  // Store pending update info
  const pendingUpdateRef = useRef<{timeoutId: number | null; timestamp: number | null}>({
    timeoutId: null,
    timestamp: null
  });
  
  // Update completed sections state with aggressive throttling
  useEffect(() => {
    // Skip updating during rapid transitions between sections
    if (activeTransitionRef.current !== null) {
      return;
    }
    
    const now = Date.now();
    // Only recalculate once per 1000ms at most (aggressive throttling)
    const MIN_UPDATE_INTERVAL = 1000;
    
    // If an update is too recent, skip it completely
    if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
      // If there's already a pending update that's scheduled later, keep it
      if (pendingUpdateRef.current.timestamp !== null && 
          pendingUpdateRef.current.timestamp > now) {
        return;
      }
      
      // Cancel any existing update
      if (pendingUpdateRef.current.timeoutId !== null) {
        window.clearTimeout(pendingUpdateRef.current.timeoutId);
      }
      
      // Schedule a delayed update at the next available interval
      const nextUpdateTime = lastUpdateRef.current + MIN_UPDATE_INTERVAL - now + 50; // add 50ms buffer
      
      const updateCompletedSections = () => {
        const newCompletedSections: Record<string | number, boolean> = {};
        
        // Process in batches to avoid long-running operations
        for (let i = 0; i < sections.length; i++) {
          const progress = getSectionProgress(sections[i].id);
          newCompletedSections[sections[i].id] = progress === 100;
          
          // Allow browser to process other tasks if we're taking too long
          if (i > 0 && i % 3 === 0 && Date.now() - now > 50) {
            break; // Stop processing for now to prevent UI freeze
          }
        }
        
        setCompletedSections(prev => ({...prev, ...newCompletedSections}));
        
        // Update timestamp and clear pending refs
        lastUpdateRef.current = Date.now();
        pendingUpdateRef.current.timeoutId = null;
        pendingUpdateRef.current.timestamp = null;
      };
      
      // Queue update
      pendingUpdateRef.current.timeoutId = window.setTimeout(updateCompletedSections, nextUpdateTime);
      pendingUpdateRef.current.timestamp = now + nextUpdateTime;
      
      return;
    }
    
    // If we get here, we're outside the throttling window and can update immediately
    const updateCompletedSections = () => {
      const newCompletedSections: Record<string | number, boolean> = {};
      
      sections.forEach(section => {
        const progress = getSectionProgress(section.id);
        newCompletedSections[section.id] = progress === 100;
      });
      
      setCompletedSections(newCompletedSections);
      lastUpdateRef.current = Date.now();
    };
    
    // Immediate update (still slightly delayed to batch React state changes)
    pendingUpdateRef.current.timeoutId = window.setTimeout(updateCompletedSections, 50);
    
    return () => {
      if (pendingUpdateRef.current.timeoutId !== null) {
        window.clearTimeout(pendingUpdateRef.current.timeoutId);
        pendingUpdateRef.current.timeoutId = null;
        pendingUpdateRef.current.timestamp = null;
      }
    };
  }, [sections, getSectionProgress]); // Remove sectionFields dependency to prevent recalculation

  // Cache for overall progress to reduce recalculations
  const overallProgressCacheRef = useRef<{value: number; timestamp: number}>({
    value: 0,
    timestamp: 0
  });
  
  // Calculate overall progress with caching
  const overallProgress = useMemo(() => {
    const now = Date.now();
    
    // Skip calculation during rapid section changes or if we have a recent value
    if (activeTransitionRef.current !== null || 
        (now - overallProgressCacheRef.current.timestamp < 2000)) {
      return overallProgressCacheRef.current.value;
    }
    
    const totalSections = sections.length;
    if (totalSections === 0) return 0;
    
    // Optimize the filter operation
    let completedCount = 0;
    const completeValues = Object.values(completedSections);
    for (let i = 0; i < completeValues.length; i++) {
      if (completeValues[i] === true) {
        completedCount++;
      }
    }
    
    const progress = Math.round((completedCount / totalSections) * 100);
    
    // Update cache
    overallProgressCacheRef.current = {
      value: progress,
      timestamp: now
    };
    
    return progress;
  }, [completedSections, sections]);

  return {
    completedSections,
    overallProgress,
    activeSection,
    setActiveSection: handleSetActiveSection,
    getSectionProgress
  };
}

export default useFormProgress;