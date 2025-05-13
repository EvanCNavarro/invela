import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// Define window property for tracking clear operations
declare global {
  interface Window {
    _lastClearOperation?: {
      taskId: number;
      timestamp: number;
      formType: string;
      blockExpiration?: number; // When this block should expire
      operationId?: string;     // Operation ID for tracking
    } | null;
  }
}
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from '@/hooks/use-toast';
import { showClearFieldsToast } from '@/hooks/use-unified-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FormSkeletonWithMode } from '@/components/ui/form-skeleton';
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
  Eye,
  Check,
  Lightbulb,
  CheckCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  ChevronUp,
  ChevronDown,
  Clock,
  Info,
  CalendarClock,
  CheckSquare,
  CalendarDays,
  UserPlus,
  User2,
  Building2,
  Users,
  Flag,
  ChartBar,
  Hash
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import our new improved hooks and components
import { useFormDataManager } from '@/hooks/form/use-form-data-manager';
import { useFormStatus, SectionStatus } from '@/hooks/form/use-form-status';
import ResponsiveSectionNavigation, { FormSection as NavigationFormSection } from './SectionNavigation';
import FormProgressBar from './FormProgressBar';
import { FieldRenderer } from './field-renderers/FieldRenderer';
import { useUser } from '@/hooks/useUser';
import { useCurrentCompany } from '@/hooks/use-current-company';
import { userContext } from '@/lib/user-context';

// Import WebSocket-based form submission and fields listeners and related components
import { FormSubmissionListener, FormSubmissionEvent } from './FormSubmissionListener';
import FormFieldsListener, { FieldsEvent } from './FormFieldsListener';
import { SubmissionSuccessModal } from '@/components/modals/SubmissionSuccessModal';

import SectionContent from './SectionContent';

// Task interface for the task query with all possible metadata fields
interface Task {
  id: number;
  status: string;
  progress: number;
  submissionDate?: string;
  title?: string;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  completed_at?: Date | string;
  due_date?: Date | string;
  assigned_to?: number;
  created_by?: number;
  company_id?: number;
  template_id?: number;
  task_scope?: 'personal' | 'company';
  priority?: 'low' | 'medium' | 'high';
  user_email?: string;
  type?: string;
  metadata?: Record<string, any>;
}

// Interface for the ReadOnlyFormView component
interface ReadOnlyFormViewProps {
  taskId?: number;
  taskType: string;
  task?: Task;
  formData: FormData;
  fields: ServiceFormField[];
  sections: FormSection[];
  company?: any;
}

/**
 * ReadOnlyFormView - A component for displaying a read-only version of a form after submission
 * 
 * This displays:
 * 1. Download options in top-right (CSV, TXT, JSON)
 * 2. Submission details at the top
 * 3. All questions and answers in accordion format
 * 4. Back to Task Center and Scroll to Top buttons at bottom
 */
const ReadOnlyFormView: React.FC<ReadOnlyFormViewProps> = ({
  taskId,
  taskType,
  task,
  formData,
  fields,
  sections,
  company
}) => {
  const [, navigate] = useLocation();
  const topRef = useRef<HTMLDivElement>(null);

  // Format the submission date with better handling of missing or invalid dates
  const formattedSubmissionDate = useMemo(() => {
    // Check if we have a valid submissionDate in the task
    if (task?.submissionDate) {
      try {
        const date = new Date(task.submissionDate);
        
        // Check if the date is valid
        if (!isNaN(date.getTime())) {
          // Format date: May 7, 2025 at 2:05 PM
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (e) {
        console.warn('Error formatting submission date:', e);
      }
    }
    
    // If we can't get the submission date from task.submissionDate, try from metadata
    if (task?.metadata?.submission_date) {
      try {
        const date = new Date(task.metadata.submission_date);
        
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      } catch (e) {
        console.warn('Error formatting metadata submission date:', e);
      }
    }
    
    // Default to today's date if we can't get a valid date
    // This is better than showing "Unknown" to the user
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [task?.submissionDate, task?.metadata?.submission_date]);

  // Helper function to scroll to top
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper function to handle downloads
  const handleDownload = (format: 'json' | 'csv' | 'txt') => {
    if (!taskId) return;
    
    // Format filename based on task type
    const formattedTaskType = taskType.replace(/_/g, '-');
    const filename = `${formattedTaskType}-form-${taskId}.${format}`;
    
    // Construct the download URL
    window.open(`/api/forms/${taskType}/${taskId}/download?format=${format}&filename=${filename}`, '_blank');
  };

  // Get formatted heading based on task type
  const getFormHeading = () => {
    const taskTypeMap: Record<string, string> = {
      'kyb': 'Know Your Business (KYB)',
      'ky3p': 'Know Your Third Party (KY3P)',
      'open_banking': 'Open Banking Assessment',
      'card': 'Card Assessment',
      'company_kyb': 'Know Your Business (KYB)',
      'security': 'Security Assessment'
    };
    
    return taskTypeMap[taskType] || taskType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="w-full mx-auto" ref={topRef}>
      <div className="bg-white border rounded-md shadow-sm">
        {/* Header with submission info and download options - Improved */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>SUBMITTED</span>
              </div>
              {task?.id && (
                <div className="text-xs font-medium text-gray-500 px-2 py-1 rounded-md bg-gray-100">
                  ID: {task.id}
                </div>
              )}
            </div>
            
            {/* Download dropdown - Now in line with header */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Form
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem 
                  onClick={() => handleDownload('json')}
                  className="cursor-pointer flex items-center py-2"
                >
                  <FileJson className="mr-2 h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">JSON Format</p>
                    <p className="text-xs text-gray-500">For data processing</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDownload('csv')}
                  className="cursor-pointer flex items-center py-2"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Excel/CSV Format</p>
                    <p className="text-xs text-gray-500">For spreadsheet applications</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDownload('txt')}
                  className="cursor-pointer flex items-center py-2"
                >
                  <FileText className="mr-2 h-4 w-4 text-gray-600" />
                  <div>
                    <p className="font-medium">Text Format</p>
                    <p className="text-xs text-gray-500">Simple text document</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{getFormHeading()}</h1>
            
            {/* All metadata in expandable section */}
            <details className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden group">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">VIEW SUBMISSION DETAILS</span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 group-open:rotate-180 transition-transform duration-200" />
              </summary>
              
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Task ID */}
                  {task?.id && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <Hash className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Task ID</span>
                        <p className="text-sm text-gray-700 font-medium">#{task.id}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Submission date */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                    <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                      <Clock className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-0.5">Submitted</span>
                      <p className="text-sm text-gray-700 font-medium">{formattedSubmissionDate}</p>
                    </div>
                  </div>
                  
                  {/* Company */}
                  {task?.company_id && company?.name && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Company</span>
                        <p className="text-sm text-gray-700 font-medium">{company.name} (#{task.company_id})</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Status */}
                  {task?.status && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <CheckCircle className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Status</span>
                        <p className="text-sm text-gray-700 font-medium capitalize">{task.status}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Created date */}
                  {task?.created_at && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <CalendarClock className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Created</span>
                        <p className="text-sm text-gray-700 font-medium">{new Date(task.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Scope */}
                  {task?.task_scope && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <Users className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Scope</span>
                        <p className="text-sm text-gray-700 font-medium capitalize">{task.task_scope}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Progress */}
                  {task?.progress !== undefined && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <ChartBar className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Progress</span>
                        <p className="text-sm text-gray-700 font-medium">{task.progress}% Complete</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Due date */}
                  {task?.due_date && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <CalendarDays className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Due date</span>
                        <p className="text-sm text-gray-700 font-medium">{new Date(task.due_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Created by */}
                  {task?.created_by && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <UserPlus className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Created by</span>
                        <p className="text-sm text-gray-700 font-medium">User #{task.created_by}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Priority */}
                  {task?.priority && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <Flag className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Priority</span>
                        <p className="text-sm text-gray-700 font-medium capitalize">{task.priority}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Completed date */}
                  {task?.completed_at && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <CheckSquare className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Completed</span>
                        <p className="text-sm text-gray-700 font-medium">{new Date(task.completed_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Assigned to */}
                  {task?.assigned_to && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <User2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Assigned to</span>
                        <p className="text-sm text-gray-700 font-medium">User #{task.assigned_to}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Template ID */}
                  {task?.template_id && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center">
                      <div className="flex-shrink-0 mr-3 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-md">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">Template ID</span>
                        <p className="text-sm text-gray-700 font-medium">#{task.template_id}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
        
        {/* Form content as read-only accordions */}
        <div className="p-6">
          <Accordion type="multiple" defaultValue={sections.map(s => s.id.toString())} className="space-y-4">
            {sections.map((section, sectionIndex) => {
              // Get fields for this section with robust section matching (multiple formats support)
              // IMPORTANT: Add diagnostic logging for section-field mapping issues
              if (sectionIndex === 0) {
                // Only log for first section to avoid excessive logging
                logger.info(`[SectionMapping] Form type: ${taskType}`);
                logger.info(`[SectionMapping] Fields total: ${fields.length}`);
                logger.info(`[SectionMapping] Sections total: ${sections.length}`);
                logger.info(`[SectionMapping] Sample field section properties:`, 
                  fields.slice(0, 3).map(f => ({
                    key: f.key,
                    question: f.question?.substring(0, 20) + '...',
                    section: f.section,
                    sectionId: f.sectionId,
                    section_id: (f as any).section_id,
                    group: f.group
                  }))
                );
                logger.info(`[SectionMapping] Sample section properties:`, 
                  sections.slice(0, 3).map(s => ({
                    id: s.id,
                    title: s.title,
                    order: s.order
                  }))
                );
              }
              
              const sectionFields = fields.filter(f => {
                // Direct match to section.id as string (most common)
                if (f.section !== undefined) {
                  return String(f.section) === String(section.id);
                }
                
                // Try alternative property names for section
                if (f.sectionId !== undefined) {
                  return String(f.sectionId) === String(section.id);
                }
                
                if ((f as any).section_id !== undefined) {
                  return String((f as any).section_id) === String(section.id);
                }
                
                // Try matching by group name (used in some KY3P implementations)
                if (f.group !== undefined && section.title !== undefined) {
                  return String(f.group) === String(section.title);
                }
                
                // Default fallback to avoid completely empty UI
                return false;
              });
              
              if (sectionFields.length === 0) return null;
              
              return (
                <AccordionItem 
                  key={`section-${sectionIndex}`} 
                  value={section.id.toString()}
                  className="border border-gray-200 rounded-md overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 font-medium">
                    <div className="flex items-center">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 mr-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-gray-500 mr-2">{sectionIndex + 1}.</span>
                      {section.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-2">
                    <div className="space-y-4">
                      {sectionFields.map((field, fieldIndex) => {
                        const fieldValue = formData[field.key];
                        const displayValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '' 
                          ? String(fieldValue) 
                          : 'Not provided';
                        
                        return (
                          <div key={`field-${fieldIndex}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                            <p className="text-sm font-medium text-gray-700">
                              {field.question || field.label || field.description}
                            </p>
                            <p className="text-sm mt-1 text-gray-600">
                              {displayValue}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
        
        {/* Footer with navigation buttons - Enhanced styling */}
        <div className="flex justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/task-center')}
            className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900 shadow-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Task Center
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToTop}
            className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900 shadow-sm"
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            Scroll to Top
          </Button>
        </div>
      </div>
    </div>
  );
};

// Import utility functions
import UnifiedDemoAutoFill from './UnifiedDemoAutoFill';
import { ClearFieldsButton } from './ClearFieldsButton';

// Create a type alias for form sections
type FormSection = NavigationFormSection;

// Logger instance for this component
const logger = getLogger('UniversalForm', { 
  levels: { debug: true, info: true, warn: true, error: true } 
});

/**
 * Helper function to convert service-specific sections to navigation sections
 */
const toNavigationSections = (serviceSections: ServiceFormSection[]): NavigationFormSection[] => {
  return serviceSections.map(section => {
    logger.debug(`Processing section ${section.id} (${section.title}) with ${section.fields?.length || 0} fields`);
    
    return {
      id: section.id,
      title: section.title,
      order: section.order || 0,
      collapsed: section.collapsed || false,
      description: section.description,
      fields: section.fields || []
    };
  });
};

// Props for the UniversalForm component
interface UniversalFormProps {
  taskId?: number;
  taskType: string;
  initialData?: FormData;
  onSubmit?: (data: FormData) => void;
  onCancel?: () => void;
  onProgress?: (progress: number) => void;
  companyName?: string; // Optional company name to display in the form title
  isReadOnly?: boolean; // Flag to force read-only mode (for completed/submitted forms)
  refreshData?: () => Promise<void>; // Function to refresh form data after clearing fields
}

/**
 * An improved UniversalForm component with reliable data management and status tracking
 */
export const UniversalForm: React.FC<UniversalFormProps> = ({
  taskId,
  taskType,
  initialData = {},
  onSubmit,
  onCancel,
  onProgress,
  companyName,
  isReadOnly,
  refreshData
}) => {
  // Get user and company data for the consent section
  const { user } = useUser();
  const { company } = useCurrentCompany();
  
  // Core state for form initialization
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<TaskTemplateWithConfigs | null>(null);
  const [formService, setFormService] = useState<FormServiceInterface | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [fields, setFields] = useState<ServiceFormField[]>([]);
  const [forceRerender, setForceRerender] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for WebSocket-based form submission
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionEvent | null>(null);
  const modalShownRef = useRef(false); // Ref to track if modal has been shown
  
  // State for WebSocket fields events
  const [lastFieldsEvent, setLastFieldsEvent] = useState<any>(null);
  
  // Query for task data
  const { data: task, refetch: refreshTask } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId, // Only run when taskId is provided
  });
  
  // Reset submission state when task status changes to submitted
  useEffect(() => {
    if (task?.status === 'submitted' && isSubmitting) {
      logger.info('Task status is now submitted, resetting submission state');
      setIsSubmitting(false);
    }
  }, [task?.status, isSubmitting]);
  
  // Use our new form data manager hook to handle form data
  const {
    form,
    formData,
    isLoading: isDataLoading,
    hasLoaded: dataHasLoaded,
    error: dataError,
    updateField,
    saveProgress,
    resetForm
  } = useFormDataManager({
    formService,
    taskId,
    initialData,
    fields,
    onDataChange: (data) => {
      logger.debug(`Form data changed: ${Object.keys(data).length} fields`);
    }
  });
  
  // CRITICAL IMPROVEMENT: Determine if form should be in read-only mode based on task status
  // This calculation is done at the very start to ensure we NEVER render editable UI for submitted forms
  const isReadOnlyMode = useMemo(() => {
    // This is our primary gate to prevent flashing of editable forms when form should be read-only
    const isSubmittedOrReadOnly = isReadOnly || 
           task?.status === 'submitted' || 
           task?.status === 'completed' || 
           !!submissionResult;
    
    if (isSubmittedOrReadOnly) {
      // Log that we're in read-only mode to help with debugging
      logger.info(`[UniversalFormNew] Form is in read-only mode: isReadOnly=${isReadOnly}, taskStatus=${task?.status}, hasSubmissionResult=${!!submissionResult}`);
    }
    
    return isSubmittedOrReadOnly;
  }, [isReadOnly, task?.status, submissionResult]);
  
  // IMPROVEMENT: Split the loading states for read-only vs editable forms
  // This prevents showing editable UI elements during read-only form loading
  const readOnlyFormDataLoaded = useMemo(() => {
    const isReady = isReadOnlyMode && dataHasLoaded && fields.length > 0 && sections.length > 0;
    if (isReadOnlyMode && !isReady) {
      logger.debug(`[UniversalFormNew] Read-only form data still loading: dataHasLoaded=${dataHasLoaded}, fields=${fields.length}, sections=${sections.length}`);
    }
    return isReady;
  }, [isReadOnlyMode, dataHasLoaded, fields.length, sections.length]);
  
  const editableFormDataLoaded = useMemo(() => {
    // Never consider editable form loaded if we're in read-only mode (prevents flash)
    if (isReadOnlyMode) return false;
    return dataHasLoaded && !isDataLoading && !loading && fields.length > 0 && sections.length > 0;
  }, [isReadOnlyMode, dataHasLoaded, isDataLoading, loading, fields.length, sections.length]);
  
  // Determine if all data has loaded - use the appropriate loader based on form mode
  const hasLoaded = useMemo(() => {
    return isReadOnlyMode ? readOnlyFormDataLoaded : editableFormDataLoaded;
  }, [isReadOnlyMode, readOnlyFormDataLoaded, editableFormDataLoaded]);
  
  // Make sure agreement_confirmation is set to false by default
  // and sync the agreementChecked React state with form value
  useEffect(() => {
    if (dataHasLoaded && form) {
      // Initialize agreement to false if undefined
      const currentValue = form.getValues('agreement_confirmation');
      
      // If value is undefined in the form, initialize it to false
      if (currentValue === undefined) {
        form.setValue('agreement_confirmation', false, { shouldValidate: false });
        setAgreementChecked(false);
      } else {
        // If there is a value, sync React state with it
        setAgreementChecked(!!currentValue);
      }
    }
  }, [dataHasLoaded, form]);
  
  // Function to get current form values for status calculation
  const getFormValues = useCallback(() => {
    return formService ? formService.getFormData() : formData;
  }, [formService, formData]);
  
  // Use our new form status hook to track section and overall progress
  const {
    sectionStatuses,
    completedSections,
    overallProgress,
    activeSection,
    setActiveSection,
    refreshStatus,
    setSectionStatuses // Added missing setSectionStatuses function
  } = useFormStatus({
    sections,
    getFormValues,
    fields,
    requiredOnly: true,
    onChange: onProgress
  });
  
  /**
   * Enhanced function to refresh form data after clearing fields or other operations
   * 
   * CRITICAL FIX: This function is the central mechanism that prevents unwanted
   * server reloads after clear operations. The improvements here are essential
   * to fix the race condition where clearing fields is immediately followed by
   * a reload from the server.
   * 
   * @param options Configuration options for the refresh operation
   * @param options.skipServerRefresh Whether to prevent fetching new data from the server
   * @returns Promise that resolves when the refresh is complete
   */
  const refreshFormData = useCallback(async (options: { 
    skipServerRefresh?: boolean, 
    forceUIReset?: boolean,
    clearCache?: boolean 
  } = {}): Promise<void> => {
    // Default to skipServerRefresh=true for safety (except when clearCache is true)
    const skipServerRefresh = options.clearCache ? false : (options.skipServerRefresh ?? true);
    // Support for forcefully resetting the UI state
    const forceUIReset = options.forceUIReset === true;
    // Whether to perform aggressive cache clearing
    const clearCache = options.clearCache === true;
    
    // Generate a unique operation ID for diagnostic tracking
    const operationId = `refresh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    try {
      logger.info(`[DIAGNOSTIC][${operationId}] Refreshing form data`, {
        skipServerRefresh,
        forceUIReset,
        clearCache,
        taskId,
        taskType,
        hasForm: !!form,
        hasResetForm: !!resetForm,
        hasRefreshStatus: !!refreshStatus,
        hasRefreshTask: !!refreshTask,
        sections: sections?.length || 0,
        activeSection,
        timestamp: new Date().toISOString()
      });
      
      // AGGRESSIVE CACHE CLEARING - only when clearCache is specifically requested
      if (clearCache && taskId) {
        try {
          logger.info(`[DIAGNOSTIC][${operationId}] Performing aggressive cache clearing`);
          
          // Import and use query client directly
          const { queryClient } = require('@/lib/queryClient');
          
          // Clear cache for specific endpoints related to this task
          const cacheKeysToRemove = [
            `/api/tasks/${taskId}`,
            `/api/tasks.json/${taskId}`,
            `/api/kyb/progress/${taskId}`,
            `/api/ky3p/progress/${taskId}`,
            `/api/tasks/${taskId}/kyb-responses`,
            `/api/tasks/${taskId}/ky3p-responses`,
            `/api/tasks/${taskId}/open-banking-responses`,
            `/api/tasks/${taskId}/form-data`
          ];
          
          // Remove each query from cache directly (stronger than invalidate)
          for (const key of cacheKeysToRemove) {
            queryClient.removeQueries({ queryKey: [key] });
            logger.info(`[DIAGNOSTIC][${operationId}] Removed query cache for ${key}`);
          }
        } catch (cacheError) {
          logger.error(`[DIAGNOSTIC][${operationId}] Error clearing cache:`, cacheError);
        }
      }
      
      // ENHANCED CLEAR OPERATION DETECTION:
      // Check for recent clear operations with stronger timing and expiration logic
      let preventServerRefresh = skipServerRefresh;
      
      if (window._lastClearOperation) {
        const clearOp = window._lastClearOperation;
        const now = Date.now();
        const msSinceClear = now - clearOp.timestamp;
        const isForCurrentTask = clearOp.taskId === taskId;
        const isStillValid = clearOp.blockExpiration ? now < clearOp.blockExpiration : msSinceClear < 30000;
        
        if (isForCurrentTask && isStillValid) {
          // We have a valid clear operation blocking - enforce skipServerRefresh regardless of passed option
          preventServerRefresh = true;
          
          const expiration = clearOp.blockExpiration || (clearOp.timestamp + 30000);
          const remainingMs = Math.max(0, expiration - now);
          
          logger.info(`[DIAGNOSTIC][${operationId}] Active clear operation blocking server refresh`, {
            taskId,
            clearOpTimestamp: new Date(clearOp.timestamp).toISOString(),
            msSinceClear,
            remainingMs,
            expiresAt: new Date(expiration).toISOString(),
            originalSkipServerRefresh: skipServerRefresh
          });
        } else if (isForCurrentTask && !isStillValid) {
          // Clear operation has expired - clear it
          logger.info(`[DIAGNOSTIC][${operationId}] Clear operation has expired, clearing`, {
            taskId,
            clearOpTimestamp: new Date(clearOp.timestamp).toISOString(),
            msSinceClear,
            isExpired: true
          });
          window._lastClearOperation = null;
        }
      }
      
      // FORM RESET HANDLING:
      // Only reset form state if we're explicitly requesting server data
      if (!preventServerRefresh && resetForm) {
        logger.info(`[DIAGNOSTIC][${operationId}] Calling resetForm() to reload form data from server`);
        try {
          await resetForm();
        } catch (resetError) {
          logger.error(`[DIAGNOSTIC][${operationId}] Error in resetForm():`, resetError);
        }
      } else {
        logger.info(`[DIAGNOSTIC][${operationId}] Skipping resetForm() to prevent reloading data from server`);
        
        // CLIENT-SIDE FORM RESET:
        // Instead of reloading from server, manually reset the form state
        if (form) {
          try {
            // Reset form UI state directly without server call
            form.reset({});
            
            logger.info(`[DIAGNOSTIC][${operationId}] Successfully reset form state client-side`, {
              isDirty: form.formState.isDirty,
              isValid: form.formState.isValid,
              fieldCount: Object.keys(form.getValues()).length
            });
          } catch (formResetError) {
            logger.error(`[DIAGNOSTIC][${operationId}] Error in client-side form reset:`, formResetError);
          }
        }
      }
      
      // UI SYNCHRONIZATION:
      // Ensure section navigation is reset regardless of server refresh
      try {
        // Reset to first section for better UX
        if (typeof setActiveSection === 'function') {
          setActiveSection(0);
          logger.info(`[DIAGNOSTIC][${operationId}] Reset active section to 0`);
        }
        
        // Reset section statuses for immediate visual feedback
        if (typeof setSectionStatuses === 'function' && sections && sections.length > 0) {
          const resetSectionStatuses = sections.map(section => ({
            id: section.id,
            title: section.title,
            totalFields: 0,
            filledFields: 0,
            remainingFields: 0,
            progress: 0,
            status: 'not-started' as const
          }));
          
          // Apply reset immediately
          setSectionStatuses(resetSectionStatuses);
          
          // Apply again after a short delay to prevent React batching from losing this update
          setTimeout(() => {
            setSectionStatuses(resetSectionStatuses);
          }, 50);
          
          logger.info(`[DIAGNOSTIC][${operationId}] Reset section statuses`, {
            sections: sections.length
          });
        }
        
        // Update progress calculations
        if (refreshStatus) {
          refreshStatus();
          logger.info(`[DIAGNOSTIC][${operationId}] Refreshed section status calculations`);
        }
      } catch (uiSyncError) {
        logger.error(`[DIAGNOSTIC][${operationId}] Error in UI synchronization:`, uiSyncError);
      }
      
      // SERVER DATA REFRESH:
      // Only if explicitly requested AND not blocked by clear operation
      if (!preventServerRefresh && refreshTask) {
        logger.info(`[DIAGNOSTIC][${operationId}] Refreshing task data from server`);
        try {
          await refreshTask();
        } catch (refreshError) {
          logger.error(`[DIAGNOSTIC][${operationId}] Error refreshing task data:`, refreshError);
        }
      } else {
        logger.info(`[DIAGNOSTIC][${operationId}] Skipped server data refresh`, {
          preventServerRefresh,
          isSkipped: true
        });
      }
      
      // Log section statuses after refresh (CRITICAL DIAGNOSTIC)
      if (sectionStatuses && sectionStatuses.length > 0) {
        logger.info(`[DIAGNOSTIC][${operationId}] Section statuses AFTER refresh:`, {
          sections: sectionStatuses.map(s => ({
            id: s.id,
            title: s.title,
            progress: s.progress,
            status: s.status
          }))
        });
      }
      
      // Force rerender to update UI state
      logger.info(`[DIAGNOSTIC][${operationId}] Forcing component rerender`);
      setForceRerender(prev => !prev);
      
      logger.info(`[DIAGNOSTIC][${operationId}] Form data refresh completed successfully`);
      
      // Add a final check after a small delay to verify the changes persisted
      setTimeout(() => {
        if (sectionStatuses && sectionStatuses.length > 0) {
          logger.info(`[DIAGNOSTIC][${operationId}] Section statuses AFTER TIMEOUT (500ms):`, {
            sections: sectionStatuses.map(s => ({
              id: s.id,
              title: s.title,
              progress: s.progress,
              status: s.status
            }))
          });
          
          // ENHANCED FIX: More aggressive reset for section statuses
          // Force reset regardless of current progress state when options.forceUIReset is true
          const hasIncorrectStatuses = sectionStatuses.some(s => s.progress > 0);
          if ((typeof setSectionStatuses === 'function') && 
              (hasIncorrectStatuses || forceUIReset)) {
            
            logger.info(`[DIAGNOSTIC][${operationId}] Forcing section status reset`, {
              reason: hasIncorrectStatuses ? 'detected incorrect statuses' : 'forceUIReset option',
              timestamp: new Date().toISOString(),
              options: JSON.stringify(options)
            });
            
            // Create properly formatted reset statuses
            const forceResetStatuses = sections.map(section => ({
              id: section.id,
              title: section.title,
              totalFields: 0,
              filledFields: 0,
              remainingFields: 0,
              progress: 0,
              status: 'not-started' as const
            }));
            
            // Force set the section statuses one more time
            setSectionStatuses(forceResetStatuses);
            
            // Also reset active section to first tab
            setActiveSection(0);
            
            // Force a second reset after a very short delay to ensure it takes effect
            setTimeout(() => {
              if (typeof setSectionStatuses === 'function') {
                logger.info(`[DIAGNOSTIC][${operationId}] Second forced reset after 50ms`);
                setSectionStatuses(forceResetStatuses);
              }
            }, 50);
          }
        }
      }, 500);
    } catch (error) {
      logger.error(`Error refreshing form data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }, [resetForm, form, setActiveSection, refreshStatus, refreshTask]);
  
  // Handle fields cleared via WebSocket event
  const handleFieldsCleared = useCallback((event: FieldsEvent) => {
    const wsEventId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    logger.info(`[DIAGNOSTIC][${wsEventId}] Fields cleared event received:`, {
      eventType: event.type,
      taskId: event.payload.taskId,
      formType: event.payload.formType,
      // Enhanced logging to show if we received the new resetUI and clearSections flags
      resetUI: !!event.payload.resetUI,
      clearSections: !!event.payload.clearSections,
      clearedAt: event.payload.clearedAt || 'not provided',
      timestamp: new Date().toISOString()
    });
    
    // Only process if this is for our task ID
    if (event.payload.taskId !== taskId) {
      logger.debug(`[DIAGNOSTIC][${wsEventId}] Ignoring event for different task ID: expected ${taskId}, got ${event.payload.taskId}`);
      return;
    }
    
    // Show toast notification for remote clearing
    toast({
      title: 'Form Fields Cleared',
      description: 'The form fields have been cleared by another user.',
      variant: 'info',
    });
    
    // CRITICAL FIX: Force a full cache invalidation and data reload
    // This addresses the issue where the UI shows completed sections but DB has 0% progress
    try {
      logger.info(`[DIAGNOSTIC][${wsEventId}] Performing AGGRESSIVE CACHE REFRESH`);
      
      // 1. Force immediate query cache invalidation to prevent stale data
      const { queryClient } = require('@/lib/queryClient');
      
      // Clear query cache for all form-related endpoints
      const cacheKeysToInvalidate = [
        `/api/tasks/${taskId}`,
        `/api/tasks.json/${taskId}`,
        `/api/kyb/progress/${taskId}`,
        `/api/ky3p/progress/${taskId}`,
        `/api/tasks/${taskId}/kyb-responses`,
        `/api/tasks/${taskId}/ky3p-responses`,
        `/api/tasks/${taskId}/open-banking-responses`,
        `/api/tasks/${taskId}/form-data`
      ];
      
      // First remove the queries to ensure data is fully cleared
      cacheKeysToInvalidate.forEach(key => {
        queryClient.removeQueries({ queryKey: [key] });
        logger.info(`[DIAGNOSTIC][${wsEventId}] Removed query cache for ${key}`);
      });
      
      // Then invalidate to trigger a refetch
      cacheKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
        logger.info(`[DIAGNOSTIC][${wsEventId}] Invalidated query cache for ${key}`);
      });
    } catch (cacheError) {
      logger.error(`[DIAGNOSTIC][${wsEventId}] Error during cache invalidation:`, cacheError);
    }
    
    // 2. Reset the form's internal data
    try {
      logger.info(`[DIAGNOSTIC][${wsEventId}] Resetting form data with aggressive approach`, {
        hasForm: !!form,
        hasSetSectionStatuses: typeof setSectionStatuses === 'function',
        sectionCount: sections?.length || 0,
      });
      
      // Reset form completely with empty data
      if (form) {
        // Create empty data object
        const emptyData = {};
        form.reset(emptyData);
        
        // Force clear all fields individually
        try {
          const formValues = form.getValues();
          Object.keys(formValues).forEach(field => {
            form.setValue(field, '', { shouldValidate: false, shouldDirty: false });
          });
          logger.info(`[DIAGNOSTIC][${wsEventId}] Form fields individually cleared`);
        } catch (clearError) {
          logger.warn(`[DIAGNOSTIC][${wsEventId}] Error clearing individual fields:`, clearError);
        }
        
        // Clear form errors
        form.clearErrors();
        logger.info(`[DIAGNOSTIC][${wsEventId}] Form reset completed`);
      }
      
      // Create reset section statuses - CRITICAL: Set progress to 0 for all sections
      const resetSectionStatuses = sections.map(section => ({
        id: section.id,
        title: section.title,
        totalFields: 0,
        filledFields: 0,
        remainingFields: 0,
        progress: 0,
        status: 'not-started' as const
      }));
      
      // Always reset section statuses - this is critical for UI consistency
      if (typeof setSectionStatuses === 'function') {
        logger.info(`[DIAGNOSTIC][${wsEventId}] Forcefully resetting all section statuses`, {
          sectionCount: resetSectionStatuses.length
        });
        
        // Apply multiple resets with increasing delays for maximum reliability
        setSectionStatuses(resetSectionStatuses);
        
        // Additional resets with escalating delays to ensure it takes effect
        // even if there are race conditions with data fetching
        setTimeout(() => {
          if (typeof setSectionStatuses === 'function') {
            logger.info(`[DIAGNOSTIC][${wsEventId}] Second section status reset (50ms)`);
            setSectionStatuses(resetSectionStatuses);
          }
        }, 50);
        
        setTimeout(() => {
          if (typeof setSectionStatuses === 'function') {
            logger.info(`[DIAGNOSTIC][${wsEventId}] Third section status reset (300ms)`);
            setSectionStatuses(resetSectionStatuses);
          }
        }, 300);
        
        setTimeout(() => {
          if (typeof setSectionStatuses === 'function') {
            logger.info(`[DIAGNOSTIC][${wsEventId}] Fourth section status reset (1000ms)`);
            setSectionStatuses(resetSectionStatuses);
          }
        }, 1000);
        
        // Set active section to first tab
        setActiveSection(0);
      }
    } catch (resetError) {
      logger.error(`[DIAGNOSTIC][${wsEventId}] Error resetting form: ${resetError instanceof Error ? resetError.message : String(resetError)}`);
    }
    
    // Refresh form data with most aggressive options
    const refreshOptions = {
      skipServerRefresh: false, // CHANGED: Force a full server refresh to get latest data
      forceUIReset: true,       // Always force UI reset
      clearCache: true          // New option to clear cache during refresh
    };
    
    logger.info(`[DIAGNOSTIC][${wsEventId}] Calling refreshFormData with aggressive options`, refreshOptions);
    
    // Execute immediate refresh
    refreshFormData(refreshOptions).catch(error => {
      logger.error(`[DIAGNOSTIC][${wsEventId}] Error refreshing form data: ${error instanceof Error ? error.message : String(error)}`);
      
      toast({
        title: 'Update Failed',
        description: 'Failed to refresh form after clearing. Please reload the page.',
        variant: 'destructive',
      });
    });
    
    // Add multiple delayed refresh attempts to handle race conditions
    for (const delay of [100, 500, 1500, 3000]) {
      setTimeout(() => {
        if (refreshStatus) {
          logger.info(`[DIAGNOSTIC][${wsEventId}] Executing delayed refresh after ${delay}ms`);
          refreshStatus();
        }
      }, delay);
    }
    
    // Force reload the page as a last resort after 5 seconds if issues persist
    setTimeout(() => {
      try {
        // Check if the section progress is inconsistent with task progress
        const hasInconsistentProgress = sectionStatuses.some(s => s.progress > 0);
        
        if (hasInconsistentProgress) {
          logger.warn(`[DIAGNOSTIC][${wsEventId}] Detected inconsistent UI state after clearing, forcing page reload`);
          
          toast({
            title: 'Refreshing page',
            description: 'Completing form reset operation...',
            variant: 'default',
          });
          
          // Give time for toast to display
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        logger.error(`[DIAGNOSTIC][${wsEventId}] Error in final consistency check:`, error);
      }
    }, 5000);
  }, [taskId, refreshFormData, form, sections, setSectionStatuses, setActiveSection, refreshStatus]);
  
  // Create and manage the Review & Submit section
  const [allSections, setAllSections] = useState<FormSection[]>([]);
  
  // Update sections when main form sections change to include the Review & Submit section
  useEffect(() => {
    if (sections.length > 0) {
      // Create a Review & Submit section to be added at the end
      const reviewSection: FormSection = {
        id: 'review-section',
        title: 'Review & Submit',
        order: sections.length,
        description: 'Review your answers and submit the form',
      };
      
      // Combine regular sections with review section
      setAllSections([...sections, reviewSection]);
    } else {
      setAllSections([]);
    }
  }, [sections]);
  
  // Load template and form configuration - step 1: fetch template
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        logger.info(`Fetching template for task type: ${taskType}`);
        setLoading(true);
        setError(null);
        
        // Map task types to their database equivalents if needed
        const taskTypeMap: Record<string, string> = {
          'kyb': 'company_kyb',
          'card': 'company_card',
          'security': 'security_assessment'
        };
        
        // Use the mapped task type for API requests if available
        const dbTaskType = taskTypeMap[taskType] || taskType;
        
        try {
          // Fetch template configuration
          const templateData = await TaskTemplateService.getTemplateByTaskType(dbTaskType);
          logger.info(`Template loaded: ID=${templateData.id}, Name=${templateData.name}`);
          setTemplate(templateData);
        } catch (err) {
          logger.warn(`Could not load template for ${dbTaskType}:`, err);
          logger.info('Will try to continue with available services');
        }
        
        // Find the appropriate form service with proper data isolation by company
        // CRITICAL DATA ISOLATION FIX: Use proper factory with company/task IDs
        logger.debug(`Looking for company-specific form service for task type: ${taskType}`);
        
        // Import to avoid circular references
        const { formServiceFactory } = await import('@/services/form-service-factory');
        
        // Get current company ID from user context
        let companyId;
        try {
          // Use the proper userContext utility instead of direct sessionStorage access
          const contextData = userContext.getContext();
          companyId = contextData?.companyId;
          if (companyId) {
            logger.info(`Data isolation: Using company ID ${companyId} from user context`);
          } else if (company?.id) {
            // Fallback to company from useCurrentCompany hook if available
            companyId = company.id;
            logger.info(`Data isolation: Using company ID ${companyId} from current company`);
          }
        } catch (error) {
          logger.warn('Error accessing user context:', error);
        }
        
        // Try to get a company-specific form service instance - WITH PROMISE HANDLING
        // Declare service variable outside the try block to maintain proper scope
        let service = null;
        
        try {
          // Get service asynchronously
          service = await formServiceFactory.getServiceInstance(taskType, companyId, taskId);
          
          if (!service) {
            // Try with mapped DB task type
            logger.debug(`No service found for ${taskType}, trying with DB task type: ${dbTaskType}`);
            service = await formServiceFactory.getServiceInstance(dbTaskType, companyId, taskId);
          }
          
          // Fall back to component factory if needed (but log a warning)
          if (!service) {
            logger.warn(`Could not create isolated form service, falling back to legacy factory`);
            service = componentFactory.getFormService(taskType);
            
            if (!service) {
              service = componentFactory.getFormService(dbTaskType);
            }
          }
          
          // If service is a Promise, await it (defensive coding)
          if (service instanceof Promise) {
            logger.debug('Service is a Promise, awaiting resolution...');
            service = await service;
          }
          
          // Log whether we got a service
          if (service) {
            // Safe access to constructor name with fallbacks
            const serviceName = service.constructor ? service.constructor.name : typeof service;
            logger.info(`Found form service: ${serviceName}`);
            
            // Set the service in state
            setFormService(service);
          } else {
            logger.error(`No form service found for ${taskType} or ${dbTaskType}`);
            throw new Error(`No form service registered for task types: ${taskType} or ${dbTaskType}`);
          }
        } catch (serviceError) {
          logger.error('Error loading form service:', serviceError);
          throw serviceError; // Re-throw to be caught by the outer try/catch
        }
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load form template';
        logger.error('Template fetch error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    fetchTemplate();
  }, [taskType, taskId, company]);
  
  // Step 2: Initialize form with fields and sections from template or service
  useEffect(() => {
    const initializeForm = async () => {
      if (!formService) return;
      
      try {
        // First try to get fields and sections from the service
        logger.info('Initializing form structure with form service');
        
        // ENHANCED DIAGNOSTICS: Check if form service is properly initialized
        logger.info(`Form service type: ${formService.constructor.name}`);
        logger.info(`Form service has initialize method: ${typeof formService.initialize === 'function'}`);
        
        // Initialize service with template if needed
        if (template && typeof formService.initialize === 'function') {
          try {
            logger.info(`Initializing form service with template ID: ${template.id}`);
            await formService.initialize(template.id);
            logger.info(`Form service initialization completed`);
          } catch (initError) {
            logger.error('Error initializing form service:', initError);
          }
        }
        
        // Fetch fields from the service with ENHANCED DIAGNOSTICS
        logger.info(`Fetching fields from form service...`);
        try {
          const serviceFields = formService.getFields();
          logger.info(`Fields result type: ${typeof serviceFields}`);
          logger.info(`Is fields array: ${Array.isArray(serviceFields)}`);
          
          if (serviceFields && serviceFields.length > 0) {
            logger.info(`Loaded ${serviceFields.length} fields from form service`);
            logger.info(`Sample field: ${JSON.stringify(serviceFields[0])}`);
            setFields(sortFields(serviceFields));
          } else {
            logger.warn('No fields returned from form service (empty array or null)');
            setFields([]);
          }
        } catch (fieldError) {
          logger.error('Error getting fields from form service:', fieldError);
          setFields([]);
        }
        
        // Fetch sections from the service with ENHANCED DIAGNOSTICS
        logger.info(`Fetching sections from form service...`);
        try {
          // Handle async getSections method
          const serviceSections = await Promise.resolve(formService.getSections());
          logger.info(`Sections result type: ${typeof serviceSections}`);
          logger.info(`Is sections array: ${Array.isArray(serviceSections)}`);
          
          if (serviceSections && Array.isArray(serviceSections) && serviceSections.length > 0) {
            logger.info(`Loaded ${serviceSections.length} sections from form service`);
            logger.info(`Sample section: ${JSON.stringify(serviceSections[0])}`);
            
            // Convert to navigation sections and sort
            const navigationSections = toNavigationSections(serviceSections);
            setSections(sortSections(navigationSections));
          } else {
            logger.warn('No sections returned from form service (empty array or null)');
            setSections([]);
          }
        } catch (sectionError) {
          logger.error('Error getting sections from form service:', sectionError);
          setSections([]);
        }
        
        // Mark loading as complete when we have both fields and sections
        setLoading(false);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize form';
        logger.error('Form initialization error:', message);
        setError(message);
        setLoading(false);
      }
    };
    
    initializeForm();
  }, [formService, template]);
  
  // Track first load state to only auto-navigate once
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);
  
  // Auto-navigate to review section (when status is "ready_for_submission") or first incomplete field
  useEffect(() => {
    // Only run this effect once on initial data load and never again
    if (sections.length > 0 && !loading && fields.length > 0 && dataHasLoaded && !hasAutoNavigated) {
      logger.info('Auto-navigating form on initial load based on task status and completion');
      
      // Mark that we've performed the auto-navigation
      setHasAutoNavigated(true);
      
      // Check if task is ready for submission - if so, navigate to review section
      if (task?.status === 'ready_for_submission' && allSections.length > 0) {
        logger.info('Task status is ready_for_submission, navigating to review section');
        // Navigate to the last section (which is the review & submit section)
        setActiveSection(allSections.length - 1);
        return;
      }
      
      // If not, find the first incomplete section based on section statuses
      if (sectionStatuses.length > 0) {
        for (let i = 0; i < sectionStatuses.length; i++) {
          if (sectionStatuses[i].status !== 'completed') {
            logger.info(`Found first incomplete section: ${sections[i].title} at index ${i}`);
            setActiveSection(i);
            return;
          }
        }
        
        // If all sections are complete, go to review section
        if (allSections.length > 0) {
          logger.info('All sections are complete, navigating to review section');
          setActiveSection(allSections.length - 1);
        }
      }
    }
  }, [
    sections, 
    loading, 
    fields.length, 
    dataHasLoaded, 
    hasAutoNavigated,
    task?.status,
    allSections.length,
    sectionStatuses,
    setActiveSection
  ]);
  
  // Handle clearing form fields with proper logging and error handling
  const handleClearFieldsAction = async (): Promise<void> => {
    const clearOpId = `clear_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    logger.info(`[DIAGNOSTIC][${clearOpId}] Starting clear fields operation`, {
      taskId,
      taskType,
      timestamp: new Date().toISOString()
    });
    
    if (!taskId) {
      logger.warn(`[DIAGNOSTIC][${clearOpId}] Cannot clear fields - no task ID provided`);
      return;
    }
    
    // Verify that fields have loaded before attempting to clear them
    if (!Array.isArray(fields) || fields.length === 0) {
      logger.warn(`[DIAGNOSTIC][${clearOpId}] Cannot clear fields - fields have not been loaded yet`, {
        fieldsType: typeof fields,
        isArray: Array.isArray(fields),
        length: fields?.length || 0
      });
      return;
    }
    
    // No need to set loading state here as ClearFieldsButton manages its own loading state
    
    // Log section statuses before clearing (for comparison)
    if (sectionStatuses && sectionStatuses.length > 0) {
      logger.info(`[DIAGNOSTIC][${clearOpId}] Section statuses BEFORE clearing:`, {
        sections: sectionStatuses.map(s => ({
          id: s.id,
          title: s.title,
          progress: s.progress,
          status: s.status
        }))
      });
    }
    
    try {
      // Get form type - prefer the standard taskType over formService for reliability
      // Make sure to use the correct URL format that matches our backend routes
      let formType = taskType;
      
      // Map taskType to URL-friendly form type
      if (taskType === 'company_kyb') {
        formType = 'kyb';
      } else if (taskType === 'open_banking') {
        formType = 'open-banking';
      }
      
      const formTaskId = taskId;
      // CRITICAL FIX: Don't preserve progress by default for any form type
      // Only preserve progress in special cases like KY3P editing mode, which is determined elsewhere
      const preserveProgress = false;
      
      logger.info(`[DIAGNOSTIC][${clearOpId}] Clearing all fields for ${formType} task ${formTaskId}`, {
        taskId: formTaskId,
        formType,
        preserveProgress,
        taskType,
        fieldCount: fields.length,
        sectionCount: sections.length,
        formState: form ? {
          isDirty: form.formState.isDirty,
          isSubmitted: form.formState.isSubmitted,
          isValid: form.formState.isValid
        } : 'no form'
      });
      
      // Build the clear URL
      const clearUrl = `/api/${formType}/clear/${formTaskId}${preserveProgress ? '?preserveProgress=true' : ''}`;
      logger.info(`[DIAGNOSTIC][${clearOpId}] Calling clear fields API: ${clearUrl}`);
      
      // Force a layout refresh before making the request
      // This helps ensure that React doesn't batch updates and miss changes
      document.body.offsetHeight;
      
      // ENHANCEMENT: Track that we've just done a clear operation to prevent reload racing condition
      // Calculate explicit block expiration time - 30 seconds from now
      const now = Date.now();
      const blockExpiration = now + 30000; // 30 seconds
      
      window._lastClearOperation = {
        taskId: formTaskId,
        timestamp: now,
        formType,
        blockExpiration
      };
      
      logger.info(`[DIAGNOSTIC][${clearOpId}] Set clear operation block until ${new Date(blockExpiration).toISOString()}`, {
        formType,
        taskId: formTaskId,
        blockDurationMs: 30000
      });
      
      // CRITICAL FIX: Reset the form's values on the client side FIRST
      try {
        form.reset({});
        logger.info(`[DIAGNOSTIC][${clearOpId}] Pre-emptively reset form values on client side`);
        
        // CRITICAL FIX: Reset section statuses BEFORE server call
        if (typeof setSectionStatuses === 'function') {
          const resetSectionStatuses = sections.map(section => ({
            id: section.id,
            title: section.title,
            totalFields: 0,
            filledFields: 0,
            remainingFields: 0,
            progress: 0,
            status: 'not-started' as const
          }));
          setSectionStatuses(resetSectionStatuses);
          logger.info(`[DIAGNOSTIC][${clearOpId}] Pre-emptively reset section statuses on client side`);
        }
      } catch (preResetError) {
        logger.error(`[DIAGNOSTIC][${clearOpId}] Error in pre-emptive reset: ${preResetError instanceof Error ? preResetError.message : String(preResetError)}`);
      }
      
      try {
        // Use direct fetch with timeout and better error capturing
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // CRITICAL FIX: Add a cache-busting parameter to prevent stale data
        const cacheBuster = `&cacheBuster=${Date.now()}`;
        const clearUrlWithCacheBuster = `${clearUrl}${clearUrl.includes('?') ? cacheBuster.replace('&', '&') : `?${cacheBuster.substring(1)}`}`;
        
        logger.info(`[DIAGNOSTIC][${clearOpId}] Sending clear request with cache busting: ${clearUrlWithCacheBuster}`);
        
        const response = await fetch(clearUrlWithCacheBuster, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: JSON.stringify({ 
            preserveProgress,
            timestamp: Date.now(),
            clearOperation: clearOpId
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to clear fields. Server responded with: ${response.status}. ${errorText}`);
        }
        
        const result = await response.json();
        
        // Log success with detailed information for debugging
        logger.info(`[DIAGNOSTIC][${clearOpId}] Successfully cleared fields via API for ${formType} task ${formTaskId}`, {
          taskId: formTaskId,
          formType,
          status: result.status || 'unknown',
          progress: result.progress !== undefined ? result.progress : 'unknown',
          preserveProgress,
          apiSuccess: result.success,
          timestamp: new Date().toISOString()
        });
      } catch (apiError) {
        // Log API errors but continue with client-side clearing as fallback
        logger.error(`[DIAGNOSTIC][${clearOpId}] API error when clearing fields: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
      
      // Reset form to empty values - client-side fallback
      try {
        // Simple form reset for client-side
        form.reset({});
        
        // Update fields individually as a fallback, ensuring they're properly set to null/empty
        if (Array.isArray(fields)) {
          fields.forEach(field => {
            const fieldId = field.key || String((field as any).id) || '';
            if (fieldId) {
              try {
                form.setValue(fieldId, null);
              } catch (e) {
                // Ignore field reset errors
              }
            }
          });
        }
        
        logger.info('Client-side form reset completed');
        
        // Force section status recalculation by resetting the active section
        try {
          // Create properly formatted section statuses for reset with a unique operation ID
          const resetOpId = `reset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          
          logger.info(`[DIAGNOSTIC][${resetOpId}] Preparing to reset section statuses`, {
            sectionCount: sections.length,
            timestamp: new Date().toISOString()
          });
          
          const resetSectionStatuses = sections.map(section => ({
            id: section.id,
            title: section.title,
            totalFields: 0,
            filledFields: 0,
            remainingFields: 0,
            progress: 0,
            status: 'not-started' as const
          }));
          
          // Check that sectionStatuses state setter exists
          if (typeof setSectionStatuses === 'function') {
            logger.info(`[DIAGNOSTIC][${resetOpId}] Resetting section statuses using setter function`, {
              sectionCount: resetSectionStatuses.length,
              sections: resetSectionStatuses.map(s => `${s.id}:${s.title}:${s.status}`),
              timestamp: new Date().toISOString()
            });
            
            // CRITICAL FIX: Perform the resetSectionStatuses before AND after timeout
            // This ensures React state updates properly even with batched updates
            setSectionStatuses(resetSectionStatuses);
            
            // Schedule another update after a small delay to ensure it takes effect
            setTimeout(() => {
              logger.info(`[DIAGNOSTIC][${resetOpId}] Reinforcing section status reset after delay`, {
                timestamp: new Date().toISOString()
              });
              setSectionStatuses(resetSectionStatuses);
            }, 100);
          } else {
            logger.warn(`[DIAGNOSTIC][${resetOpId}] setSectionStatuses function not available, cannot reset section statuses`);
            // Fallback to just refreshing the status
            if (refreshStatus) {
              logger.info(`[DIAGNOSTIC][${resetOpId}] Falling back to refreshStatus call`);
              refreshStatus();
            }
          }
          
          // Reset active section to the first one
          setActiveSection(0);
          
          logger.info('Section statuses reset after clearing fields', {
            sections: sections.length,
            resetTo: 'not-started'
          });
        } catch (calcError) {
          logger.error(`Error resetting section statuses: ${calcError instanceof Error ? calcError.message : String(calcError)}`);
        }
      } catch (resetError) {
        logger.error(`Error during form reset: ${resetError instanceof Error ? resetError.message : String(resetError)}`);
      }
      
      // Use our internal refreshFormData function to refresh UI without loading data from server
      // CRITICAL FIX: Use skipServerRefresh=true to prevent auto-reloading of data
      try {
        await refreshFormData({ skipServerRefresh: true });
        logger.info('UI refresh completed without server data reload');
        
        // CRITICAL FIX: Force recalculation of form progress after clearing fields
        // This will update the progress bar and section tabs correctly
        setTimeout(() => {
          // First refresh the status to recalculate progress
          if (refreshStatus) {
            logger.info('Explicitly forcing form status recalculation');
            refreshStatus();
          }
          
          // Then refresh the task to get the updated status from server
          if (typeof refreshTask === 'function') {
            logger.info('Explicitly refreshing task data from server');
            refreshTask();
          }
        }, 500); // Small delay to ensure other updates have completed
      } catch (refreshError) {
        logger.error(`Error during UI refresh: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`);
      }
      
      // Force UI update to ensure cleared state is visible
      setForceRerender(prev => !prev);
    } catch (clearError) {
      // Properly handle any errors during the clear operation
      logger.error('Error clearing form fields:', clearError);
      throw clearError;
    } finally {
      // No need to reset loading state here as ClearFieldsButton manages its own loading state
    }
  };
  
  // Handle submission - with validation showing which fields are incomplete
  const handleSubmit = async (data: FormData) => {
    logger.info(`Submit button clicked for ${taskType} task ${taskId}`);
    
    // Validate that we have all required fields first
    if (overallProgress < 100) {
      logger.warn(`Cannot submit form with incomplete fields: ${overallProgress}% complete`);
      
      toast({
        title: 'Form incomplete',
        description: 'Please complete all required fields before submitting.',
        variant: 'warning',
      });
      
      // Find the first incomplete section
      for (let i = 0; i < sectionStatuses.length; i++) {
        if (sectionStatuses[i].status !== 'completed') {
          setActiveSection(i); // Navigate to the first incomplete section
          break;
        }
      }
      
      return;
    }
    
    // Make sure agreement confirmation is checked  
    if (!agreementChecked) {
      logger.warn('Cannot submit form without accepting the agreement');
      
      toast({
        title: 'Agreement required',
        description: 'Please accept the agreement to submit this form.',
        variant: 'warning',
      });
      
      // Navigate to review section which contains the agreement
      setActiveSection(allSections.length - 1);
      
      return;
    }
    
    // Set form into submitting state
    setIsSubmitting(true);
    
    // Update task status to in_progress immediately for better user feedback
    if (task) {
      // Log the desired state change - but we'll rely on API and refreshTask to update the actual state
      logger.info('Task will be marked as ready_for_submission: progress=100%');
      
      // Instead of using setTask (which doesn't exist), trigger a refreshTask
      if (typeof refreshTask === 'function') {
        // Refresh task data to show latest status
        refreshTask();
      }
    }
    
    // Show submission in progress toast
    toast({
      title: 'Submitting form...',
      description: 'Please wait while your form is being submitted.',
      variant: 'default',
    });
    
    try {
      // If a custom onSubmit handler is provided, use it
      if (onSubmit) {
        logger.info('Using provided onSubmit callback');
        onSubmit(data);
        return;
      }
      
      // Otherwise, use the default API method
      if (!taskId) {
        throw new Error('Cannot submit form without a task ID');
      }
      
      // Prepare submission URL based on task type
      const submitUrl = `/api/forms/${taskType}/${taskId}/submit`;
      
      logger.info(`Submitting form data to: ${submitUrl}`);
      
      // Send the form data to the server - this now uses task-wide submissions
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Form submission failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      logger.info(`Form submitted successfully: ${JSON.stringify(result)}`);
      
      // Force refresh task multiple times to catch eventual consistency lag
      if (typeof refreshTask === 'function') {
        // Refresh immediately and then at intervals with more frequent refreshes
        refreshTask();
        
        // More frequent refreshes to ensure we catch the submitted state
        setTimeout(() => refreshTask && refreshTask(), 500);
        setTimeout(() => refreshTask && refreshTask(), 1000);
        setTimeout(() => refreshTask && refreshTask(), 2000);
        setTimeout(() => refreshTask && refreshTask(), 3000);
        setTimeout(() => refreshTask && refreshTask(), 5000);
      }
      
      // Note: The success feedback will be handled via WebSocket events now
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      logger.error(`Form submission error: ${message}`);
      
      // Show error toast
      toast({
        title: 'Submission Failed',
        description: message,
        variant: 'destructive',
      });
      
      // Reset submitting state
      setIsSubmitting(false);
    }
  };
  
  // Handle submission success via WebSocket event
  const handleSubmissionSuccess = (event: FormSubmissionEvent) => {
    logger.info(`Submission success event received: ${JSON.stringify(event)}`);
    
    // Always set the submission result with the latest data from the server
    setSubmissionResult(event);
    
    // Reset submission state
    setIsSubmitting(false);
    
    // Force task status update to ensure read-only view appears
    if (task && task.status !== 'submitted') {
      // Create an updated task with submitted status
      const updatedTask = {
        ...task,
        status: 'submitted',
        progress: 100
      };
      
      // Update the task in state
      logger.info('Updating task status to submitted');
      
      // Instead of using setTask (which doesn't exist), we'll manually trigger a refetch
      if (typeof refreshTask === 'function') {
        refreshTask();
      }
    }
    
    // Always show modal for successful submission
    setShowSuccessModal(true);
    modalShownRef.current = true;
    
    // Show success toast
    toast({
      title: 'Form Submitted Successfully',
      description: 'Your form has been submitted successfully.',
      variant: 'success',
    });
  };
  
  // Handle submission error via WebSocket event
  const handleSubmissionError = (event: FormSubmissionEvent) => {
    logger.error(`Submission error event received: ${JSON.stringify(event)}`);
    
    // Reset submission state
    setIsSubmitting(false);
    
    // Show error toast
    toast({
      title: 'Submission Failed',
      description: (event as any).message || 'An error occurred during form submission.',
      variant: 'destructive',
    });
  };
  
  // Handle submission in progress via WebSocket event
  const handleSubmissionInProgress = (event: FormSubmissionEvent) => {
    logger.info(`Submission in progress event received: ${JSON.stringify(event)}`);
    
    // Show in progress toast
    toast({
      title: 'Submission In Progress',
      description: (event as any).message || 'Your form submission is being processed...',
      variant: 'info',
    });
  };
  
  // Helper function to format form title and description
  const getFormTitle = useCallback(() => {
    const taskTypeMap: Record<string, string> = {
      'kyb': 'Know Your Business (KYB) Assessment',
      'ky3p': 'Know Your Third Party (KY3P) Assessment',
      'open_banking': 'Open Banking Assessment',
      'card': 'Card Assessment',
      'company_kyb': 'Know Your Business (KYB) Assessment',
      'security': 'Security Assessment',
    };
    
    return taskTypeMap[taskType] || taskType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [taskType]);
  
  const getFormDescription = useCallback(() => {
    const descriptionMap: Record<string, string> = {
      'kyb': 'Complete this form to provide essential information about your business.',
      'ky3p': 'Provide details about your organization to evaluate third-party risks.',
      'open_banking': 'Answer questions about your open banking implementation and security practices.',
      'card': 'Complete this assessment for card payment processing compliance.',
      'company_kyb': 'Complete this form to provide essential information about your business.',
      'security': 'Evaluate your security posture by completing this assessment.'
    };
    
    return descriptionMap[taskType] || `Complete the ${taskType.replace(/_/g, ' ')} form below.`;
  }, [taskType]);

  // Form title and description
  const formTitle = getFormTitle();
  const formDescription = getFormDescription();

  // Determine read-only mode first, before any other rendering logic
  // This is critical to prevent the editable form from flashing before the read-only view
  const isFormReadOnly = useMemo(() => {
    return (
      isReadOnly || 
      task?.status === 'submitted' || 
      task?.status === 'completed'
    );
  }, [isReadOnly, task?.status]);
  
  // Early loading state - show skeleton loaders while determining form state
  const formStateLoading = useMemo(() => {
    // Show skeleton if we're loading task data or waiting for field/section data
    return !task || loading || fields.length === 0;
  }, [task, loading, fields.length]);
  
  // CRITICAL: If the form is determined to be read-only and data is loaded,
  // render the read-only view immediately without any other checks
  if (isFormReadOnly && hasLoaded && !formStateLoading) {
    return (
      <div className="w-full mx-auto">
        {/* WebSocket listeners are still needed for potential updates */}
        {taskId && (
          <>
            <FormSubmissionListener
              taskId={taskId}
              formType={taskType}
              onSuccess={handleSubmissionSuccess}
              onError={handleSubmissionError}
              onInProgress={handleSubmissionInProgress}
              showToasts={true}
            />
            <FormFieldsListener
              taskId={taskId}
              formType={taskType}
              onFieldsCleared={handleFieldsCleared}
              showToasts={false}
            />
          </>
        )}
        
        <ReadOnlyFormView
          taskId={taskId}
          taskType={taskType}
          task={task}
          formData={formData}
          fields={fields}
          sections={sections}
          company={company}
        />
      </div>
    );
  }
  
  // Render main form (for loading state or editable form)
  return (
    <div className="w-full mx-auto">
      {/* WebSocket-based Form Submission Listener */}
      {taskId && (
        <>
          <FormSubmissionListener
            taskId={taskId}
            formType={taskType}
            onSuccess={handleSubmissionSuccess}
            onError={handleSubmissionError}
            onInProgress={handleSubmissionInProgress}
            showToasts={true} // Enable toasts to fix form submission notification
          />
          <FormFieldsListener
            taskId={taskId}
            formType={taskType}
            onFieldsCleared={handleFieldsCleared}
            showToasts={false} // We'll handle toasts in the callback
          />
        </>
      )}
      
      {/* Submission Success Modal - shown via WebSocket events */}
      {submissionResult && (
        <SubmissionSuccessModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            modalShownRef.current = false; // Reset the modal shown ref
          }}
          title="Form Submitted Successfully"
          message={`Your ${taskType} form has been successfully submitted.`}
          actions={submissionResult.completedActions || []}
          fileName={submissionResult.fileName}
          fileId={submissionResult.fileId}
          returnPath="/task-center"
          returnLabel="Return to Task Center"
          taskType={taskType}
          onDownload={() => {
            // Handle download functionality if needed
            if (submissionResult.fileId) {
              window.open(`/api/files/${submissionResult.fileId}/download`, '_blank');
            }
          }}
        />
      )}
      
      {/* Show skeleton loader while determining form state */}
      {formStateLoading ? (
        <FormSkeletonWithMode readOnly={isFormReadOnly} />
      ) : isReadOnlyMode ? (
        // In read-only mode, either show the read-only view or skeleton until it's fully loaded
        hasLoaded ? (
          <ReadOnlyFormView
            taskId={taskId}
            taskType={taskType}
            task={task}
            formData={formData}
            fields={fields}
            sections={sections}
            company={company}
          />
        ) : (
          // Show read-only skeleton while read-only data loads
          <FormSkeletonWithMode readOnly={true} />
        )
      ) : (
        <>
          {/* Form title and subtitle */}
          <div className="bg-gray-50 p-6 rounded-t-md mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{formTitle}</h1>
            <p className="text-gray-600 mt-1">{formDescription}</p>
            
            {/* Demo buttons - Only show for demo companies */}
            {company?.isDemo && (
              <div className="flex gap-3 mt-4">
                {/* Use unified demo auto-fill component for all form types */}
                <UnifiedDemoAutoFill
                  taskId={taskId}
                  taskType={taskType}
                  form={form}
                  resetForm={resetForm}
                  updateField={updateField}
                  refreshStatus={refreshStatus}
                  saveProgress={saveProgress}
                  onProgress={onProgress}
                  formService={formService}
                  setForceRerender={setForceRerender}
                />
                
                {/* Clear Fields button completely removed since functionality is broken */}
              </div>
            )}
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
              {/* Progress bar showing overall completion */}
              <div className="mb-4">
                <FormProgressBar progress={overallProgress} />
              </div>
              
              {/* Section navigation tabs - flush with form content */}
              <ResponsiveSectionNavigation
                sections={allSections}
                sectionStatuses={sectionStatuses}
                activeSection={activeSection}
                onSectionChange={(index) => {
                  // Only allow access to the review section if the form is complete
                  if (index === allSections.length - 1 && overallProgress < 100) {
                    toast({
                      title: "Form incomplete",
                      description: "Please complete all required fields before proceeding to review.",
                      variant: "warning",
                    });
                    return;
                  }
                  setActiveSection(index);
                }}
              />
              
              {/* Form content - with continuous white box, rounded only at bottom */}
              <div className="bg-white rounded-b-md p-3 sm:p-6 border-t-0">
                {/* Data loading indicator */}
                {isDataLoading && (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading saved data...</span>
                  </div>
                )}
                
                {/* Data error display */}
                {dataError && (
                  <div className="p-3 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                    {dataError}
                  </div>
                )}
                
                {/* Error message display - for component level errors */}
                {error && (
                  <div className="p-3 mb-4 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner />
                    <span className="ml-2 text-sm text-muted-foreground">Loading form...</span>
                  </div>
                )}
                
                {/* Section content */}
                {!loading && (
                  <div className="pt-2">
                    {/* Current section content */}
                    {allSections.map((section, index) => {
                      // Handle the special review section
                      if (section.id === 'review-section') {
                        
                        return (
                          <div
                            key={section.id}
                            className={index === activeSection ? 'block' : 'hidden'}
                          >
                            <div className="space-y-6">
                              <div className="mb-2">
                                <h3 className="text-2xl font-semibold text-gray-900">Review & Submit</h3>
                                <p className="text-gray-600 mt-1">
                                  Please review your responses before submitting the form.
                                </p>
                              </div>
                              
                              {/* Review all sections and their answers */}
                              <div className="space-y-6 mt-6">
                                {/* Using shadcn Accordion for collapsible sections, collapsed by default */}
                                <Accordion type="multiple" className="w-full">
                                  {sections.map((reviewSection, sectionIndex) => {
                                    const sectionFields = fields.filter(field => field.section === reviewSection.id);
                                    const filledFieldCount = sectionFields.filter(field => {
                                      const value = form.getValues(field.key);
                                      return value !== undefined && value !== null && value !== '';
                                    }).length;
                                    
                                    // Determine completion status for styling
                                    const isComplete = filledFieldCount === sectionFields.length;
                                    
                                    return (
                                      <AccordionItem 
                                        key={`review-${sectionIndex}`} 
                                        value={`section-${sectionIndex}`}
                                        className="border border-gray-200 rounded-md mb-4 bg-gray-50 overflow-hidden"
                                      >
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-100/70">
                                          <div className="flex justify-between w-full items-center">
                                            <div className="flex items-center">
                                              {isComplete && (
                                                <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                                              )}
                                              <h4 className="font-medium text-lg text-left">
                                                Section {sectionIndex + 1}: {reviewSection.title}
                                              </h4>
                                            </div>
                                            <span className={cn(
                                              "text-sm mr-2",
                                              isComplete ? "text-emerald-600" : "text-gray-500"
                                            )}>
                                              {filledFieldCount}/{sectionFields.length} questions answered
                                            </span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="bg-white px-4 pt-2 pb-4">
                                          <div className="space-y-4">
                                            {sectionFields.map((field, fieldIndex) => {
                                              const value = form.getValues(field.key);
                                              const displayValue = value === '' || value === null || value === undefined 
                                                ? 'Not provided' 
                                                : (typeof value === 'boolean' 
                                                  ? (value ? 'Yes' : 'No') 
                                                  : (Array.isArray(value) 
                                                    ? value.join(', ') 
                                                    : value));
                                              
                                              return (
                                                <div key={`review-field-${fieldIndex}`} className="border-b border-gray-100 pb-3 last:border-b-0">
                                                  <p className="text-sm font-medium text-gray-700">
                                                    {field.question || field.label}
                                                  </p>
                                                  <p className="text-sm mt-1 text-gray-500">
                                                    {displayValue}
                                                  </p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              </div>
                              
                              {/* Consent section - ultra simple implementation */}
                              <div 
                                className="p-4 rounded-lg border cursor-pointer"
                                style={{
                                  backgroundColor: agreementChecked ? "#EFF6FF" : "white",
                                  borderColor: agreementChecked ? "#93C5FD" : "#E5E7EB"
                                }}
                                onClick={() => {
                                  // Toggle the agreement checked state
                                  const newValue = !agreementChecked;
                                  
                                  // Log the action with task context for debugging and tracking
                                  logger.info(`Toggling agreement confirmation to ${newValue} for task type: ${taskType}, task ID: ${taskId || 'unknown'}`);
                                  
                                  // Update React state - this will automatically update the UI
                                  setAgreementChecked(newValue);
                                  
                                  // Also update the form value for consistency and submission handling
                                  form.setValue("agreement_confirmation", newValue);
                                  
                                  // Set explicit submission flag for tracking when enabled
                                  if (newValue) {
                                    form.setValue("explicitSubmission", true);
                                  }
                                }}
                                id="consent-box"
                              >
                                <div className="flex items-center mb-2">
                                  <div className="flex flex-row items-start space-x-3 space-y-0 m-0">
                                    <input 
                                      type="checkbox" 
                                      id="consent-checkbox"
                                      checked={agreementChecked}
                                      className="mt-0.5 h-4 w-4" 
                                      onChange={(e) => {
                                        const newChecked = e.target.checked;
                                        
                                        // Update React state
                                        setAgreementChecked(newChecked);
                                        
                                        // Also update form value for consistency
                                        form.setValue("agreement_confirmation", newChecked);
                                        
                                        // Set explicit submission flag for tracking
                                        if (newChecked) {
                                          form.setValue("explicitSubmission", true);
                                        }
                                      }}
                                    />
                                    <label htmlFor="consent-checkbox" className="font-medium block cursor-pointer">
                                      I confirm that the information provided is accurate and complete.
                                    </label>
                                  </div>
                                </div>
                                <div className="ml-7 text-sm text-gray-600 space-y-2 mt-1">
                                  <p>By submitting this form, I:</p>
                                  <ul className="list-disc list-outside ml-4 space-y-1">
                                    <li>Certify that I am authorized to submit this information on behalf of my organization;</li>
                                    <li>Understand that providing false information may result in the rejection of our application;</li>
                                    <li>Consent to the processing of this data in accordance with Invela's accreditation and verification procedures;</li>
                                    <li>Acknowledge that I may be contacted for additional information if needed.</li>
                                  </ul>
                                </div>
                              </div>
                              
                              {/* Submit button */}
                              <div className="mt-8 flex justify-end mb-4">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="submit"
                                        size="lg"
                                        disabled={!agreementChecked || overallProgress < 100 || isSubmitting}
                                        className={cn(
                                          "w-full sm:w-auto min-w-[180px]",
                                          !agreementChecked && "pointer-events-auto" // Allow showing tooltip even when disabled
                                        )}
                                      >
                                        {isSubmitting ? (
                                          <>
                                            <LoadingSpinner 
                                              className="mr-2 h-4 w-4" 
                                              variant="inverted"
                                            />
                                            Submitting...
                                          </>
                                        ) : (
                                          <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Submit Form
                                          </>
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    {!agreementChecked && (
                                      <TooltipContent className="max-w-[280px]">
                                        <p>Please check the confirmation box before submitting.</p>
                                      </TooltipContent>
                                    )}
                                    {overallProgress < 100 && agreementChecked && (
                                      <TooltipContent className="max-w-[280px]">
                                        <p>Please complete all required fields before submitting.</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </div>
                        );
                      } 
                      
                      // For regular sections, render the corresponding SectionContent
                      return (
                        <div
                          key={section.id}
                          className={index === activeSection ? 'block' : 'hidden'}
                        >
                          {/* CRITICAL FIX: Filter fields by section ID and calculate starting question number */}
                          <SectionContent
                            section={section}
                            sectionIndex={index}
                            form={form}
                            // Calculate starting question number based on fields in previous sections
                            startingQuestionNumber={(() => {
                              // Get all previous sections
                              const previousSections = allSections.slice(0, index);
                              
                              // Count fields in previous sections
                              let fieldCount = 1; // Start from 1
                              for (const prevSection of previousSections) {
                                // Count fields that belong to this section using the same enhanced matching logic
                                const sectionFields = fields.filter(field => {
                                  // Direct match to section.id as string (most common)
                                  if (field.section !== undefined) {
                                    return String(field.section) === String(prevSection.id);
                                  }
                                  
                                  // Try alternative property names for section
                                  if (field.sectionId !== undefined) {
                                    return String(field.sectionId) === String(prevSection.id);
                                  }
                                  
                                  if ((field as any).section_id !== undefined) {
                                    return String((field as any).section_id) === String(prevSection.id);
                                  }
                                  
                                  // Try matching by group name (used in some KY3P implementations)
                                  if (field.group !== undefined && prevSection.title !== undefined) {
                                    return String(field.group) === String(prevSection.title);
                                  }
                                  
                                  return false;
                                });
                                
                                fieldCount += sectionFields.length;
                              }
                              
                              return fieldCount;
                            })()}
                            fields={fields.filter(field => {
                              // Use consistent field-to-section matching logic
                              // Direct match to section.id as string (most common)
                              if (field.section !== undefined) {
                                return String(field.section) === String(section.id);
                              }
                              
                              // Try alternative property names for section
                              if (field.sectionId !== undefined) {
                                return String(field.sectionId) === String(section.id);
                              }
                              
                              if ((field as any).section_id !== undefined) {
                                return String((field as any).section_id) === String(section.id);
                              }
                              
                              // Try matching by group name (used in some KY3P implementations)
                              if (field.group !== undefined && section.title !== undefined) {
                                return String(field.group) === String(section.title);
                              }
                              
                              // If no section info in field, assign to first section as fallback
                              return index === 0;
                            })}
                            onFieldUpdate={(fieldId, value) => {
                              updateField(fieldId, value);
                            }}
                            refreshStatus={refreshStatus}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* Navigation buttons - only show for non-review sections */}
                {!loading && activeSection !== allSections.length - 1 && (
                  <div className="flex justify-between pt-6 mt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeSection > 0) {
                          setActiveSection(activeSection - 1);
                        }
                      }}
                      disabled={activeSection === 0}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={() => {
                        if (activeSection < allSections.length - 1) {
                          // If navigating to review section, only allow if form is complete
                          if (activeSection === allSections.length - 2 && overallProgress < 100) {
                            toast({
                              title: "Form incomplete",
                              description: "Please complete all required fields before proceeding to review.",
                              variant: "warning",
                            });
                            return;
                          }
                          
                          setActiveSection(activeSection + 1);
                        }
                      }}
                      disabled={activeSection === allSections.length - 1}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Cancel button for regular section views */}
                {!loading && activeSection !== allSections.length - 1 && onCancel && (
                  <div className="flex justify-center pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      className="text-gray-500"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                {/* For Review section, add back button in addition to submit */}
                {!loading && activeSection === allSections.length - 1 && (
                  <div className="flex justify-start pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveSection(allSections.length - 2);
                      }}
                      className="text-gray-500"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Form
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
};