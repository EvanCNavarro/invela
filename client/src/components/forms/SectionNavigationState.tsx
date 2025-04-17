import React, { useState, useEffect, useCallback } from 'react';
import { setActiveSection } from '../../services/enhanced-kyb-service';
import { performanceMonitor } from '../../utils/form-optimization';
import './SectionNavigationState.css';

interface SectionNavigationStateProps {
  sections: Array<{
    id: string;
    title: string;
    meta?: {
      isLoaded?: boolean;
      isLoading?: boolean;
      priority?: number;
    };
  }>;
  currentSectionId: string;
  onSectionChange: (sectionId: string) => void;
}

/**
 * Enhanced section navigation component that integrates with progressive loading
 * and updates the active section in the service when navigation occurs
 */
const SectionNavigationState: React.FC<SectionNavigationStateProps> = ({
  sections,
  currentSectionId,
  onSectionChange
}) => {
  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  
  // Update loading states from section metadata
  useEffect(() => {
    const newState: Record<string, boolean> = {};
    
    sections.forEach(section => {
      const isLoading = section.meta?.isLoading || false;
      const isLoaded = section.meta?.isLoaded || false;
      
      newState[section.id] = isLoaded;
    });
    
    setLoadingState(newState);
  }, [sections]);
  
  // Handle section change with performance tracking
  const handleSectionChange = useCallback((sectionId: string) => {
    // Start performance monitoring
    performanceMonitor.startTimer('sectionNavigation');
    
    // Update the active section in the service for progressive loading
    setActiveSection(sectionId);
    
    // Call the parent's section change handler
    onSectionChange(sectionId);
    
    // End performance monitoring
    const duration = performanceMonitor.endTimer('sectionNavigation');
    console.log(`Section navigation took ${duration.toFixed(2)}ms`);
  }, [onSectionChange]);
  
  return (
    <div className="section-navigation">
      <div className="section-list">
        {sections.map(section => {
          const isActive = section.id === currentSectionId;
          const isLoaded = loadingState[section.id];
          const isLoading = section.meta?.isLoading || false;
          
          // Determine the status class for styling
          const statusClass = isActive 
            ? 'active' 
            : isLoaded 
              ? 'loaded' 
              : isLoading 
                ? 'loading' 
                : 'pending';
          
          return (
            <div 
              key={section.id}
              className={`section-item ${statusClass}`}
              onClick={() => handleSectionChange(section.id)}
            >
              <span className="section-title">{section.title}</span>
              
              {/* Loading indicator */}
              {isLoading && !isLoaded && (
                <span className="loading-indicator">Loading...</span>
              )}
              
              {/* Status indicator */}
              <span className="status-indicator">
                {isActive ? '(Active)' : isLoaded ? '(Loaded)' : isLoading ? '(Loading...)' : '(Pending)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionNavigationState;