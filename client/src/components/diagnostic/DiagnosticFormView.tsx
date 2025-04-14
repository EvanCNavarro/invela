import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import getLogger from '@/utils/logger';
import { kybService } from '@/services/kybService';
import { FormField } from '@/services/formService';
import { FormSection } from '@/components/forms/SectionNavigation';

// Set up logger
const logger = getLogger('DiagnosticFormView', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

interface DiagnosticFormViewProps {
  taskType: string;
  taskId?: number;
}

/**
 * A simplified form viewer for diagnostic purposes
 * Displays form fields and sections without any interactive functionality
 */
export const DiagnosticFormView: React.FC<DiagnosticFormViewProps> = ({ 
  taskType, 
  taskId 
}) => {
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormStructure() {
      try {
        logger.info(`Initializing diagnostic form view for task type: ${taskType}`);
        
        // Initialize the form service with template ID 1 (hardcoded for diagnostic)
        await kybService.initialize(1);
        
        // Get fields and sections
        const loadedFields = kybService.getFields();
        const loadedSections = kybService.getSections();
        
        logger.info(`Loaded ${loadedFields.length} fields and ${loadedSections.length} sections`);
        
        setFields(loadedFields);
        setSections(loadedSections);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Error initializing diagnostic form: ${errMsg}`);
        setError(`Failed to load form structure: ${errMsg}`);
      } finally {
        setLoading(false);
      }
    }
    
    loadFormStructure();
  }, [taskType, taskId]);

  // Render a read-only field for diagnostic display
  // We'll use the same rendering as the FieldRenderer in diagnostic mode
  const renderField = (field: FormField) => (
    <div key={field.key} className="field-display-only mb-6 border-b pb-4">
      <div className="flex items-start mb-1">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{field.label || field.key}</div>
          {field.helpText && (
            <div className="text-sm text-gray-500 mt-1">{field.helpText}</div>
          )}
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          {field.type || 'text'}
        </div>
      </div>
      
      {field.question && (
        <div className="font-semibold mt-2 mb-2">{field.question}</div>
      )}
      
      <div className="mt-2 border bg-gray-50 p-2 rounded text-gray-500 italic">
        {field.value ? (
          <span>{typeof field.value === 'object' ? JSON.stringify(field.value) : String(field.value)}</span>
        ) : (
          <span>No value</span>
        )}
      </div>
      
      <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-4">
        <span>Key: {field.key}</span>
        <span>Section: {field.section}</span>
        <span>Order: {field.order !== undefined ? field.order : 'none'}</span>
        <span>Type: {field.type || 'text'}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-pulse text-blue-500">Loading form structure...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Form Summary */}
      <div className="mb-6 bg-blue-50 p-4 rounded-md">
        <h3 className="font-medium mb-2">Form Structure Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Task Type:</strong> {taskType}</p>
            <p><strong>Total Fields:</strong> {fields.length}</p>
          </div>
          <div>
            <p><strong>Total Sections:</strong> {sections.length}</p>
            <p><strong>Form Implementation:</strong> KybFormService</p>
          </div>
        </div>
      </div>
      
      {/* Section Navigation */}
      <div className="mb-4">
        <Tabs 
          defaultValue={sections[0]?.id?.toString() || '0'}
          onValueChange={(value) => setActiveSection(sections.findIndex(s => s.id.toString() === value))}
        >
          <TabsList className="mb-4 w-full flex overflow-x-auto">
            {sections.map((section, index) => (
              <TabsTrigger key={section.id} value={section.id.toString()} className="flex-shrink-0">
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {sections.map((section, index) => (
            <TabsContent key={section.id} value={section.id.toString()}>
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-gray-600">{section.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {fields
                      .filter(field => field.section === section.id)
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(renderField)}
                    
                    {fields.filter(field => field.section === section.id).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No fields found in this section
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DiagnosticFormView;