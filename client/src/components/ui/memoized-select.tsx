import React, { forwardRef, memo, useCallback } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

// Logger for tracking select component behavior
const selectLogger = logger.select;

/**
 * Props for the MemoizedSelect component
 */
interface MemoizedSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  isValid?: boolean;
  id?: string;
}

/**
 * A memoized select component that prevents unnecessary re-renders
 * and provides validation feedback.
 * 
 * This implementation focuses on preserving focus state during
 * dropdown interactions and improving performance.
 */
const MemoizedSelectComponent = forwardRef<HTMLButtonElement, MemoizedSelectProps>(
  ({ 
    label, 
    value, 
    onChange, 
    options, 
    error, 
    className,
    placeholder = "Select an option...",
    disabled = false,
    isValid = true,
    id
  }, ref) => {
    selectLogger.debug(`Rendering MemoizedSelect: ${label}, value: ${value}`);
    
    // Convert string value to callback to prevent re-renders
    const handleValueChange = useCallback((newValue: string) => {
      selectLogger.debug(`Value changed for ${label}: ${newValue}`);
      onChange(newValue);
    }, [onChange, label]);
    
    // Unique ID based on label if not provided
    const selectId = id || label.toLowerCase().replace(/\s/g, '-');
    
    // Show validation states only if a value exists
    const showValidation = !!value;
    
    return (
      <div className="space-y-2">
        <Label htmlFor={selectId}>{label}</Label>
        <div className="relative">
          <Select
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled}
          >
            <SelectTrigger 
              id={selectId}
              ref={ref}
              className={cn(
                "w-full transition-colors",
                showValidation && !isValid 
                  ? "border-red-500 focus-visible:ring-red-500" 
                  : showValidation && isValid 
                    ? "border-green-500 focus-visible:ring-green-500" 
                    : "",
                className
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            
            <SelectContent position="popper" sideOffset={5} portalled>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {showValidation && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
              {isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        {!isValid && error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

MemoizedSelectComponent.displayName = 'MemoizedSelect';

/**
 * Export a memoized version of the select component to prevent
 * unnecessary re-renders when parent components update
 */
export const MemoizedSelect = memo(MemoizedSelectComponent);