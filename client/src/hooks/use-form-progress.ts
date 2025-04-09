import { useState, useEffect, useMemo } from 'react';
import { FormSection } from '@/components/forms/SectionNavigation';
import type { FormField } from '@/services/formService';

export interface UseFormProgressOptions {
  sections: FormSection[];
  formData: Record<string, any>;
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

/**
 * A hook to manage form progress state across sections
 */
export function useFormProgress({
  sections,
  formData,
  fields,
  requiredOnly = true
}: UseFormProgressOptions): FormProgressState {
  const [activeSection, setActiveSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Record<string | number, boolean>>({});

  // Get fields for each section
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

  // Calculate if a section is complete - memoized to avoid circular dependencies
  const getSectionProgress = useMemo(() => {
    return (sectionId: string | number): number => {
      const sectionFieldList = sectionFields[sectionId] || [];
      if (sectionFieldList.length === 0) return 0;
  
      const relevantFields = requiredOnly 
        ? sectionFieldList.filter(field => field.validation?.required)
        : sectionFieldList;
      
      if (relevantFields.length === 0) return 0;
  
      const filledFields = relevantFields.filter(field => {
        const value = formData[field.key];
        return value !== undefined && value !== null && value !== '';
      });
  
      return Math.round((filledFields.length / relevantFields.length) * 100);
    };
  }, [sectionFields, formData, requiredOnly]);

  // Update completed sections state
  useEffect(() => {
    const newCompletedSections: Record<string | number, boolean> = {};
    
    sections.forEach(section => {
      const progress = getSectionProgress(section.id);
      newCompletedSections[section.id] = progress === 100;
    });
    
    setCompletedSections(newCompletedSections);
  }, [formData, sections, sectionFields, getSectionProgress]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalSections = sections.length;
    if (totalSections === 0) return 0;
    
    const completedCount = Object.values(completedSections).filter(Boolean).length;
    return Math.round((completedCount / totalSections) * 100);
  }, [completedSections, sections]);

  return {
    completedSections,
    overallProgress,
    activeSection,
    setActiveSection,
    getSectionProgress
  };
}

export default useFormProgress;