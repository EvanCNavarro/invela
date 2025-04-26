/**
 * StandardizedFormField Component
 * 
 * A standardized component for rendering form fields based on their type.
 * This is used by the StandardizedUniversalForm component.
 */

import React from 'react';
import { FormField } from '@/services/formService';
import {
  FormControl,
  FormDescription,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StandardizedFormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export function StandardizedFormField({
  field,
  value,
  onChange,
  disabled = false,
}: StandardizedFormFieldProps) {
  const helpText = field.helpText || field.help_text;

  // Generate a form field ID that can be used for the label's htmlFor attribute
  const fieldId = `field-${field.key}`;

  // Render different form field based on the field type
  const renderFormControl = () => {
    switch (field.type.toLowerCase()) {
      case 'text':
      case 'string':
        return (
          <FormControl>
            <Input
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </FormControl>
        );
      
      case 'number':
        return (
          <FormControl>
            <Input
              id={fieldId}
              type="number"
              value={value === undefined || value === null ? '' : value}
              onChange={(e) => onChange(e.target.valueAsNumber || null)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </FormControl>
        );
      
      case 'textarea':
      case 'long_text':
        return (
          <FormControl>
            <Textarea
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              rows={5}
            />
          </FormControl>
        );
      
      case 'checkbox':
      case 'boolean':
        return (
          <FormControl>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={fieldId}
                checked={!!value}
                onCheckedChange={onChange}
                disabled={disabled}
              />
              <label
                htmlFor={fieldId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label}
              </label>
            </div>
          </FormControl>
        );
      
      case 'select':
      case 'dropdown':
        return (
          <FormControl>
            <Select
              value={value || ''}
              onValueChange={onChange}
              disabled={disabled}
            >
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
        );
      
      case 'radio':
      case 'radio_group':
        return (
          <FormControl>
            <RadioGroup
              value={value || ''}
              onValueChange={onChange}
              disabled={disabled}
              className="space-y-2"
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem id={`${fieldId}-${option.value}`} value={option.value} />
                  <label
                    htmlFor={`${fieldId}-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
        );
      
      case 'switch':
      case 'toggle':
        return (
          <FormControl>
            <div className="flex items-center space-x-2">
              <Switch
                id={fieldId}
                checked={!!value}
                onCheckedChange={onChange}
                disabled={disabled}
              />
              <label
                htmlFor={fieldId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label}
              </label>
            </div>
          </FormControl>
        );
      
      default:
        return (
          <FormControl>
            <Input
              id={fieldId}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </FormControl>
        );
    }
  };

  // For boolean field types like checkbox and switch, we don't want to render the label separately
  const shouldRenderLabel = !['checkbox', 'boolean', 'switch', 'toggle'].includes(field.type.toLowerCase());

  return (
    <ShadcnFormField
      name={field.key}
      render={() => (
        <FormItem className="space-y-2">
          {shouldRenderLabel && (
            <div className="flex items-center space-x-2">
              <FormLabel htmlFor={fieldId} className="text-base">
                {field.label}
                {field.validation?.required && <span className="text-destructive">*</span>}
              </FormLabel>
              
              {(field.tooltip || helpText) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{field.tooltip || helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          
          {field.question && (
            <FormDescription className="text-sm mt-0 mb-2">
              {field.questionNumber !== undefined && (
                <span className="font-semibold">{field.questionNumber}. </span>
              )}
              {field.question}
            </FormDescription>
          )}
          
          {renderFormControl()}
          
          {helpText && !field.tooltip && shouldRenderLabel && (
            <FormDescription className="text-xs">{helpText}</FormDescription>
          )}
          
          {field.answerExpectation && (
            <FormDescription className="text-xs italic">
              <span className="font-medium">Expected:</span> {field.answerExpectation}
            </FormDescription>
          )}
          
          <FormMessage />
        </FormItem>
      )}
    />
  );
}