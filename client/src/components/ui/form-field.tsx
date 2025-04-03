import { FC, InputHTMLAttributes, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, Lock, X, Sparkles, CornerRightUp } from "lucide-react";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSuggestionClick'> {
  variant: 'default' | 'disabled' | 'active' | 'successful' | 'error' | 'ai-suggestion';
  type: 'text';
  aiSuggestion?: string;
  onSuggestionClick?: () => void;
}

export const FormField: FC<FormFieldProps> = ({ 
  variant = 'default',
  type = 'text',
  aiSuggestion,
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  onSuggestionClick,
  ...props 
}) => {
  const [currentValue, setCurrentValue] = useState(value || '');
  const [currentVariant, setCurrentVariant] = useState(variant);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update currentVariant when variant prop changes
  useEffect(() => {
    setCurrentVariant(variant);
  }, [variant]);

  // Handle input focus - set active state
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (currentVariant !== 'disabled') {
      setCurrentVariant('active');
    }
    onFocus?.(e);
  };

  // Handle input blur - revert to appropriate state based on validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (currentVariant === 'active') {
      setCurrentVariant(variant);
    }
    onBlur?.(e);
  };

  const getVariantStyles = () => {
    switch (currentVariant) {
      case 'disabled':
        return 'border-gray-200 bg-gray-50';
      case 'active':
        return 'border-blue-500 ring-2 ring-blue-100';
      case 'successful':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      case 'ai-suggestion':
        return 'border-purple-200';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const handleSuggestionClickInternal = () => {
    if (aiSuggestion && variant === 'ai-suggestion') {
      setCurrentValue(aiSuggestion);
      setCurrentVariant('active');

      // Create and dispatch change event
      if (onChange) {
        const event = {
          target: { value: aiSuggestion }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
      }

      // Focus the input field
      if (inputRef.current) {
        inputRef.current.focus();
      }

      // Call external handler if provided
      onSuggestionClick?.();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type={type}
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            onChange?.(e);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "pr-10 transition-all duration-200",
            getVariantStyles(),
            className
          )}
          disabled={currentVariant === 'disabled'}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {currentVariant === 'disabled' && <Lock className="h-4 w-4 text-gray-400" />}
          {currentVariant === 'successful' && <Check className="h-4 w-4 text-green-500" />}
          {currentVariant === 'error' && <X className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      {currentVariant === 'ai-suggestion' && aiSuggestion && (
        <div 
          className="mt-1 flex items-center gap-2 rounded-md bg-purple-50 p-2 text-sm cursor-pointer hover:bg-purple-100 transition-colors"
          onClick={handleSuggestionClickInternal}
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-gray-900">Suggestion: </span>
          <span className="text-gray-900">{aiSuggestion}</span>
          <CornerRightUp className="ml-auto h-4 w-4 text-blue-500" />
        </div>
      )}
    </div>
  );
};