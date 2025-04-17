import React, { useState, useEffect } from 'react';
import { enhancedKybService } from '../../services/enhanced-kyb-service';
import SectionNavigationState from '../forms/SectionNavigationState';
import { performanceMonitor, progressiveLoader } from '../../utils/form-optimization';

/**
 * Demo component to showcase the progressive loading functionality
 * This is used for development and testing only
 */
const ProgressiveLoadingDemo: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState('');
  const [visibleFields, setVisibleFields] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  
  // Initialize the KYB form service
  useEffect(() => {
    const initializeDemo = async () => {
      try {
        console.log('Initializing Progressive Loading Demo');
        performanceMonitor.startTimer('initDemo');
        
        // Initialize the service with template ID 1 (KYB form template)
        await enhancedKybService.initialize(1);
        
        // Get the sections from the service
        const formSections = enhancedKybService.getSections();
        setSections(formSections);
        
        // Set the initial section
        if (formSections.length > 0) {
          setCurrentSectionId(formSections[0].id);
          
          // Trigger the initial section load
          enhancedKybService.setActiveSection(formSections[0].id);
        }
        
        setInitialized(true);
        performanceMonitor.endTimer('initDemo');
      } catch (error) {
        console.error('Error initializing demo:', error);
      }
    };
    
    initializeDemo();
  }, []);
  
  // Update fields when current section changes
  useEffect(() => {
    if (initialized && currentSectionId) {
      // Get fields based on the progressive loading system
      const fields = enhancedKybService.getFields();
      setVisibleFields(fields);
      
      // Update metrics
      const stats = progressiveLoader.getLoadingStats();
      setMetrics({
        totalFields: fields.length,
        totalSections: sections.length,
        loadedSections: stats.filter(s => s.loaded).length,
        activeSectionId: currentSectionId
      });
    }
  }, [initialized, currentSectionId, sections.length]);
  
  const handleSectionChange = (sectionId: string) => {
    console.log(`Changing to section: ${sectionId}`);
    setCurrentSectionId(sectionId);
  };
  
  // Loading state
  if (!initialized) {
    return <div>Loading demo...</div>;
  }
  
  return (
    <div className="progressive-loading-demo">
      <h2>Progressive Loading Demo</h2>
      <p>This demo shows how sections are loaded progressively based on navigation.</p>
      
      <div className="demo-layout">
        <div className="demo-navigation">
          <h3>Form Sections</h3>
          <SectionNavigationState 
            sections={sections}
            currentSectionId={currentSectionId}
            onSectionChange={handleSectionChange}
          />
          
          <div className="metrics-panel">
            <h3>Loading Metrics</h3>
            <ul>
              <li>Visible Fields: {visibleFields.length}</li>
              <li>Total Fields: {metrics.totalFields || 0}</li>
              <li>Loaded Sections: {metrics.loadedSections || 0} / {metrics.totalSections || 0}</li>
              <li>Active Section: {metrics.activeSectionId || 'None'}</li>
            </ul>
          </div>
        </div>
        
        <div className="demo-content">
          <h3>Visible Fields ({visibleFields.length})</h3>
          <div className="field-list">
            {visibleFields.map(field => (
              <div key={field.id} className="field-item">
                <strong>{field.label}</strong> 
                <span className="field-meta">
                  (Type: {field.type}, Section: {field.sectionId})
                </span>
              </div>
            ))}
            
            {visibleFields.length === 0 && (
              <div className="no-fields">No fields loaded yet</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="style-container">
        <style dangerouslySetInnerHTML={{ __html: `
          .progressive-loading-demo {
            padding: 1rem;
          }
          
          .demo-layout {
            display: flex;
            gap: 2rem;
            margin-top: 1rem;
          }
          
          .demo-navigation {
            width: 300px;
            flex-shrink: 0;
          }
          
          .demo-content {
            flex: 1;
          }
          
          .metrics-panel {
            margin-top: 1rem;
            padding: 1rem;
            background-color: #f5f5f5;
            border-radius: 0.5rem;
          }
          
          .field-list {
            border: 1px solid #e0e0e0;
            border-radius: 0.5rem;
            max-height: 600px;
            overflow-y: auto;
            padding: 0.5rem;
          }
          
          .field-item {
            padding: 0.5rem;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .field-meta {
            margin-left: 0.5rem;
            color: #666;
            font-size: 0.8rem;
          }
          
          .no-fields {
            padding: 2rem;
            text-align: center;
            color: #999;
          }
        `}} />
      </div>
    </div>
  );
};

export default ProgressiveLoadingDemo;