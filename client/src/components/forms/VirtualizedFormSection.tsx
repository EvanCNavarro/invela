/**
 * VirtualizedFormSection Component
 * 
 * This component implements virtualized rendering for large form sections.
 * Instead of rendering all fields at once, it only renders the fields
 * that are currently visible in the viewport, significantly improving
 * performance for large forms with many fields.
 * 
 * Features:
 * - Virtualized rendering of form fields
 * - Smooth scrolling behavior
 * - Optimized re-rendering via React.memo
 * - Fallback to standard rendering when optimization is disabled
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FormField } from '@/components/forms/types';
import { UniversalFormField } from '@/components/forms/UniversalFormField';
import { OptimizationFeatures, performanceMonitor } from '@/utils/form-optimization';

interface VirtualizedFormSectionProps {
  sectionId: string;
  sectionTitle: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors?: Record<string, string>;
}

// Constants for virtualization
const DEFAULT_FIELD_HEIGHT = 65; // Average height of a form field in pixels
const BUFFER_SIZE = 5; // Number of extra fields to render above and below visible area

const VirtualizedFormSection: React.FC<VirtualizedFormSectionProps> = React.memo(({
  sectionId,
  sectionTitle,
  fields,
  values,
  onChange,
  errors = {}
}) => {
  // Container ref to measure the visible area
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State to track which fields are visible
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  // Total height of all fields (for scrollbar sizing)
  const totalHeight = fields.length * DEFAULT_FIELD_HEIGHT;
  
  // Effect to measure and update visible range when scrolling
  useEffect(() => {
    // Skip virtualization if feature is disabled
    if (!OptimizationFeatures.VIRTUALIZED_RENDERING) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Function to update which fields are visible
    const updateVisibleRange = () => {
      performanceMonitor.startTimer('updateVisibleRange');
      
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      
      // Calculate which fields should be visible
      const startIndex = Math.max(0, Math.floor(scrollTop / DEFAULT_FIELD_HEIGHT) - BUFFER_SIZE);
      const endIndex = Math.min(
        fields.length - 1,
        Math.ceil((scrollTop + viewportHeight) / DEFAULT_FIELD_HEIGHT) + BUFFER_SIZE
      );
      
      setVisibleRange({ start: startIndex, end: endIndex });
      
      performanceMonitor.endTimer('updateVisibleRange');
    };
    
    // Initial calculation of visible fields
    updateVisibleRange();
    
    // Add scroll event listener
    container.addEventListener('scroll', updateVisibleRange);
    
    // Clean up
    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
    };
  }, [fields.length]);
  
  // Determine which fields to render
  const visibleFields = useMemo(() => {
    // If virtualization is disabled, render all fields
    if (!OptimizationFeatures.VIRTUALIZED_RENDERING) {
      return fields;
    }
    
    performanceMonitor.startTimer('filterVisibleFields');
    
    // Only render fields in the visible range
    const result = fields.slice(visibleRange.start, visibleRange.end + 1);
    
    performanceMonitor.endTimer('filterVisibleFields');
    return result;
  }, [fields, visibleRange, OptimizationFeatures.VIRTUALIZED_RENDERING]);
  
  // Calculate spacer heights to maintain scroll position
  const topSpacerHeight = visibleRange.start * DEFAULT_FIELD_HEIGHT;
  const bottomSpacerHeight = (fields.length - visibleRange.end - 1) * DEFAULT_FIELD_HEIGHT;
  
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-4">{sectionTitle}</h3>
      
      <div 
        ref={containerRef}
        className="overflow-y-auto"
        style={{ 
          height: '500px', // Fixed height container for scrolling
          position: 'relative'
        }}
      >
        {/* Top spacer div to maintain scroll position */}
        {OptimizationFeatures.VIRTUALIZED_RENDERING && (
          <div style={{ height: `${topSpacerHeight}px` }} />
        )}
        
        {/* Visible fields */}
        <div className="space-y-4">
          {visibleFields.map((field) => (
            <div key={field.name} data-field-index={fields.indexOf(field)}>
              <UniversalFormField
                field={field}
                value={values[field.name]}
                onChange={onChange}
                error={errors[field.name]}
              />
            </div>
          ))}
        </div>
        
        {/* Bottom spacer div to maintain scroll position */}
        {OptimizationFeatures.VIRTUALIZED_RENDERING && (
          <div style={{ height: `${bottomSpacerHeight}px` }} />
        )}
      </div>
      
      {/* Debug information - only shown in development */}
      {process.env.NODE_ENV !== 'production' && OptimizationFeatures.VIRTUALIZED_RENDERING && (
        <div className="mt-2 text-xs text-gray-500 border-t pt-2">
          <p>
            Virtualized Rendering: {fields.length} total fields, 
            showing {visibleFields.length} fields ({visibleRange.start} to {visibleRange.end})
          </p>
        </div>
      )}
    </div>
  );
});

VirtualizedFormSection.displayName = 'VirtualizedFormSection';

export default VirtualizedFormSection;