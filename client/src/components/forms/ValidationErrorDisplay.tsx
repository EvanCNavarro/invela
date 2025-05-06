/**
 * ValidationErrorDisplay Component
 * 
 * A reusable component for displaying validation errors in forms.
 * This component ensures consistent error presentation across all form types.
 */

import React from 'react';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { ValidationError } from '@/utils/formValidation';
import { cn } from '@/lib/utils';

interface ValidationErrorDisplayProps {
  errors: Record<string, string> | ValidationError[] | null | undefined;
  fieldName?: string;
  variant?: 'inline' | 'block' | 'toast';
  className?: string;
  icon?: boolean;
  scrollToField?: boolean;
}

/**
 * Component to display validation errors consistently
 */
export function ValidationErrorDisplay({
  errors,
  fieldName,
  variant = 'inline',
  className,
  icon = true,
  scrollToField = false,
}: ValidationErrorDisplayProps) {
  if (!errors || (Array.isArray(errors) && errors.length === 0) || Object.keys(errors).length === 0) {
    return null;
  }

  // Handle scrolling to the field
  React.useEffect(() => {
    if (scrollToField && fieldName) {
      const field = document.getElementById(`field-${fieldName}`);
      if (field) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.focus();
      }
    }
  }, [scrollToField, fieldName, errors]);

  // Format errors into a consistent structure
  const formattedErrors: Record<string, string> = React.useMemo(() => {
    if (Array.isArray(errors)) {
      return errors.reduce<Record<string, string>>(
        (acc, error) => {
          acc[error.field] = error.message;
          return acc;
        },
        {}
      );
    }
    return errors as Record<string, string>;
  }, [errors]);

  // If a fieldName is provided, only show errors for that field
  const errorMessages = fieldName
    ? formattedErrors[fieldName]
      ? [formattedErrors[fieldName]]
      : []
    : Object.values(formattedErrors);

  if (errorMessages.length === 0) {
    return null;
  }

  switch (variant) {
    case 'block':
      return (
        <div
          className={cn(
            'bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm',
            className
          )}
        >
          {icon && (
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
              <span className="font-semibold">Validation Errors</span>
            </div>
          )}
          <ul className="list-disc pl-5 space-y-1">
            {errorMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      );

    case 'toast':
      return (
        <div className={cn('flex items-start', className)}>
          {icon && <XCircle className="h-4 w-4 mr-2 text-red-600 mt-0.5 flex-shrink-0" />}
          <div>
            <p className="font-medium">Validation Failed</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              {errorMessages.map((message, index) => (
                <li key={index} className="text-sm">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case 'inline':
    default:
      return (
        <div className={cn('text-sm text-red-600 mt-1', className)}>
          {errorMessages.map((message, index) => (
            <div key={index} className="flex items-start">
              {icon && <XCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />}
              <span>{message}</span>
            </div>
          ))}
        </div>
      );
  }
}

/**
 * Component to display a form field hint or info message
 */
export function FieldHint({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div className={cn('text-sm text-gray-500 mt-1 flex items-start', className)}>
      <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
