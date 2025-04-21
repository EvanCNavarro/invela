import React, { useContext } from 'react';
import { useFormContext } from 'react-hook-form';
import { createEnhancedLogger } from '@/utils/enhanced-logger';
import { FormField } from '@/services/formService';
import { FormSection } from './SectionNavigation';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { TaskTemplateWithConfigs } from '@/services/taskTemplateService';

// Create a silent logger for this component - disable all logs
const logger = createEnhancedLogger('SectionContent', 'uiComponents', {
  disableAllLogs: true,
  preserveErrors: true  // Keep only critical errors
});

// Create a default empty template for use when no template is available
const DEFAULT_TEMPLATE: TaskTemplateWithConfigs = {
  id: 0,
  name: 'Default Template',
  description: 'Automatically generated default template',
  task_type: '',
  component_type: 'default', // Added missing component_type
  status: 'active',
  configurations: [],
  created_at: new Date(),
  updated_at: new Date()
};

// Props for the SectionContent component
interface SectionContentProps {
  section: FormSection;
  fields: FormField[];
  template?: TaskTemplateWithConfigs;
  onFieldChange: (name: string, value: any) => void;
  startingQuestionNumber?: number; // Add starting question number prop
  isSubmitted?: boolean; // Add isSubmitted prop to disable form fields
}

/**
 * Component to render the content of a single form section
 */
const SectionContent: React.FC<SectionContentProps> = ({
  section,
  fields,
  template,
  onFieldChange,
  startingQuestionNumber = 1,
  isSubmitted = false
}) => {
  // Try to get the form context from React Hook Form
  // If we're inside a FormProvider, this will give us the form methods
  const formContext = useFormContext();
  
  // Defensive checks to prevent runtime errors
  if (!section) {
    logger.error('Missing section data', { section });
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600 font-medium">Error: Missing section configuration</p>
        <p className="text-sm text-red-500">Could not render this section due to missing data.</p>
      </div>
    );
  }
  
  if (!Array.isArray(fields)) {
    logger.error(`Invalid or missing fields array for section "${section?.title || 'unknown'}"`, { fields });
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-600 font-medium">Warning: No fields available</p>
        <p className="text-sm text-yellow-500">This section has no fields to display.</p>
      </div>
    );
  }
  
  // Log section info for debugging
  logger.debug(`Rendering section content for "${section.title}" with ${fields.length} fields`);
  
  // Use the default template if none was provided
  const safeTemplate = template || DEFAULT_TEMPLATE;
  
  // Sort fields by order if present - with extra safety checks
  const sortedFields = [...fields].sort((a, b) => {
    // Make sure we have valid field objects
    if (!a || !b) return 0;
    return (a.order || 0) - (b.order || 0);
  });
  
  // Use diagnostic mode if form context is not available
  const isDiagnosticMode = !formContext;
  
  if (isDiagnosticMode) {
    logger.warn(`Section "${section.title}" rendering in diagnostic mode due to missing form context`);
  }
  
  return (
    <div className="space-y-6 w-full">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-gray-600">
            {section.description}
          </p>
        )}
      </div>
      
      {/* Fields list - fully responsive container */}
      <div className="space-y-8 w-full">
        {sortedFields.map((field, index) => (
          <div key={field.key} className="w-full transition-all duration-300">
            <FieldRenderer 
              field={{
                ...field,
                questionNumber: startingQuestionNumber + index // Use the starting number plus index for sequential numbering
              }}
              template={safeTemplate}
              form={formContext || {
                // Provide a safe fallback for diagnostic mode
                control: null,
                formState: { errors: {} },
                getValues: () => ({}),
                setValue: () => ({})
              }}
              onFieldChange={(value) => onFieldChange(field.key, value)}
              isSubmitted={isSubmitted}
            />
          </div>
        ))}
        
        {/* Empty state if no fields */}
        {sortedFields.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <p>No fields found in this section.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionContent;
