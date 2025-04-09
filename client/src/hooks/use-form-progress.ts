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

  // Calculate if a section is complete - optimized with caching
  const getSectionProgress = useCallback((sectionId: string | number): number => {
    // Convert the section ID to a string for consistent cache keys
    const cacheKey = String(sectionId);
    
    // Get the current form values
    const formValues = getFormValues();
    
    // Generate a unique key for the current form data state
    // This is a simplification - in a real implementation you might use a more sophisticated
    // approach to generate this key based on the relevant form values for this section
    const formDataHash = JSON.stringify(
      (sectionFields[sectionId] || []).reduce((acc, field) => {
        acc[field.key] = formValues[field.key];
        return acc;
      }, {} as Record<string, any>)
    );
    
    // Check if we have a cached result for this section and form data state
    if (progressCacheRef.current[cacheKey]?.[formDataHash] !== undefined) {
      return progressCacheRef.current[cacheKey][formDataHash];
    }
    
    // If we're in a rapid section transition, return the cached value or 0
    // This prevents expensive calculations during quick navigation
    if (activeTransitionRef.current !== null) {
      // Return last known value if available, otherwise assume 0
      const lastKnownValues = progressCacheRef.current[cacheKey];
      if (lastKnownValues) {
        const lastValue = Object.values(lastKnownValues)[0];
        return lastValue ?? 0;
      }
      return 0;
    }
    
    // Calculate the progress only if necessary
    const sectionFieldList = sectionFields[sectionId] || [];
    if (sectionFieldList.length === 0) return 0;

    const relevantFields = requiredOnly 
      ? sectionFieldList.filter(field => field.validation?.required)
      : sectionFieldList;
    
    if (relevantFields.length === 0) return 0;

    // Use the form values previously retrieved
    const filledFields = relevantFields.filter(field => {
      const value = formValues[field.key];
      return value !== undefined && value !== null && value !== '';
    });

    const progress = Math.round((filledFields.length / relevantFields.length) * 100);
    
    // Cache the result
    if (!progressCacheRef.current[cacheKey]) {
      progressCacheRef.current[cacheKey] = {};
    }
    progressCacheRef.current[cacheKey][formDataHash] = progress;
    
    return progress;
  }, [sectionFields, getFormValues, requiredOnly]);

  // Update completed sections state with throttling to prevent UI freezing
  useEffect(() => {
    // Skip updating during rapid transitions between sections
    if (activeTransitionRef.current !== null) {
      return;
    }
    
    // Debounce the update to reduce CPU load from frequent updates
    let timeoutId: number | null = null;
    
    const updateCompletedSections = () => {
      const newCompletedSections: Record<string | number, boolean> = {};
      
      sections.forEach(section => {
        const progress = getSectionProgress(section.id);
        newCompletedSections[section.id] = progress === 100;
      });
      
      setCompletedSections(newCompletedSections);
    };
    
    // Delay the update by 250ms to batch changes together
    timeoutId = window.setTimeout(updateCompletedSections, 250);
    
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [sections, sectionFields, getSectionProgress]); // Remove getFormValues to prevent excessive recalculations

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    // Skip calculation during rapid section changes
    if (activeTransitionRef.current !== null) {
      return 0; // Return placeholder value during transitions
    }
    
    const totalSections = sections.length;
    if (totalSections === 0) return 0;
    
    const completedCount = Object.values(completedSections).filter(Boolean).length;
    return Math.round((completedCount / totalSections) * 100);
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