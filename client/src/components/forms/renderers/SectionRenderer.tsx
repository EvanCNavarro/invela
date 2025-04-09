import React, { useState, useMemo, useCallback, memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  // State for section collapse
  const [collapsed, setCollapsed] = useState(section.collapsed || false);
  
  // Extract section configuration from template - memoized to avoid recalculation on each render
  const globalConfig = useMemo(() => {
    // console.log(`Computing global config for section ${section.id}`);
    return template.configurations
      .filter(config => config.scope === 'global')
      .reduce((acc, curr) => {
        acc[curr.config_key] = curr.config_value;
        return acc;
      }, {} as Record<string, any>);
  }, [template.configurations]);
  
  const sectionConfig = useMemo(() => {
    // console.log(`Computing section config for section ${section.id}`);
    return template.configurations
      .filter(config => config.scope === 'section' && config.scope_target === section.id)
      .reduce((acc, curr) => {
        acc[curr.config_key] = curr.config_value;
        return acc;
      }, {} as Record<string, any>);
  }, [template.configurations, section.id]);
  
  // Merge configurations with section-specific overriding global - memoized
  const mergedConfig = useMemo(() => {
    // console.log(`Merging configs for section ${section.id}`);
    return { ...globalConfig, ...sectionConfig };
  }, [globalConfig, sectionConfig]);
  
  // Get animation speed from config
  const animationSpeed = mergedConfig.animationSpeed || 'normal';
  
  // Sort fields by order property - memoized to avoid sorting on each render
  const sortedFields = useMemo(() => {
    // console.log(`Sorting fields for section ${section.id}`);
    return section.fields ? sortFields(section.fields as FormField[]) : [];
  }, [section.fields]);
  
  // Toggle section collapse - useCallback to maintain function reference identity
  const toggleCollapse = useCallback(() => {
    setCollapsed(prevState => !prevState);
  }, []);
  
  // Calculate transition duration based on animation speed - memoized
  const getTransitionDuration = useCallback(() => {
    switch (animationSpeed) {
      case 'fast':
        return 'duration-150';
      case 'slow':
        return 'duration-500';
      case 'normal':
      default:
        return 'duration-300';
    }
  }, [animationSpeed]);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{sectionConfig.sectionTitle || section.title}</CardTitle>
            {section.description && (
              <CardDescription>{sectionConfig.sectionDescription || section.description}</CardDescription>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={toggleCollapse} className="h-8 w-8 p-0">
            {collapsed ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <div
        className={`overflow-hidden transition-all ${getTransitionDuration()}`}
        style={{
          maxHeight: collapsed ? 0 : '2000px', // Arbitrary large value
          opacity: collapsed ? 0 : 1
        }}
      >
        <CardContent className="space-y-4">
          {sortedFields.map(field => {
            // Create memoized callback for each field
            const handleFieldChange = useCallback((val: any) => {
              onFieldChange?.(field.key, val);
            }, [field.key, onFieldChange]);
            
            return (
              <FieldRenderer
                key={field.key}
                field={field}
                template={template}
                form={form}
                onFieldChange={handleFieldChange}
              />
            );
          })}
        </CardContent>
      </div>
    </Card>
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