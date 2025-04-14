import React from 'react';
import getLogger from '@/utils/logger';
import { FormField } from '@/services/formService';
import { FormSection } from './SectionNavigation';
import { FieldRenderer } from './field-renderers/FieldRenderer';

// Logger instance for this component
const logger = getLogger('SectionContent', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

// Props for the SectionContent component
interface SectionContentProps {
  section: FormSection;
  fields: FormField[];
  onFieldChange: (name: string, value: any) => void;
}

/**
 * Component to render the content of a single form section
 */
const SectionContent: React.FC<SectionContentProps> = ({
  section,
  fields,
  onFieldChange
}) => {
  // Log section info for debugging
  logger.debug(`Rendering section content for "${section.title}" with ${fields.length} fields`);
  
  // Sort fields by order if present
  const sortedFields = [...fields].sort((a, b) => 
    (a.order || 0) - (b.order || 0)
  );
  
  return (
    <div className="space-y-6">
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
      
      {/* Fields list */}
      <div className="space-y-6">
        {sortedFields.map((field) => (
          <FieldRenderer 
            key={field.key}
            field={field}
            onChange={(value) => onFieldChange(field.key, value)}
          />
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
