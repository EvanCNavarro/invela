import { useState, useEffect, useCallback } from 'react';
import { FormSection } from '@/components/forms/SectionNavigation';
import type { FormField } from '@/services/formService';
import getLogger from '@/utils/logger';

// Logger instance for this module
const logger = getLogger('FormStatus', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

// TypeScript interfaces for our hook
export interface UseFormStatusOptions {
  sections: FormSection[];
  getFormValues: () => Record<string, any>;
  fields: FormField[];
  requiredOnly?: boolean;
  onChange?: (progress: number) => void;
}

export interface SectionStatus {
  id: string | number;
  title: string;
  totalFields: number;
  filledFields: number;
  remainingFields: number;
  progress: number; // 0-100
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface FormStatusState {
  sectionStatuses: SectionStatus[];
  completedSections: Record<string | number, boolean>;
  overallProgress: number;
  activeSection: number;
  setActiveSection: (sectionIndex: number) => void;
  refreshStatus: () => void;
}

/**
 * A simplified hook to calculate form status with direct field counting
 * No caching, throttling, or other optimizations that might cause state issues
 */
export function useFormStatus({
  sections,
  getFormValues,
  fields,
  requiredOnly = true,
  onChange
}: UseFormStatusOptions): FormStatusState {
  // Basic state for the active section
  const [activeSection, setActiveSection] = useState(0);
  
  // The main state that stores all form status information
  const [statusState, setStatusState] = useState<{
    sectionStatuses: SectionStatus[];
    completedSections: Record<string | number, boolean>;
    overallProgress: number;
  }>({
    sectionStatuses: [],
    completedSections: {},
    overallProgress: 0
  });

  // Map of fields by section for quick lookup
  const sectionFieldsMap = useCallback(() => {
    const map: Record<string | number, FormField[]> = {};
    
    // First, check if sections have fields attached directly
    const sectionsHaveFields = sections.length > 0 && 
                              sections[0].fields && 
                              sections[0].fields.length > 0;
    
    if (sectionsHaveFields) {
      // Use fields directly from sections if available
      sections.forEach(section => {
        map[section.id] = section.fields || [];
      });
      logger.debug(`Using fields from sections (${Object.keys(map).length} sections)`);
    } else {
      // Otherwise, filter fields by section ID
      sections.forEach(section => {
        map[section.id] = fields.filter(field => field.section === section.id);
      });
      logger.debug(`Built section fields map by filtering (${Object.keys(map).length} sections)`);
    }
    
    return map;
  }, [sections, fields]);

  // The core calculation function that updates all status information
  const calculateStatus = useCallback(() => {
    const formValues = getFormValues();
    const fieldsMap = sectionFieldsMap();
    const sectionStatuses: SectionStatus[] = [];
    const completedSections: Record<string | number, boolean> = {};
    let totalFields = 0;
    let totalFilledFields = 0;
    
    // Process each section
    sections.forEach(section => {
      const sectionFields = fieldsMap[section.id] || [];
      
      // Filter to only required fields if needed
      const relevantFields = requiredOnly 
        ? sectionFields.filter(field => field.validation?.required)
        : sectionFields;
      
      // Skip empty sections
      if (relevantFields.length === 0) {
        sectionStatuses.push({
          id: section.id,
          title: section.title,
          totalFields: 0,
          filledFields: 0,
          remainingFields: 0,
          progress: 0,
          status: 'not-started'
        });
        return;
      }
      
      // Count filled fields directly without caching
      let filledCount = 0;
      relevantFields.forEach(field => {
        const value = formValues[field.key];
        const isFilled = value !== undefined && value !== null && value !== '';
        if (isFilled) {
          filledCount++;
        }
      });
      
      // Update totals for overall progress calculation
      totalFields += relevantFields.length;
      totalFilledFields += filledCount;
      
      // Calculate progress and status
      const progress = relevantFields.length > 0 
        ? Math.round((filledCount / relevantFields.length) * 100) 
        : 0;
      
      const remainingFields = relevantFields.length - filledCount;
      
      // Simple, clear status determination
      let status: 'not-started' | 'in-progress' | 'completed';
      if (filledCount === 0) {
        status = 'not-started';
      } else if (filledCount === relevantFields.length) {
        status = 'completed';
      } else {
        status = 'in-progress';
      }
      
      // Important! This is the core check for section completion
      const isCompleted = filledCount === relevantFields.length && relevantFields.length > 0;
      completedSections[section.id] = isCompleted;
      
      // Build section status object
      sectionStatuses.push({
        id: section.id,
        title: section.title,
        totalFields: relevantFields.length,
        filledFields: filledCount,
        remainingFields: remainingFields,
        progress,
        status
      });
      
      // Log detailed analysis in debug mode
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Section "${section.title}" status:`, {
          totalFields: relevantFields.length,
          filledFields: filledCount,
          remainingFields,
          progress,
          status,
          isCompleted
        });
      }
    });
    
    // Calculate overall progress
    const overallProgress = totalFields > 0 
      ? Math.round((totalFilledFields / totalFields) * 100) 
      : 0;
    
    logger.debug(`Overall form progress: ${overallProgress}%`, {
      totalFields,
      totalFilledFields,
      completedSectionCount: Object.values(completedSections).filter(Boolean).length
    });
    
    // Update state with all calculated values
    setStatusState({
      sectionStatuses,
      completedSections,
      overallProgress
    });
    
    // Notify parent component if callback provided
    if (onChange) {
      onChange(overallProgress);
    }
    
  }, [getFormValues, sectionFieldsMap, sections, requiredOnly, onChange]);

  // The publicly exposed refresh function
  const refreshStatus = useCallback(() => {
    logger.debug('Manual refresh of form status triggered');
    calculateStatus();
  }, [calculateStatus]);

  // Initial calculation and recalculation when dependencies change
  useEffect(() => {
    logger.debug('Form status dependencies changed, recalculating');
    calculateStatus();
  }, [calculateStatus]);

  // Return all the status state and controls
  return {
    ...statusState,
    activeSection,
    setActiveSection,
    refreshStatus
  };
}
