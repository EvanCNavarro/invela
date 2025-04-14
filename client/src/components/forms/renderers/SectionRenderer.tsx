import React, { useMemo, useCallback, memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormSection as ServiceFormSection, FormField } from '../../../services/formService';
import { FormSection as NavigationFormSection } from '../SectionNavigation';
import { TaskTemplateWithConfigs } from '../../../services/taskTemplateService';
import { sortFields } from '../../../utils/formUtils';
import { FieldRenderer } from '../field-renderers/FieldRenderer';

// Define which FormSection implementation to use
type FormSection = NavigationFormSection;

interface SectionRendererProps {
  section: NavigationFormSection;
  template: TaskTemplateWithConfigs;
  form: UseFormReturn<any>;
  onFieldChange?: (name: string, value: any) => void;
}

// Base component for rendering form sections
const SectionRendererBase = ({
  section,
  template,
  form,
  onFieldChange
}: SectionRendererProps) => {
  // Extract section configuration from template - memoized to avoid recalculation on each render
  const globalConfig = useMemo(() => {
    return template.configurations
      .filter(config => config.scope === 'global')
      .reduce((acc, curr) => {
        acc[curr.config_key] = curr.config_value;
        return acc;
      }, {} as Record<string, any>);
  }, [template.configurations]);
  
  const sectionConfig = useMemo(() => {
    return template.configurations
      .filter(config => config.scope === 'section' && config.scope_target === section.id)
      .reduce((acc, curr) => {
        acc[curr.config_key] = curr.config_value;
        return acc;
      }, {} as Record<string, any>);
  }, [template.configurations, section.id]);
  
  // Merge configurations with section-specific overriding global - memoized
  const mergedConfig = useMemo(() => {
    return { ...globalConfig, ...sectionConfig };
  }, [globalConfig, sectionConfig]);
  
  // Sort fields by order property - memoized to avoid sorting on each render
  const sortedFields = useMemo(() => {
    if (!section.fields || section.fields.length === 0) {
      console.warn(`No fields found for section ${section.id} (${section.title})`);
      return [];
    }
    console.log(`Fields for section ${section.id} (${section.title}):`, section.fields);
    return section.fields ? sortFields(section.fields as FormField[]) : [];
  }, [section.fields, section.id, section.title]);
  
  return (
    <div className="w-full">
      <div className="mb-5">
        <h3 className="text-lg font-semibold">{sectionConfig.sectionTitle || section.title}</h3>
        {section.description && (
          <p className="text-sm text-gray-500">{sectionConfig.sectionDescription || section.description}</p>
        )}
      </div>
      
      <div className="space-y-6">
        {sortedFields.map(field => {
          // Create memoized callback for each field
          const handleFieldChange = useCallback((val: any) => {
            onFieldChange?.(field.key, val);
          }, [field.key, onFieldChange]);
          
          return (
            <div key={field.key} className="mb-8 last:mb-0">
              <FieldRenderer
                field={field}
                template={template}
                form={form}
                onFieldChange={handleFieldChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom comparison function for memoization
const areEqual = (prevProps: SectionRendererProps, nextProps: SectionRendererProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.section.id === nextProps.section.id &&
    prevProps.template.id === nextProps.template.id &&
    prevProps.form === nextProps.form &&
    prevProps.onFieldChange === nextProps.onFieldChange &&
    JSON.stringify(prevProps.section.fields) === JSON.stringify(nextProps.section.fields)
  );
};

// Memoized version of the SectionRenderer component
export const SectionRenderer = memo(SectionRendererBase, areEqual);