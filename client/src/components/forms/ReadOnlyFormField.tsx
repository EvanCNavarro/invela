/**
 * ReadOnlyFormField Component
 * 
 * A wrapper for StandardizedFormField that properly handles read-only state.
 * This component ensures consistent read-only rendering across all form field types.
 */

import React from 'react';
import { FormField } from '@/services/formService';
import { StandardizedFormField } from './StandardizedFormField';
import { useFormState } from './FormStateManager';
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface ReadOnlyFormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  forceReadOnly?: boolean;
  showLockIcon?: boolean;
}

export function ReadOnlyFormField({
  field,
  value,
  onChange,
  disabled = false,
  forceReadOnly = false,
  showLockIcon = true,
}: ReadOnlyFormFieldProps) {
  // Get form state from context
  const { isReadOnly } = useFormState();
  
  // Determine if this field should be read-only
  const fieldIsReadOnly = isReadOnly || forceReadOnly;
  
  // If the field is not read-only, just render the normal field component
  if (!fieldIsReadOnly) {
    return (
      <StandardizedFormField
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  
  // Handle read-only rendering based on field type
  return (
    <ShadcnFormField
      name={field.key}
      render={() => (
        <FormItem className={cn(
          "space-y-2",
          "read-only-field",
          fieldIsReadOnly && "opacity-90"
        )}>
          <div className="flex items-center space-x-2">
            <FormLabel htmlFor={`field-${field.key}`} className="text-base text-gray-800">
              {field.label}
              {field.validation?.required && <span className="text-gray-500">*</span>}
            </FormLabel>
            
            {showLockIcon && (
              <Lock className="h-3 w-3 text-gray-400" />
            )}
          </div>
          
          {field.question && (
            <FormDescription className="text-sm mt-0 mb-2 text-gray-600">
              {field.questionNumber !== undefined && (
                <span className="font-semibold">{field.questionNumber}. </span>
              )}
              {field.question}
            </FormDescription>
          )}
          
          <FormControl>
            <div className="read-only-value-container p-2 bg-gray-50 border border-gray-200 rounded-md">
              <ReadOnlyFieldValue field={field} value={value} />
            </div>
          </FormControl>
          
          {field.helpText && (
            <FormDescription className="text-xs text-gray-500">{field.helpText}</FormDescription>
          )}
        </FormItem>
      )}
    />
  );
}

// Helper component to render field values in read-only mode
function ReadOnlyFieldValue({ field, value }: { field: FormField, value: any }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">No value provided</span>;
  }
  
  switch (field.type.toLowerCase()) {
    case 'text':
    case 'string':
    case 'number':
      return <span className="text-gray-700">{value}</span>;
      
    case 'textarea':
    case 'long_text':
      return (
        <div className="whitespace-pre-wrap text-gray-700">
          {value}
        </div>
      );
      
    case 'checkbox':
    case 'boolean':
    case 'switch':
    case 'toggle':
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
          value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        )}>
          {value ? 'Yes' : 'No'}
        </span>
      );
      
    case 'select':
    case 'dropdown':
      // Find the corresponding option label
      const option = field.options?.find(opt => opt.value === value);
      return (
        <span className="text-gray-700">
          {option ? option.label : value}
        </span>
      );
      
    case 'radio':
    case 'radio_group':
      // Find the corresponding option label
      const radioOption = field.options?.find(opt => opt.value === value);
      return (
        <span className="text-gray-700">
          {radioOption ? radioOption.label : value}
        </span>
      );
      
    default:
      return <span className="text-gray-700">{String(value)}</span>;
  }
}
