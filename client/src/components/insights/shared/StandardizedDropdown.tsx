/**
 * ========================================
 * Standardized Dropdown Component for Insights
 * ========================================
 * 
 * Consistent dropdown component used across all insight visualizations
 * with unified styling and behavior patterns.
 * 
 * @module components/insights/shared/StandardizedDropdown
 * @version 1.0.0
 * @since 2025-06-09
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSIGHT_COLORS } from '@/lib/insightDesignSystem';

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface StandardizedDropdownProps {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export function StandardizedDropdown({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  className = "",
  disabled = false,
  variant = 'default'
}: StandardizedDropdownProps) {
  
  const triggerClasses = `
    ${variant === 'compact' ? 'h-9 text-sm' : 'h-10'}
    border-gray-200 hover:border-gray-300 focus:border-blue-500
    transition-colors duration-200
    ${className}
  `.trim();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={triggerClasses}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className="cursor-pointer hover:bg-gray-50 focus:bg-blue-50"
          >
            <div>
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {option.description}
                </div>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}