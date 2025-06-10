/**
 * ========================================
 * Standardized Time Selector for Insights
 * ========================================
 * 
 * Consistent time period selector component with unified options
 * across all insight visualizations.
 * 
 * @module components/insights/shared/StandardizedTimeSelector
 * @version 1.0.0
 * @since 2025-06-09
 */

import React from 'react';
import { StandardizedDropdown } from './StandardizedDropdown';

interface StandardizedTimeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export function StandardizedTimeSelector({
  value,
  onValueChange,
  className = "",
  disabled = false,
  variant = 'default'
}: StandardizedTimeSelectorProps) {
  
  const timeOptions = [
    { 
      value: '1d', 
      label: '1 day',
      description: 'Last 24 hours of data'
    },
    { 
      value: '7d', 
      label: '7 days',
      description: 'Past week analysis'
    },
    { 
      value: '30d', 
      label: '30 days',
      description: 'Monthly overview'
    },
    { 
      value: '90d', 
      label: '90 days',
      description: 'Quarterly trends'
    },
    { 
      value: '1y', 
      label: '1 year',
      description: 'Annual analysis'
    },
    { 
      value: 'all', 
      label: 'All time',
      description: 'Complete historical data'
    }
  ];

  return (
    <StandardizedDropdown
      options={timeOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder="Select time period..."
      className={className}
      disabled={disabled}
      variant={variant}
    />
  );
}