/**
 * UniversalFormField Component
 * 
 * This component renders a form field based on its type and configuration.
 * It's designed to be highly reusable across different form implementations.
 */

import React from 'react';
import { FormField } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface UniversalFormFieldProps {
  field: FormField;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  disabled?: boolean;
}

export const UniversalFormField: React.FC<UniversalFormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  // Common field container styling
  const fieldContainerClass = 'space-y-2';
  const errorClass = 'text-red-500 text-sm mt-1';
  
  // Generate a unique ID for the field to link label to input
  const fieldId = `field-${field.name}`;
  
  // Handler for changing field value
  const handleChange = (fieldValue: any) => {
    onChange(field.name, fieldValue);
  };
  
  // Render different field types
  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'tel':
    case 'url':
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={field.type}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    case 'textarea':
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    case 'number':
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(e.target.valueAsNumber)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
            min={field.min}
            max={field.max}
            step={field.step || 1}
          />
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    case 'select':
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            value={value || ''}
            onValueChange={handleChange}
            disabled={disabled}
          >
            <SelectTrigger id={fieldId} className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    case 'checkbox':
      return (
        <div className="flex items-start space-x-2">
          <Checkbox
            id={fieldId}
            checked={value || false}
            onCheckedChange={handleChange}
            disabled={disabled}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor={fieldId}
              className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                error ? 'text-red-500' : ''
              )}
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {error && <div className={errorClass}>{error}</div>}
          </div>
        </div>
      );
      
    case 'radio':
      return (
        <div className={fieldContainerClass}>
          <div className="mb-2">
            <Label className="block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          <RadioGroup
            value={value || ''}
            onValueChange={handleChange}
            disabled={disabled}
            className={error ? 'border-red-500 border p-3 rounded-md' : ''}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${fieldId}-${option.value}`} />
                <Label htmlFor={`${fieldId}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    case 'date':
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={fieldId}
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  error ? 'border-red-500' : ''
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={handleChange}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
      
    default:
      // Fallback to a basic text input for unknown types
      return (
        <div className={fieldContainerClass}>
          <Label htmlFor={fieldId} className="block">
            {field.label} (Unknown type: {field.type})
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={error ? 'border-red-500' : ''}
          />
          {error && <div className={errorClass}>{error}</div>}
        </div>
      );
  }
};