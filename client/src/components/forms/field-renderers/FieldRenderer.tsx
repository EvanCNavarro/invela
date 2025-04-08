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
  // Extract field configuration from template
  const globalConfig = template.configurations
    .filter(config => config.scope === 'global')
    .reduce((acc, curr) => {
      acc[curr.config_key] = curr.config_value;
      return acc;
    }, {} as Record<string, any>);
  
  const fieldConfig = template.configurations
    .filter(config => config.scope === 'field' && config.scope_target === field.key)
    .reduce((acc, curr) => {
      acc[curr.config_key] = curr.config_value;
      return acc;
    }, {} as Record<string, any>);
  
  // Merge configurations with field-specific overriding global
  const mergedConfig = { ...globalConfig, ...fieldConfig };
  
  // Get the component type based on configuration
  const defaultFieldType = globalConfig.defaultFieldType || 'single-line';
  const componentType = fieldConfig.fieldType || getFieldComponentType(field, defaultFieldType);
  
  // Get tooltip position from configuration
  const tooltipPosition = mergedConfig.tooltipPosition || 'right';
  
  // Determine if field should show AI suggestions and risk analysis
  const enableAiSuggestions = mergedConfig.enableAiSuggestions === true;
  const enableRiskAnalysis = mergedConfig.enableRiskAnalysis === true;
  
  // Function to render the appropriate input component based on type
  const renderInputComponent = (fieldProps: any) => {
    switch (componentType) {
      case 'multi-line':
        return (
          <Textarea
            {...fieldProps}
            placeholder={field.placeholder || ''}
            className="min-h-[120px]"
            onChange={(e) => {
              fieldProps.onChange(e);
              onFieldChange?.(e.target.value);
            }}
          />
        );
        
      case 'dropdown':
        return (
          <Select
            value={fieldProps.value || ''}
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
            checked={!!fieldProps.value}
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
            {...fieldProps}
            placeholder={field.placeholder || ''}
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
          <div className="flex items-center gap-2">
            <FormLabel>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            
            {field.helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side={tooltipPosition as any}>
                    {field.helpText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {enableRiskAnalysis && (
              <div className="ml-auto text-xs text-muted-foreground">
                {/* Risk score indicator would go here */}
                {/* We'll implement this in a separate component */}
              </div>
            )}
          </div>
          
          <FormControl>
            {renderInputComponent(fieldProps)}
          </FormControl>
          
          {enableAiSuggestions && (
            <div className="mt-1">
              <button
                type="button"
                className="text-xs text-primary hover:text-primary/80 flex items-center"
                onClick={async () => {
                  try {
                    // Get current task data (from context or props)
                    const taskId = form.getValues('taskId') || template.id;
                    const companyId = form.getValues('companyId') || 1; // Default to company 1 if not found
                    const currentFormData = form.getValues();
                    const currentStepIndex = form.getValues('currentStepIndex') || 0;
                    
                    // Make API request to get suggestions
                    const response = await fetch('/api/ai-suggestions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        companyId,
                        taskType: template.task_type,
                        stepIndex: currentStepIndex,
                        formData: currentFormData
                      }),
                    });
                    
                    if (!response.ok) {
                      throw new Error('Failed to get AI suggestions');
                    }
                    
                    const data = await response.json();
                    
                    if (data.success && data.suggestions && data.suggestions[field.key]) {
                      const suggestion = data.suggestions[field.key];
                      console.log(`[AI Suggestion] Got suggestion for ${field.key}:`, suggestion);
                      
                      // Apply the suggestion value to the form field
                      form.setValue(field.key, suggestion.value, { 
                        shouldValidate: true, 
                        shouldDirty: true 
                      });
                      
                      // Notify parent components of the change
                      onFieldChange?.(suggestion.value);
                    } else {
                      console.log(`[AI Suggestion] No suggestion available for ${field.key}`);
                    }
                  } catch (error) {
                    console.error('[AI Suggestion] Error getting suggestions:', error);
                  }
                }}
              >
                ✨ Get AI suggestions
              </button>
            </div>
          )}
          
          <FormDescription>
            {/* Additional description */}
          </FormDescription>
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
};