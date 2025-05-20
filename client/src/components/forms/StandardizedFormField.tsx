/**
 * StandardizedFormField Component
 * 
 * This component renders a standardized form field that works consistently
 * across different form types (KYB, KY3P, and Open Banking).
 */

import React from 'react';
import { FormField } from '@/services/formService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

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
  // Determine the field type
  const fieldType = field.type?.toLowerCase() || 'text';
  
  // Determine if the field is required
  const isRequired = field.required === true;
  
  // Generate a unique ID for the field
  const fieldId = `field-${field.key}`;
  
  // Render the appropriate input based on the field type
  switch (fieldType) {
    case 'text':
    case 'string':
    case 'input':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
            {field.label || field.key}
          </Label>
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            className="w-full"
          />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
      
    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
            {field.label || field.key}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={value?.toString() || ''}
            onChange={e => {
              const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
              onChange(isNaN(val) ? null : val);
            }}
            disabled={disabled}
            placeholder={field.placeholder}
            className="w-full"
          />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
      
    case 'textarea':
    case 'longtext':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
            {field.label || field.key}
          </Label>
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            className="min-h-[100px] w-full"
          />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
      
    case 'boolean':
    case 'switch':
    case 'toggle':
      return (
        <div className="flex items-center justify-between space-y-0 rounded-md border p-4">
          <div>
            <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
              {field.label || field.key}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
          <Switch
            id={fieldId}
            checked={value === true}
            onCheckedChange={checked => onChange(checked)}
            disabled={disabled}
          />
        </div>
      );
      
    case 'select':
    case 'dropdown':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
            {field.label || field.key}
          </Label>
          <Select
            value={value?.toString() || ''}
            onValueChange={val => onChange(val)}
            disabled={disabled}
          >
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                >
                  {option.label || option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
      
    case 'radio':
    case 'radiogroup':
      return (
        <div className="space-y-2">
          <Label className={cn(isRequired && 'required')}>
            {field.label || field.key}
          </Label>
          <RadioGroup
            value={value?.toString() || ''}
            onValueChange={val => onChange(val)}
            disabled={disabled}
            className="flex flex-col space-y-1"
          >
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  id={`${fieldId}-${option.value}`}
                  value={option.value.toString()}
                />
                <Label htmlFor={`${fieldId}-${option.value}`} className="cursor-pointer">
                  {option.label || option.value}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
      
    default:
      // For unsupported field types, render a text input as fallback
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId} className={cn(isRequired && 'required')}>
            {field.label || field.key} (Unsupported Type: {fieldType})
          </Label>
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
            className="w-full"
          />
          {field.description && (
            <p className="text-sm text-muted-foreground">{field.description}</p>
          )}
        </div>
      );
  }
}