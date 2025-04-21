import React, { useState, useCallback } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info as InfoIcon } from 'lucide-react';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FormField as FormFieldType } from '@/services/formService';
import { TaskTemplateWithConfigs } from '@/services/taskTemplateService';

// Helper function to determine component type
function getFieldComponentType(field: FormFieldType, defaultType = 'single-line'): string {
  // If field has explicit component type, use that
  if (field.type) {
    // Map database field types to component types
    if (field.type.toUpperCase() === 'TEXTAREA') return 'multi-line';
    return field.type;
  }
  
  // Otherwise infer from field properties
  if (field.options) return 'dropdown';
  return defaultType;
}

// Props for the FieldRenderer component
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
  // State for tracking field focus
  const [isFocused, setIsFocused] = useState(false);
  
  // Check if we should use diagnostic rendering mode
  const isDiagnosticMode = !form || !form.control || 
    (typeof window !== 'undefined' && window.location.pathname.includes('diagnostic'));
    
  // Use a safe display mode for diagnostic/testing that avoids hooks and form registration
  if (isDiagnosticMode) {
    // In diagnostic mode, safely access field value using type assertion
    const fieldValue = (field as any).value;
    
    return (
      <div className="field-display-only mb-4 border-b pb-3">
        <div className="mb-1 font-semibold text-gray-700">{field.label || field.key}</div>
        {field.question && <div className="text-base mb-2">{field.question}</div>}
        {field.helpText && <div className="text-sm text-gray-500 mb-1">{field.helpText}</div>}
        <div className="border p-2 rounded bg-gray-50 mt-1">
          {fieldValue ? (
            <span>{fieldValue}</span>
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
  
  // Extract field configuration from template
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
  
  // If we don't have a valid form control, render a simplified version
  if (!form.control) {
    // Determine validation state (simplified version)
    const fieldValue = (field as any).value;
    const isFilled = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    
    // Default to gray bar, use green if filled
    const barColor = isFilled ? 'bg-green-500' : 'bg-gray-300';
    
    return (
      <div className="field-display flex relative">
        {/* Vertical bar for grouping */}
        <div className={`absolute left-0 top-0 w-1 h-full rounded-full ${barColor}`} />
        
        {/* Content with left padding to accommodate the bar */}
        <div className="pl-4 w-full">
          <div className="flex items-center gap-2 mb-1">
            <Label className="text-gray-600 font-normal">
              {field.label}
            </Label>
            
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
          
          {field.question && (
            <div className="mb-2 font-semibold text-black">
              {field.question}
            </div>
          )}
          
          <div className="bg-gray-100 p-3 rounded">
            {fieldValue || 'No value'}
          </div>
        </div>
      </div>
    );
  }
  
  // Function to normalize field values to prevent controlled/uncontrolled input warnings
  const getNormalizedValue = useCallback((value: any, type: string): any => {
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
  }, []);
  
  // Standard rendering with form control
  return (
    <FormField
      control={form.control}
      name={field.key}
      render={({ field: fieldProps }) => {
        // Get form state for validation styling
        const { formState } = form;
        const hasError = !!formState.errors[field.key];
        const fieldValue = form.getValues(field.key);
        const isFilled = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
        
        // Combine our focused state with active field
        const isActive = isFocused;
        
        // Determine validation state
        let validationState: 'default' | 'active' | 'success' | 'error' = 'default';
        if (hasError) validationState = 'error';
        else if (isFilled) validationState = 'success';
        else if (isActive) validationState = 'active';
        
        // Define styles based on validation state
        const borderClasses = {
          default: 'border-input',
          active: 'border-blue-500 ring-2 ring-blue-200',
          success: 'border-green-500',
          error: 'border-red-500'
        };
        
        // Define bar color based on validation state
        const barColorClasses = {
          default: 'bg-gray-300',
          active: 'bg-blue-500',
          success: 'bg-green-500',
          error: 'bg-red-500'
        };
        
        // Create event handlers for field focus and blur
        const handleFocus = () => {
          setIsFocused(true);
        };
        
        const handleBlur = () => {
          setIsFocused(false);
          try {
            // Try to call onBlur without arguments
            fieldProps.onBlur();
          } catch (error) {
            // If it fails, just ignore the error
            console.log('Ignoring onBlur error');
          }
        };
        
        // Create enhanced field props with focus tracking
        const enhancedFieldProps = {
          ...fieldProps,
          onFocus: handleFocus,
          onBlur: handleBlur
        };
        
        // Create a wrapper with validation icon
        const wrapWithValidation = (component: React.ReactNode) => {
          return (
            <div className="relative">
              {component}
              
              {/* Success validation icon */}
              {validationState === 'success' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 pointer-events-none">
                  <CheckCircle2 size={16} />
                </div>
              )}
              
              {/* Error validation icon */}
              {validationState === 'error' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 pointer-events-none">
                  <AlertCircle size={16} />
                </div>
              )}
            </div>
          );
        };
        
        // Render the appropriate input component based on type
        const renderInputComponent = () => {
          const normalizedValue = getNormalizedValue(fieldProps.value, componentType);
          
          switch (componentType) {
            case 'multi-line':
              return wrapWithValidation(
                <Textarea
                  {...enhancedFieldProps}
                  value={normalizedValue}
                  placeholder={field.placeholder || ''}
                  className={cn(
                    "min-h-[120px] bg-white pr-8",
                    borderClasses[validationState]
                  )}
                  onChange={(e) => {
                    fieldProps.onChange(e);
                    onFieldChange?.(e.target.value);
                  }}
                />
              );
              
            case 'dropdown':
              return (
                <Select
                  value={String(normalizedValue)}
                  onValueChange={(value) => {
                    fieldProps.onChange(value);
                    onFieldChange?.(value);
                  }}
                >
                  <SelectTrigger className={cn(borderClasses[validationState])}>
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                    {validationState === 'success' && (
                      <div className="ml-auto mr-1 text-green-500">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                    {validationState === 'error' && (
                      <div className="ml-auto mr-1 text-red-500">
                        <AlertCircle size={16} />
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(field.options) && field.options.map((option: any, index: number) => {
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(normalizedValue)}
                    className={cn({
                      'ring-2 ring-red-200': validationState === 'error',
                      'ring-2 ring-green-200': validationState === 'success'
                    })}
                    onCheckedChange={(checked) => {
                      fieldProps.onChange(checked);
                      onFieldChange?.(checked);
                    }}
                  />
                  {validationState === 'success' && (
                    <span className="text-green-500">
                      <CheckCircle2 size={16} />
                    </span>
                  )}
                  {validationState === 'error' && (
                    <span className="text-red-500">
                      <AlertCircle size={16} />
                    </span>
                  )}
                </div>
              );
              
            case 'single-line':
            default:
              return wrapWithValidation(
                <Input
                  {...enhancedFieldProps}
                  value={normalizedValue}
                  placeholder={field.placeholder || ''}
                  className={cn(
                    "bg-white pr-8",
                    borderClasses[validationState]
                  )}
                  onChange={(e) => {
                    fieldProps.onChange(e);
                    onFieldChange?.(e.target.value);
                  }}
                />
              );
          }
        };
        
        return (
          <FormItem>
            {/* Question Field Container with vertical bar */}
            <div className="question-container flex relative">
              {/* Vertical bar for grouping */}
              <div className={`absolute left-0 top-0 w-1 h-full rounded-full ${barColorClasses[validationState]}`} />
              
              {/* Question content with padding to make room for the bar */}
              <div className="pl-4 w-full">
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
                    {field.questionNumber ? `${field.questionNumber}. ${field.question}` : field.question}
                  </div>
                )}
                
                <FormControl>
                  {renderInputComponent()}
                </FormControl>
                
                <FormMessage />
              </div>
            </div>
          </FormItem>
        );
      }}
    />
  );
};

export default FieldRenderer;