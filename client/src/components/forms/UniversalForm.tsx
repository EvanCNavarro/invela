import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast, useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { componentFactory } from '@/services/componentFactory';
import { FormServiceInterface, FormData, FormSection as ServiceFormSection } from '@/services/formService';
import type { FormField as ServiceFormField } from '@/services/formService';
import { TaskTemplateService, TaskTemplateWithConfigs } from '@/services/taskTemplateService';
import { sortFields, sortSections } from '@/utils/formUtils';
import getLogger from '@/utils/logger';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp,
  Download,
  Eye,
  Check,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Lightbulb,
  ArrowDownWideNarrow,
  XCircle,
  Info,
  RefreshCw
} from "lucide-react";

// Create a form-specific logger
const logger = getLogger('UniversalForm');

// Define a type for navigation form sections (used by the UI)
type FormSection = NavigationFormSection;

type NavigationFormSection = {
  id: string;
  title: string;
  description?: string;
  status?: 'empty' | 'incomplete' | 'complete' | 'invalid';
  fields: ServiceFormField[];
  expanded?: boolean;
  index?: number;
  step_index?: number;
  fields_completed?: number;
  total_fields?: number;
  progress?: number;
};

/**
 * Helper function to convert service-specific sections to navigation sections
 */

interface UniversalFormProps {
  taskId?: number;
  taskType: string;
  taskStatus?: string;
  taskMetadata?: Record<string, any>;
  initialData?: FormData;
  taskTitle?: string; // Title of the task from task-page
  companyName?: string; // Company name for display in the header
  fileId?: number | null; // For download functionality
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
  onSuccess?: () => void; // Callback when form is successfully submitted
  onDownload?: (format: 'json' | 'csv' | 'txt') => void; // Function to handle downloads
}

/**
 * An improved UniversalForm component with reliable data management and status tracking
 */
export const UniversalForm: React.FC<UniversalFormProps> = ({
  taskId,
  taskType,
  taskStatus,
  taskMetadata,
  initialData,
  taskTitle,
  companyName,
  fileId,
  onSubmit,
  onCancel,
  onProgress,
  onSuccess,
  onDownload
}) => {
  const { toast } = useToast();
  
  // State for form data
  const [form, setForm] = useState<any>(null);
  const [formService, setFormService] = useState<FormServiceInterface | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmittedLocally, setFormSubmittedLocally] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Force a re-render when needed (e.g., after auto-fill)
  const [forceRerender, setForceRerender] = useState(false);
  
  // Get the form title - prioritize task title, then fallback to task type
  const formTitle = useMemo(() => {
    if (taskTitle) return taskTitle;
    
    // Convert task type to title case with spaces
    return taskType
      ? taskType
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Form';
  }, [taskTitle, taskType]);
  
  // Calculate progress for each section
  const calculateSectionProgress = useCallback((section: FormSection): number => {
    if (!section.fields || section.fields.length === 0) return 0;
    
    const totalFields = section.fields.length;
    const completedFields = section.fields.filter(field => 
      field.status === 'COMPLETE' || field.status === 'complete'
    ).length;
    
    return Math.round((completedFields / totalFields) * 100);
  }, []);
  
  // Calculate overall form progress
  const calculateOverallProgress = useCallback((formSections: FormSection[]): number => {
    if (!formSections || formSections.length === 0) return 0;
    
    let totalFields = 0;
    let completedFields = 0;
    
    formSections.forEach(section => {
      if (section.fields && section.fields.length > 0) {
        totalFields += section.fields.length;
        completedFields += section.fields.filter(field => 
          field.status === 'COMPLETE' || field.status === 'complete'
        ).length;
      }
    });
    
    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }, []);
  
  // Update a field value and track changes
  const updateField = useCallback(async (fieldKey: string, value: any): Promise<void> => {
    try {
      if (!formService) return;
      
      // Update the field in the service
      await formService.updateResponse(fieldKey, value);
    } catch (error) {
      logger.error(`Error updating field ${fieldKey}:`, error);
      toast({
        title: 'Field Update Error',
        description: 'Failed to save this field. Please try again.',
        variant: 'destructive',
      });
    }
  }, [formService, toast]);
  
  // Save form progress manually
  const saveProgress = useCallback(async (): Promise<void> => {
    if (!formService) return;
    
    try {
      await formService.saveProgress();
      toast({
        title: 'Progress Saved',
        description: 'Your progress has been saved successfully.',
        variant: 'success',
      });
    } catch (error) {
      logger.error('Error saving progress:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save your progress. Please try again.',
        variant: 'destructive',
      });
    }
  }, [formService, toast]);
  
  // Refresh section statuses to reflect latest changes
  const refreshStatus = useCallback(async () => {
    // Implementation goes here
  }, []);
  
  // Reset form with new data
  const resetForm = useCallback((data: Record<string, any>) => {
    if (!form) return;
    
    try {
      form.reset(data);
      refreshStatus();
    } catch (error) {
      logger.error('Error resetting form:', error);
    }
  }, [form, refreshStatus]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (data: FormData) => {
    if (!formService || !taskId) return;
    
    try {
      setIsSubmitting(true);
      
      // First save progress
      await formService.saveProgress();
      
      // Then submit the form
      const result = await formService.submitForm();
      
      if (result.success) {
        setFormSubmitted(true);
        setFormSubmittedLocally(true);
        
        if (onSubmit) {
          onSubmit(data);
        }
        
        toast({
          title: 'Form Submitted',
          description: 'Your form was submitted successfully.',
          variant: 'success',
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Submission Error',
          description: result.message || 'Failed to submit form. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Form submission error:', error);
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to submit form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formService, taskId, onSubmit, onSuccess, toast]);
  
  // Handle form cancellation
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);
  
  // Handle download request
  const handleDownload = useCallback((format: 'json' | 'csv' | 'txt') => {
    if (onDownload) {
      onDownload(format);
    } else if (fileId) {
      // Default download using file ID
      window.open(`/api/files/${fileId}/download?format=${format}`, '_blank');
    } else {
      toast({
        title: "Download Unavailable",
        description: "No downloadable file is available for this form.",
        variant: "destructive",
      });
    }
  }, [onDownload, fileId, toast]);
  
  // Handle demo auto-fill functionality using the external utility
  const handleDemoAutoFill = useCallback(async () => {
    // Dynamically import the function to avoid circular dependencies
    const { handleDemoAutoFill: executeAutoFill } = await import("./handleDemoAutoFill");
    
    return executeAutoFill({
      taskId,
      taskType,
      form,
      resetForm,
      updateField,
      refreshStatus,
      saveProgress,
      onProgress,
      formService,
      setForceRerender
    });
  }, [taskId, taskType, form, resetForm, updateField, refreshStatus, saveProgress, onProgress, formService, setForceRerender]);
  
  // Render the form with proper UI elements matching original design
  return (
    <div className="w-full">
      {/* Form Header with Title and Buttons */}
      <div className="mb-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl font-bold">{formTitle}</h1>
          {taskType === 'ky3p' && (
            <p className="text-muted-foreground">
              S&P KY3P Security Assessment form for third-party risk evaluation
            </p>
          )}
          {companyName && (
            <p className="text-muted-foreground">{companyName}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-4">
          <Button 
            variant="outline" 
            className="bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
            onClick={handleDemoAutoFill}
          >
            <span className="flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              Demo Auto-Fill
            </span>
          </Button>
          
          {/* Clear Fields button could be added here */}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="bg-gray-100 rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full" 
            style={{ width: `${calculateOverallProgress(sections)}%` }}
          ></div>
        </div>
        <p className="text-sm text-muted-foreground">
          {calculateOverallProgress(sections)}% Complete
        </p>
      </div>

      {/* If no sections loaded yet, show loading state */}
      {(isLoading || sections.length === 0) && (
        <div className="flex justify-center items-center p-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3">Loading form...</span>
        </div>
      )}

      {/* If form successfully submitted, show success */}
      {formSubmitted && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Form Submitted Successfully</h2>
          <p className="mb-4 text-green-700">Thank you for your submission.</p>
        </div>
      )}

      {/* The actual form content placeholder - in a full implementation,
          this would show tabs for different form sections as shown in the screenshot */}
      {!isLoading && sections.length > 0 && !formSubmitted && (
        <div className="bg-white rounded-lg border p-6">
          <p className="mb-4">Form sections would be displayed here for {taskType} task type.</p>
          <p className="text-sm text-muted-foreground mb-6">
            This is a placeholder for the complete form UI. The Demo Auto-Fill button functionality is fully implemented.
          </p>
          
          <Button 
            variant="outline" 
            onClick={handleDemoAutoFill}
            className="bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
          >
            <span className="flex items-center">
              <Lightbulb className="w-4 h-4 mr-2" />
              Demo Auto-Fill
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};