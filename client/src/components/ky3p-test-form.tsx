/**
 * KY3P Test Form Component
 * 
 * This component demonstrates the enhanced KY3P form service with standardized
 * field keys across all form types.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { EnhancedKY3PFormService } from '@/services/enhanced-ky3p-form-service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KY3PTestFormProps {
  taskId: number;
}

export default function KY3PTestForm({ taskId }: KY3PTestFormProps) {
  const [formService, setFormService] = useState<EnhancedKY3PFormService | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [actionInProgress, setActionInProgress] = useState(false);
  const { toast } = useToast();

  // Initialize the form service
  useEffect(() => {
    const initializeForm = async () => {
      try {
        setLoading(true);
        const service = new EnhancedKY3PFormService();
        service.initialize(taskId);
        await service.loadFormData();
        
        setFormService(service);
        setFields(service.getFields());
        setSections(service.getSections());
        setProgress(service.getFormProgress());
        
        // Extract initial form data
        const initialData: Record<string, any> = {};
        service.getFields().forEach(field => {
          initialData[field.field_key] = field.response || '';
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error initializing form:', error);
        toast({
          title: 'Form Load Error',
          description: 'Failed to load the KY3P form data.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      initializeForm();
    }
  }, [taskId, toast]);

  // Handle field change
  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (!formService) return;
    
    try {
      setActionInProgress(true);
      
      // Filter out empty values to avoid unnecessary updates
      const dataToSend = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      const success = await formService.bulkUpdate(taskId, dataToSend);
      
      if (success) {
        toast({
          title: 'Form Updated',
          description: 'KY3P form data was successfully updated.',
          variant: 'default'
        });
        
        // Reload form to get fresh data
        await formService.loadFormData();
        setProgress(formService.getFormProgress());
      } else {
        toast({
          title: 'Update Failed',
          description: 'Failed to update the KY3P form data.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: 'Update Error',
        description: 'An error occurred while updating the form.',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle clear fields
  const handleClearFields = async () => {
    if (!formService) return;
    
    if (!confirm('Are you sure you want to clear all fields? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionInProgress(true);
      
      const success = await formService.clearFields(taskId);
      
      if (success) {
        toast({
          title: 'Fields Cleared',
          description: 'All KY3P form fields were successfully cleared.',
          variant: 'default'
        });
        
        // Reload form to get fresh data
        await formService.loadFormData();
        
        // Reset form data
        const initialData: Record<string, any> = {};
        formService.getFields().forEach(field => {
          initialData[field.field_key] = field.response || '';
        });
        setFormData(initialData);
        setProgress(formService.getFormProgress());
        
        // Navigate to first section
        const firstSection = formService.getFirstSection();
        if (firstSection) {
          console.log('Navigating to first section:', firstSection.title);
        }
      } else {
        toast({
          title: 'Clear Failed',
          description: 'Failed to clear the KY3P form fields.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error clearing fields:', error);
      toast({
        title: 'Clear Error',
        description: 'An error occurred while clearing the form fields.',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading form data...</span>
      </div>
    );
  }

  // Group fields by section for better display
  const fieldsBySection = fields.reduce((acc, field) => {
    const sectionId = field.section || 'default';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(field);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="container mx-auto py-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>KY3P Form Test</CardTitle>
          <CardDescription>
            Test the enhanced KY3P form service with standardized field keys.
            Progress: {progress.toFixed(0)}%
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Form fields grouped by section */}
          {Object.entries(fieldsBySection).map(([sectionId, sectionFields]) => {
            // Find section info
            const section = sections.find(s => s.id === sectionId) || { title: 'Default Section' };
            
            return (
              <div key={sectionId} className="mb-6">
                <h3 className="text-lg font-medium mb-2">{section.title}</h3>
                <Separator className="mb-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionFields.slice(0, 5).map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.field_key}>
                        {field.display_name || field.question || field.field_key}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.field_key}
                        value={formData[field.field_key] || ''}
                        onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
                        placeholder={`Enter ${field.display_name || field.question || field.field_key}`}
                      />
                    </div>
                  ))}
                </div>
                
                {sectionFields.length > 5 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {sectionFields.length - 5} more fields in this section are hidden for brevity.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleClearFields}
            disabled={actionInProgress}
          >
            {actionInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Clear All Fields
          </Button>
          
          <Button 
            onClick={handleBulkUpdate}
            disabled={actionInProgress}
          >
            {actionInProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
