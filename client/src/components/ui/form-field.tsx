import { FC, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, Lock, X, Sparkles, ArrowUp } from "lucide-react";

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
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
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

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          type={type}
          className={cn(
            "pr-10 transition-all duration-200",
            getVariantStyles(),
            className
          )}
          disabled={variant === 'disabled'}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {variant === 'disabled' && <Lock className="h-4 w-4 text-gray-400" />}
          {variant === 'successful' && <Check className="h-4 w-4 text-green-500" />}
          {variant === 'error' && <X className="h-4 w-4 text-red-500" />}
        </div>
      </div>
      
      {variant === 'ai-suggestion' && aiSuggestion && (
        <div className="mt-1 flex items-center gap-2 rounded-md bg-purple-50 p-2 text-sm">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-purple-900">Suggestion: </span>
          <span className="text-purple-700">{aiSuggestion}</span>
          <ArrowUp className="ml-auto h-4 w-4 text-blue-500 rotate-45" />
        </div>
      )}
    </div>
  );
};
