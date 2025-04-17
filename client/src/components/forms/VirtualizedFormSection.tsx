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
 * - Dynamic measurement of field heights for accuracy
 * - Buffer rendering for smooth scrolling experience
 * - Throttled calculations to prevent performance issues
 * 
 * Performance considerations:
 * - Only enabled for sections with more than 20 fields
 * - Uses spacers instead of absolute positioning for better accessibility
 * - Memoizes expensive calculations and rendering functions
 * - Monitors rendering performance via the performance monitoring system
 * 
 * Usage:
 * <VirtualizedFormSection
 *   sectionId="section-1"
 *   sectionTitle="Company Information"
 *   fields={sectionFields}
 *   values={formValues}
 *   onChange={handleFieldChange}
 *   errors={formErrors}
 * />
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FormField } from './types';
import UniversalFormField from './UniversalFormField';
import { OptimizationFeatures, performanceMonitor } from '@/utils/form-optimization';

interface VirtualizedFormSectionProps {
  sectionId: string;
  sectionTitle: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

// Configuration for virtualization
const ITEM_HEIGHT_ESTIMATE = 80; // Estimated average height of a field in pixels
const BUFFER_SIZE = 5; // Number of items to render above and below the visible area
const RECALCULATE_THRESHOLD = 100; // Milliseconds to throttle scroll event handling

const VirtualizedFormSection: React.FC<VirtualizedFormSectionProps> = React.memo(({
  sectionId,
  sectionTitle,
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  // Container ref to track the scroll position
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State to track the visible range of fields
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 10, // Initial estimate
  });
  
  // Store field heights for more accurate virtualization
  const [fieldHeights, setFieldHeights] = useState<Record<string, number>>({});
  const [estimatedTotalHeight, setEstimatedTotalHeight] = useState(0);
  
  // Track when we last calculated the visible range to avoid excessive recalculation
  const lastCalculation = useRef(0);
  
  // Fallback to standard rendering if virtualization is disabled
  const virtualizationEnabled = OptimizationFeatures.VIRTUALIZED_RENDERING && fields.length > 20;

  // Calculate the total height of all fields based on measured or estimated heights
  useEffect(() => {
    if (virtualizationEnabled) {
      let totalHeight = 0;
      
      fields.forEach((field) => {
        // Use the measured height if available, otherwise use the estimate
        const fieldHeight = fieldHeights[field.name] || ITEM_HEIGHT_ESTIMATE;
        totalHeight += fieldHeight;
      });
      
      setEstimatedTotalHeight(totalHeight);
    }
  }, [fields, fieldHeights, virtualizationEnabled]);
  
  // Calculate the visible range of fields based on scroll position
  const calculateVisibleRange = useCallback(() => {
    if (!containerRef.current || !virtualizationEnabled) return;
    
    const now = Date.now();
    
    // Throttle calculations to avoid performance issues
    if (now - lastCalculation.current < RECALCULATE_THRESHOLD) {
      return;
    }
    
    // Start performance measurement
    performanceMonitor.startTimer('updateVisibleRange');
    
    lastCalculation.current = now;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = fields.length - 1;
    
    // Find the first visible field
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldHeight = fieldHeights[field.name] || ITEM_HEIGHT_ESTIMATE;
      
      if (currentHeight + fieldHeight > scrollTop) {
        startIndex = Math.max(0, i - BUFFER_SIZE);
        break;
      }
      
      currentHeight += fieldHeight;
    }
    
    // Find the last visible field
    currentHeight = 0;
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldHeight = fieldHeights[field.name] || ITEM_HEIGHT_ESTIMATE;
      
      if (currentHeight > scrollTop + clientHeight) {
        endIndex = Math.min(fields.length - 1, i + BUFFER_SIZE);
        break;
      }
      
      currentHeight += fieldHeight;
    }
    
    // Update the visible range
    setVisibleRange({
      start: startIndex,
      end: Math.min(fields.length - 1, endIndex + BUFFER_SIZE),
    });
    
    // End performance measurement
    performanceMonitor.endTimer('updateVisibleRange');
  }, [fields, fieldHeights, virtualizationEnabled]);
  
  // Calculate top and bottom spacer heights
  const spacers = useMemo(() => {
    if (!virtualizationEnabled) {
      return { top: 0, bottom: 0 };
    }
    
    let topHeight = 0;
    let bottomHeight = 0;
    
    // Calculate height of fields before the visible range
    for (let i = 0; i < visibleRange.start; i++) {
      if (i < fields.length) {
        const field = fields[i];
        topHeight += fieldHeights[field.name] || ITEM_HEIGHT_ESTIMATE;
      }
    }
    
    // Calculate height of fields after the visible range
    for (let i = visibleRange.end + 1; i < fields.length; i++) {
      const field = fields[i];
      bottomHeight += fieldHeights[field.name] || ITEM_HEIGHT_ESTIMATE;
    }
    
    return { top: topHeight, bottom: bottomHeight };
  }, [fields, visibleRange, fieldHeights, virtualizationEnabled]);
  
  // Handle scroll events to update the visible range
  const handleScroll = useCallback(() => {
    if (virtualizationEnabled) {
      calculateVisibleRange();
    }
  }, [calculateVisibleRange, virtualizationEnabled]);
  
  // Measure field heights after initial render
  const measureFieldHeight = useCallback((fieldName: string, height: number) => {
    setFieldHeights((prev) => {
      // Only update if the height has changed
      if (prev[fieldName] !== height) {
        return { ...prev, [fieldName]: height };
      }
      return prev;
    });
  }, []);
  
  // Set up scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !virtualizationEnabled) return;
    
    calculateVisibleRange();
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [calculateVisibleRange, handleScroll, virtualizationEnabled]);
  
  // Update visible range if fields change
  useEffect(() => {
    if (virtualizationEnabled) {
      calculateVisibleRange();
    }
  }, [calculateVisibleRange, fields, virtualizationEnabled]);
  
  // Field reference callback to measure heights
  const fieldRef = useCallback(
    (fieldName: string) => (node: HTMLElement | null) => {
      if (node && virtualizationEnabled) {
        measureFieldHeight(fieldName, node.getBoundingClientRect().height);
      }
    },
    [measureFieldHeight, virtualizationEnabled]
  );
  
  // Render field with ref for height measurement
  const renderField = useCallback(
    (field: FormField, index: number) => {
      const fieldError = errors[field.name];
      const fieldValue = values[field.name];
      
      return (
        <div
          key={field.name}
          ref={fieldRef(field.name)}
          className="mb-6"
        >
          <UniversalFormField
            field={field}
            value={fieldValue}
            onChange={onChange}
            error={fieldError}
            disabled={disabled}
          />
        </div>
      );
    },
    [onChange, values, errors, disabled, fieldRef]
  );
  
  // Render fields or fallback to non-virtualized rendering
  const renderFields = () => {
    if (!virtualizationEnabled) {
      // Fallback to standard rendering when virtualization is disabled
      return fields.map(renderField);
    }
    
    // Only render fields in the visible range
    const visibleFields = fields.slice(visibleRange.start, visibleRange.end + 1);
    
    return (
      <>
        {/* Top spacer to maintain scroll position */}
        {spacers.top > 0 && (
          <div style={{ height: spacers.top }} className="virtualizer-spacer top-spacer" />
        )}
        
        {/* Visible fields */}
        {visibleFields.map(renderField)}
        
        {/* Bottom spacer to maintain scroll dimensions */}
        {spacers.bottom > 0 && (
          <div style={{ height: spacers.bottom }} className="virtualizer-spacer bottom-spacer" />
        )}
      </>
    );
  };
  
  return (
    <div className="form-section">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{sectionTitle}</h2>
      <div
        ref={containerRef}
        className={`form-section-fields overflow-y-auto ${virtualizationEnabled ? 'virtualized' : ''}`}
        style={{ height: '100%' }}
      >
        {renderFields()}
      </div>
    </div>
  );
});

VirtualizedFormSection.displayName = 'VirtualizedFormSection';

export default VirtualizedFormSection;