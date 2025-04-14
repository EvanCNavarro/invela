import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormField as FormFieldType } from '../../../services/formService';
import { TaskTemplateWithConfigs } from '../../../services/taskTemplateService';
import { getFieldComponentType } from '../../../utils/formUtils';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface FieldRendererProps {
  field: FormFieldType;
  template: TaskTemplateWithConfigs;
  form: UseFormReturn<any>;
  onFieldChange?: (value: any) => void;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  template,
  form,
  onFieldChange
}) => {
  // Check if we should use diagnostic rendering mode:
  // 1. When form is undefined or form.control is undefined (invalid form)
  // 2. When in a diagnostic context (window.location.pathname includes 'diagnostic')
  const isDiagnosticMode = !form || !form.control || 
    (typeof window !== 'undefined' && window.location.pathname.includes('diagnostic'));
    
  // Use a safe display mode for diagnostic/testing that avoids hooks and form registration
  if (isDiagnosticMode) {
    return (
      <div className="field-display-only mb-4 border-b pb-3">
        <div className="mb-1 font-semibold text-gray-700">{field.label || field.key}</div>
        {field.question && <div className="text-base mb-2">{field.question}</div>}
        {field.helpText && <div className="text-sm text-gray-500 mb-1">{field.helpText}</div>}
        <div className="border p-2 rounded bg-gray-50 mt-1">
          {field.value ? (
            <span>{field.value}</span>
          ) : (
            <span className="text-gray-400 italic">Empty field</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Field type: {field.type || 'text'}, Key: {field.key}, Section: {field.section || 'none'}
        </div>
      </div>
    );
  }
  // Extract field configuration from template, with safeguards for missing properties
  const configurations = template?.configurations || [];
  
  // Default empty objects in case configurations are missing
  const globalConfig = configurations
    .filter(config => config?.scope === 'global')
    .reduce((acc, curr) => {
      if (curr?.config_key) {
        acc[curr.config_key] = curr.config_value;
      }
      return acc;
    }, {} as Record<string, any>);
  
  const fieldConfig = configurations
    .filter(config => config?.scope === 'field' && config?.scope_target === field.key)
    .reduce((acc, curr) => {
      if (curr?.config_key) {
        acc[curr.config_key] = curr.config_value;
      }
      return acc;
    }, {} as Record<string, any>);
  
  // Merge configurations with field-specific overriding global
  const mergedConfig = { ...globalConfig, ...fieldConfig };
  
  // Get the component type based on configuration
  const defaultFieldType = globalConfig?.defaultFieldType || 'single-line';
  const componentType = fieldConfig?.fieldType || getFieldComponentType(field, defaultFieldType);
  
  // Get tooltip position from configuration
  const tooltipPosition = mergedConfig.tooltipPosition || 'right';
  
  // Determine if field should show AI suggestions and risk analysis
  const enableAiSuggestions = mergedConfig.enableAiSuggestions === true;
  const enableRiskAnalysis = mergedConfig.enableRiskAnalysis === true;
  
  // Function to normalize field values to prevent controlled/uncontrolled input warnings
  const getNormalizedValue = (value: any, type: string): any => {
    // Ensure value is never undefined - always provide appropriate defaults by type
    if (value === undefined || value === null) {
      switch (type) {
        case 'checkbox':
          return false;
        case 'dropdown':
        case 'multi-line':
        case 'single-line':
        default:
          return ''; // Always return empty string, never undefined or null
      }
    }
    
    // Convert values to appropriate types for each field
    switch (type) {
      case 'checkbox':
        return Boolean(value); // Ensure boolean for checkboxes
      case 'dropdown':
        return String(value); // Ensure string for dropdowns
      case 'multi-line':
      case 'single-line':
      default:
        return String(value); // Ensure string for text inputs
    }
  };

  // Function to render the appropriate input component based on type
  const renderInputComponent = (fieldProps: any) => {
    // Always normalize the field value to ensure consistent types
    const normalizedValue = getNormalizedValue(fieldProps.value, componentType);
    
    // Create a modified fieldProps with normalized value
    const modifiedFieldProps = {
      ...fieldProps,
      value: normalizedValue,
      onChange: fieldProps.onChange  // Keep the original onChange handler
    };
    
    // Log normalized values for debugging
    // console.log(`[FieldRenderer] Field ${field.key} normalized value: "${normalizedValue}" (${typeof normalizedValue})`);
    
    switch (componentType) {
      case 'multi-line':
        return (
          <Textarea
            {...modifiedFieldProps}
            value={normalizedValue}  // Explicitly set value to ensure it's controlled
            placeholder={field.placeholder || ''}
            className="min-h-[120px] bg-white"
            onChange={(e) => {
              fieldProps.onChange(e);
              onFieldChange?.(e.target.value);
            }}
          />
        );
        
      case 'dropdown':
        return (
          <Select
            value={String(normalizedValue)}  // Ensure value is a string, never undefined
            onValueChange={(value) => {
              fieldProps.onChange(value);
              onFieldChange?.(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(field.options) && field.options.map((option, index) => {
                const value = typeof option === 'object' ? option.value : option;
                const label = typeof option === 'object' ? option.label : option;
                
                return (
                  <SelectItem key={index} value={String(value)}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );
        
      case 'checkbox':
        return (
          <Checkbox
            checked={Boolean(normalizedValue)}  // Explicitly convert to boolean
            onCheckedChange={(checked) => {
              fieldProps.onChange(checked);
              onFieldChange?.(checked);
            }}
          />
        );
        
      // Add more component types as needed
        
      case 'single-line':
      default:
        return (
          <Input
            {...modifiedFieldProps}
            value={normalizedValue}  // Explicitly set value to ensure it's controlled
            placeholder={field.placeholder || ''}
            className="bg-white"
            onChange={(e) => {
              fieldProps.onChange(e);
              onFieldChange?.(e.target.value);
            }}
          />
        );
    }
  };
  
  // Field with tooltip and risk analysis if applicable
  return (
    <FormField
      control={form.control}
      name={field.key}
      render={({ field: fieldProps }) => (
        <FormItem>
          {/* Question Field Container */}
          <div className="question-container">
            <div className="flex items-center gap-2 mb-1">
              {/* Label - gray color, regular boldness */}
              <FormLabel className="text-gray-600 font-normal">
                {field.label}
              </FormLabel>
              
              {field.helpText && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <InfoIcon className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side={tooltipPosition as any} className="max-w-[300px] text-sm text-wrap break-words">
                      {field.helpText}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Question - displayed below label and above field, black and bold */}
            {field.question && (
              <div className="mb-2 font-semibold text-black">
                {field.question}
              </div>
            )}
            
            <FormControl>
              {renderInputComponent(fieldProps)}
            </FormControl>
            
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
};