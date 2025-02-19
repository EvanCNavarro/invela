import { FC, InputHTMLAttributes, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, Lock, X, Sparkles, CornerRightUp } from "lucide-react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  variant: 'default' | 'disabled' | 'active' | 'successful' | 'error' | 'ai-suggestion';
  type: 'text';
  aiSuggestion?: string;
}

export const FormField: FC<FormFieldProps> = ({ 
  variant = 'default',
  type = 'text',
  aiSuggestion,
  className,
  value,
  onChange,
  ...props 
}) => {
  const [currentValue, setCurrentValue] = useState(value || '');
  const [currentVariant, setCurrentVariant] = useState(variant);

  // Update currentVariant when variant prop changes
  useEffect(() => {
    setCurrentVariant(variant);
  }, [variant]);

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
        return 'border-gray-200';
    }
  };

  const handleSuggestionClick = () => {
    if (aiSuggestion && onChange && variant === 'ai-suggestion') {
      const event = {
        target: { value: aiSuggestion }
      } as React.ChangeEvent<HTMLInputElement>;

      setCurrentValue(aiSuggestion);
      setCurrentVariant('active');
      onChange(event);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type={type}
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            onChange?.(e);
          }}
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
          onClick={handleSuggestionClick}
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