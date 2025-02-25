import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectContentProps,
  SelectTriggerProps
} from "@/components/ui/select"

/**
 * Props for the SelectField component
 */
export interface SelectFieldProps {
  /**
   * Label for the select field
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Children components (typically SelectItem components)
   */
  children: React.ReactNode;
  /**
   * Props to pass to the SelectTrigger component
   */
  triggerProps?: SelectTriggerProps;
  /**
   * Props to pass to the SelectContent component
   */
  contentProps?: SelectContentProps;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Placeholder text to display when no value is selected
   */
  placeholder?: string;
  /**
   * Current value of the select
   */
  value?: string;
  /**
   * Default value for the select
   */
  defaultValue?: string;
  /**
   * Callback when value changes
   */
  onValueChange?: (value: string) => void;
  /**
   * Whether the select is open
   */
  open?: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Whether the select is disabled
   */
  disabled?: boolean;
  /**
   * Name attribute for the select
   */
  name?: string;
  /**
   * Additional class name for the container
   */
  className?: string;
}

/**
 * A complete select field with label and error message
 */
export function SelectField({ 
  label, 
  error, 
  children, 
  triggerProps, 
  contentProps, 
  required,
  placeholder,
  className,
  ...props 
}: SelectFieldProps) {
  const id = React.useId();
  const errorId = error ? `${id}-error` : undefined;
  const labelId = label ? `${id}-label` : undefined;
  
  return (
    <div className={cn("w-full space-y-2", className)}>
      {label && (
        <label 
          id={labelId}
          htmlFor={id} 
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error && "text-destructive"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <Select {...props}>
        <SelectTrigger 
          id={id}
          aria-labelledby={labelId}
          aria-describedby={errorId}
          error={!!error}
          {...triggerProps}
        >
          <SelectValue placeholder={placeholder || "Select an option"} />
        </SelectTrigger>
        <SelectContent 
          position="popper" 
          {...contentProps}
        >
          {children}
        </SelectContent>
      </Select>
      
      {error && (
        <p 
          id={errorId}
          className="text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
} 