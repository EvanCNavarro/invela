import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormSection } from '../../../services/formService';
import { TaskTemplateWithConfigs } from '../../../services/taskTemplateService';
import { sortFields } from '../../../utils/formUtils';
import { FieldRenderer } from '../field-renderers/FieldRenderer';

interface SectionRendererProps {
  section: FormSection;
  template: TaskTemplateWithConfigs;
  form: UseFormReturn<any>;
  onFieldChange?: (name: string, value: any) => void;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  template,
  form,
  onFieldChange
}) => {
  // State for section collapse
  const [collapsed, setCollapsed] = useState(section.collapsed || false);
  
  // Extract section configuration from template
  const globalConfig = template.configurations
    .filter(config => config.scope === 'global')
    .reduce((acc, curr) => {
      acc[curr.config_key] = curr.config_value;
      return acc;
    }, {} as Record<string, any>);
  
  const sectionConfig = template.configurations
    .filter(config => config.scope === 'section' && config.scope_target === section.id)
    .reduce((acc, curr) => {
      acc[curr.config_key] = curr.config_value;
      return acc;
    }, {} as Record<string, any>);
  
  // Merge configurations with section-specific overriding global
  const mergedConfig = { ...globalConfig, ...sectionConfig };
  
  // Get animation speed from config
  const animationSpeed = mergedConfig.animationSpeed || 'normal';
  
  // Sort fields by order property
  const sortedFields = sortFields(section.fields);
  
  // Toggle section collapse
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };
  
  // Calculate transition duration based on animation speed
  const getTransitionDuration = () => {
    switch (animationSpeed) {
      case 'fast':
        return 'duration-150';
      case 'slow':
        return 'duration-500';
      case 'normal':
      default:
        return 'duration-300';
    }
  };
  
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
          {sortedFields.map(field => (
            <FieldRenderer
              key={field.key}
              field={field}
              template={template}
              form={form}
              onFieldChange={val => onFieldChange?.(field.key, val)}
            />
          ))}
        </CardContent>
      </div>
    </Card>
  );
};