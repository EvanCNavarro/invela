import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, ArrowUp, Check, HelpCircle, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SecurityFormField {
  id: number;
  section: string;
  field_key: string;
  label: string;
  description: string;
  field_type: string;
  options?: string[];
  is_required: boolean;
}

interface SecurityFormResponse {
  company_id: number;
  field_id: number;
  response: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SecurityFormPlaygroundProps {
  taskId: number;
  companyName: string;
  companyData: {
    name: string;
    description?: string;
  };
  savedFormData?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  taskStatus?: string;
  isSubmitted?: boolean;
}

export function SecurityFormPlayground({
  taskId,
  companyName,
  companyData,
  savedFormData = {},
  onSubmit,
  taskStatus,
  isSubmitted,
}: SecurityFormPlaygroundProps) {
  const [formData, setFormData] = useState<Record<string, any>>(savedFormData || {});
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [sections, setSections] = useState<string[]>([]);
  // Set review mode to true by default if task is submitted or ready for submission
  const [isReviewMode, setIsReviewMode] = useState<boolean>(
    taskStatus === 'ready_for_submission' || 
    taskStatus === 'completed' || 
    isSubmitted === true
  );
  const [currentSection, setCurrentSection] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  // User name for the terms - in a real implementation this would come from user profile
  const userName = "John Doe"; // Replace with actual user name when available
  
  // Fetch security fields
  const { data: fields, isLoading: isFieldsLoading } = useQuery<SecurityFormField[]>({
    queryKey: ['/api/security/fields'],
    enabled: true,
  });

  // Calculate form completion percentage
  useEffect(() => {
    if (fields && fields.length > 0) {
      const totalFields = fields.length;
      const completedFields = Object.keys(formData).filter(key => 
        formData[key] !== undefined && formData[key] !== null && formData[key] !== ''
      ).length;
      const percentage = Math.round((completedFields / totalFields) * 100);
      setCompletionPercentage(percentage);
    }
  }, [fields, formData]);

  // Extract unique sections and group fields by section
  useEffect(() => {
    if (fields) {
      const uniqueSections = [...new Set(fields.map(field => field.section))];
      setSections(uniqueSections);
      
      if (uniqueSections.length > 0 && !currentSection) {
        setCurrentSection(uniqueSections[0]);
      }
    }
  }, [fields, currentSection]);
  
  // Load saved responses when the form is first opened
  useEffect(() => {
    const loadSavedResponses = async () => {
      if (!taskId) return;
      
      try {
        // First, fetch the task data to get the company_id
        const taskResponse = await fetch(`/api/tasks.json/${taskId}`);
        if (!taskResponse.ok) {
          throw new Error(`Failed to fetch task data: ${taskResponse.statusText}`);
        }
        
        const taskData = await taskResponse.json();
        const companyId = taskData.company_id;
        
        if (!companyId) {
          throw new Error('Task does not have a company ID associated with it');
        }
        
        // Now fetch all responses for this company
        const responsesResponse = await fetch(`/api/security/responses/${companyId}`);
        if (!responsesResponse.ok) {
          throw new Error(`Failed to fetch responses: ${responsesResponse.statusText}`);
        }
        
        const responses = await responsesResponse.json() as SecurityFormResponse[];
        
        // Process responses and update form data
        if (responses && responses.length > 0) {
          const newFormData = { ...formData };
          
          responses.forEach((response: SecurityFormResponse) => {
            newFormData[`field_${response.field_id}`] = response.response;
          });
          
          setFormData(newFormData);
        }
      } catch (error) {
        console.error('Error loading saved responses:', error);
      }
    };
    
    // Only run if we have a task ID and savedFormData is empty
    if (Object.keys(formData).length === 0) {
      loadSavedResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]); // Removed formData dependency to avoid infinite loop
  
  // Find the first incomplete field and navigate to its section
  useEffect(() => {
    if (fields && fields.length > 0 && sections.length > 0 && taskStatus !== 'ready_for_submission' && taskStatus !== 'submitted') {
      // Don't run this logic if we're in review mode
      if (isReviewMode) return;
      
      // Calculate total completion
      const totalFields = fields.length;
      const completedFields = Object.keys(formData).filter(key => 
        formData[key] !== undefined && formData[key] !== null && formData[key] !== ''
      ).length;
      
      // If all fields are completed but not submitted, go to review mode
      if (completedFields === totalFields) {
        setIsReviewMode(true);
        return;
      }
      
      // Find the first incomplete field
      for (let i = 0; i < sections.length; i++) {
        const sectionName = sections[i];
        const sectionFields = fields.filter(field => field.section === sectionName);
        
        let allFieldsCompleted = true;
        for (const field of sectionFields) {
          const fieldValue = formData[`field_${field.id}`];
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            allFieldsCompleted = false;
            // Navigate to this section if we're not already there
            if (currentStep !== i) {
              setCurrentStep(i);
            }
            break;
          }
        }
        
        if (!allFieldsCompleted) {
          break;
        }
      }
    }
  }, [fields, sections, formData, currentStep, taskStatus, isReviewMode]);
  
  // Update current section when step changes
  useEffect(() => {
    if (sections.length > 0 && currentStep >= 0 && currentStep < sections.length) {
      setCurrentSection(sections[currentStep]);
    }
  }, [currentStep, sections]);
  
  // Define step navigation functions
  const handleNext = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // If on last step, go to review mode
      setIsReviewMode(true);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleSubmitForm = () => {
    onSubmit(formData);
  };
  
  // Check if step is completed
  const isStepCompleted = (stepIndex: number) => {
    if (!fields) return false;
    
    const sectionName = sections[stepIndex];
    const sectionFields = fields.filter(field => field.section === sectionName);
    
    return sectionFields.every(field => {
      const fieldValue = formData[`field_${field.id}`];
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    });
  };

  // Handle field change
  const handleFieldChange = async (fieldId: number, value: string | boolean) => {
    const newFormData = { ...formData, [`field_${fieldId}`]: value };
    setFormData(newFormData);
    
    // Save response to the server
    try {
      // Check for "Security Assessment:" prefix in companyName and extract the company ID from the task
      // First, fetch the task data to get the company_id
      const taskResponse = await fetch(`/api/tasks.json/${taskId}`);
      if (!taskResponse.ok) {
        throw new Error(`Failed to fetch task data: ${taskResponse.statusText}`);
      }
      
      const taskData = await taskResponse.json();
      const companyId = taskData.company_id;
      
      if (!companyId) {
        throw new Error('Task does not have a company ID associated with it');
      }
      
      // Now save the response using the company ID
      const response = await fetch(`/api/security/response/${companyId}/${fieldId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response: value.toString() }),
      });
      
      if (!response.ok) {
        console.error(`Failed to save response for field ${fieldId}:`, await response.text());
      }
    } catch (error) {
      console.error('Error saving security response:', error);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Render a form field based on its type
  const renderField = (field: SecurityFormField) => {
    const fieldValue = formData[`field_${field.id}`] || '';
    const isValid = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    
    // Common validation UI elements
    const ValidationIcon = () => (
      isValid ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      ) : null
    );
    
    switch (field.field_type) {
      case 'text':
        return (
          <div className="relative w-full">
            <Input
              id={`field_${field.id}`}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder=""
              className={`w-full pr-10 ${isValid ? 'border-green-500 focus-visible:ring-green-300' : ''}`}
            />
            <ValidationIcon />
          </div>
        );
        
      case 'textarea':
        return (
          <div className="relative w-full">
            <Textarea
              id={`field_${field.id}`}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder=""
              className={`w-full min-h-[100px] pr-10 ${isValid ? 'border-green-500 focus-visible:ring-green-300' : ''}`}
            />
            {isValid && (
              <div className="absolute right-3 top-3 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>
        );
        
      case 'select':
        return (
          <div className="relative w-full">
            <Select 
              value={fieldValue} 
              onValueChange={(value) => handleFieldChange(field.id, value)}
            >
              <SelectTrigger className={`w-full ${isValid ? 'border-green-500 focus-visible:ring-green-300' : ''}`}>
                <SelectValue placeholder="Select an option" />
                {isValid && <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />}
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      case 'boolean':
        return (
          <div className={`flex items-center space-x-2 p-2 rounded ${isValid ? 'bg-green-50 border border-green-100' : ''}`}>
            <Switch
              id={`field_${field.id}`}
              checked={fieldValue === true || fieldValue === 'true'}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              className={isValid ? 'data-[state=checked]:bg-green-500' : ''}
            />
            <Label htmlFor={`field_${field.id}`} className="flex items-center">
              {fieldValue === true || fieldValue === 'true' ? 'Yes' : 'No'}
              {isValid && <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />}
            </Label>
          </div>
        );
        
      default:
        return (
          <div className="relative w-full">
            <Input
              id={`field_${field.id}`}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder=""
              className={`w-full pr-10 ${isValid ? 'border-green-500 focus-visible:ring-green-300' : ''}`}
            />
            <ValidationIcon />
          </div>
        );
    }
  };

  if (isFieldsLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <LoadingSpinner size="lg" />
        <p className="text-center text-muted-foreground">Loading security assessment form...</p>
      </div>
    );
  }

  // Review mode shows all sections in a summary view
  if (isReviewMode) {
    // Build a list of all fields with responses
    interface FormEntry {
      fieldName: string;
      question: string;
      section: string;
      value: string;
    }
    
    const formEntries: FormEntry[] = [];
    
    fields?.forEach(field => {
      const fieldValue = formData[`field_${field.id}`];
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        formEntries.push({
          fieldName: `field_${field.id}`,
          question: field.description,
          section: field.section,
          value: String(fieldValue)
        });
      }
    });
    
    return (
      <Card className="p-6">
        {/* Header Section - Match the main form header */}
        <div className="mb-4">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">2. Security Assessment: {companyData.name}</h2>
                <div className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-600">
                  IN REVIEW
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-base">
              <span className="text-[#6B7280] font-medium">Ready for Submission</span>
            </div>
          </div>
        </div>
        
        {/* Custom dashed separator line with even spacing */}
        <div className="flex items-center justify-center my-4">
          <div className="w-full h-[2px] border-0 relative">
            <div className="absolute inset-0 flex items-center justify-evenly">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="w-8 h-[2px]" style={{ backgroundColor: "#E5E7EB" }}></div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="mb-2 flex items-center">
            <div className="bg-blue-600 h-4 w-1 mr-2 rounded"></div>
            <h3 className="text-sm font-semibold text-gray-800">SURVEY ANSWERS FOR REVIEW</h3>
          </div>
          
          {fields?.map((field, globalIndex) => {
            const entry = formEntries.find(e => e.fieldName === `field_${field.id}`);
            if (!entry) return null;
            
            return (
              <div key={field.id} className="bg-white rounded-lg p-4 shadow-sm mb-3 last:mb-0">
                <p className="text-gray-700">
                  <span className="font-bold text-gray-800">{globalIndex + 1}. </span>
                  <span className="font-medium">Q: </span>
                  {field.description}
                </p>
                <div className="flex items-start mt-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="font-medium">
                    <span className="font-bold">Answer: </span>
                    {entry.value}
                  </p>
                </div>
              </div>
            );
          })}
      
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Submission Terms</h3>
            <div 
              className={`p-4 rounded-lg border ${termsAccepted ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'} cursor-pointer transition-all duration-200`}
              onClick={() => setTermsAccepted(!termsAccepted)}
            >
              <div className="flex gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`h-5 w-5 rounded border flex items-center justify-center ${termsAccepted ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {termsAccepted && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  I, <span className="font-bold text-black">{userName}</span>, acknowledge that I am an authorized representative of <span className="font-bold text-black">{companyData.name}</span> and certify 
                  that all information provided is accurate and complete to the best of my knowledge. I understand that Invela 
                  will use this information to assess security posture and calculate risk scores. I grant Invela permission 
                  to securely store, process, and verify this data in accordance with industry regulations. I accept full 
                  responsibility for any inaccuracies or omissions in the submitted data.
                </p>
              </div>
            </div>
          </div>
        </div>
      
        <div className="flex justify-between pt-4 mt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsReviewMode(false)}
            className="rounded-lg px-4 transition-all hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <Button
            onClick={handleSubmitForm}
            disabled={!termsAccepted}
            className={`rounded-lg px-4 transition-all hover:bg-blue-700 ${termsAccepted ? 'animate-pulse-ring' : 'opacity-50'}`}
          >
            Submit
            <Check className="h-4 w-4 ml-1 text-white" />
          </Button>
        </div>
      </Card>
    );
  }

  // Normal edit mode with step navigation
  return (
    <div className="w-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 pr-10">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">2. Security Assessment: {companyData.name}</h2>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-medium text-xs">
              In Progress
            </Badge>
          </div>
          <p className="text-gray-500 text-base">
            Complete this assessment to evaluate your organization's security protocols and data handling practices.
          </p>
        </div>
        <div className="min-w-[150px] text-right">
          <span className="text-lg font-medium whitespace-nowrap">{completionPercentage}% Complete</span>
        </div>
      </div>
      
      <div className="h-[10px] bg-[#E5E7EB] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#4965EC] transition-all duration-300 ease-in-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-center mb-8 overflow-x-auto pb-4 pt-2">
        <div className="flex space-x-3 md:space-x-6">
          {sections.map((section, index) => {
            const isCurrent = index === currentStep;
            const isCompleted = isStepCompleted(index);
            const isNextStep = index === currentStep + 1;
            const isPriorStepCompleted = index > 0 && isStepCompleted(index - 1);
            const isCurrentStepValid = isStepCompleted(currentStep);
            
            // Step should be clickable if:
            // 1. It is completed
            // 2. It's the current step or any previous step
            // 3. It's the next available step AND the current step is valid
            // 4. The prior step is completed (for skipping to future steps)
            // 5. Based on completion percentage
            const isClickable = isCompleted || 
                               index <= currentStep || 
                               (isNextStep && isCurrentStepValid) || 
                               isPriorStepCompleted || 
                               completionPercentage === 100;
            
            // Colors
            const squircleColor = isCompleted 
                ? '#209C5A' // Green for completed
                : isCurrent 
                  ? '#4965EC' // Blue for current step
                  : '#9CA3AF'; // Gray for incomplete
            const textColor = isCompleted 
                ? '#209C5A' // Green for completed
                : isCurrent 
                  ? '#4965EC' // Blue for current step
                  : '#6B7280'; // Gray for incomplete
            
            return (
              <div 
                key={index} 
                className={`flex flex-col items-center relative group ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} pt-3`}
                onClick={() => isClickable && setCurrentStep(index)}
              >
                {/* Button-like hover effect */}
                {isClickable && !isCurrent && (
                  <div className="absolute inset-0 rounded-lg bg-gray-100/0 group-hover:bg-gray-100/60 transition-all duration-200" />
                )}
                
                {/* Current step highlight effect */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-lg bg-gray-100 transition-all duration-200" />
                )}
                
                {/* Step indicator squircle */}
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-lg border-2 shadow-sm transition-all duration-200 z-10"
                  style={{
                    borderColor: squircleColor,
                    backgroundColor: isCompleted || isCurrent ? squircleColor : 'white',
                    color: isCompleted || isCurrent ? 'white' : squircleColor
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold leading-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Step label with better wrapping */}
                <div 
                  className="text-sm mt-3 text-center w-full mx-auto min-h-[40px] whitespace-pre-line font-bold transition-colors duration-200 z-10 px-4"
                  style={{ color: textColor }}
                >
                  {section}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current step content */}
      <Card className="border border-gray-200 rounded-md p-6 mb-6 bg-white">
        <div className="space-y-3">
          {sections[currentStep] && fields?.filter(field => field.section === sections[currentStep]).map((field) => {
            // Calculate global question number across all sections
            const allFieldsBeforeCurrentSection = sections
              .slice(0, currentStep)
              .flatMap(section => fields.filter(f => f.section === section));
              
            const globalQuestionNumber = allFieldsBeforeCurrentSection.length + 
              fields.filter(f => f.section === sections[currentStep]).findIndex(f => f.id === field.id) + 1;
              
            return (
              <div key={field.id} className="space-y-1 py-2 border-b border-gray-100 last:border-0">
                <label htmlFor={`field_${field.id}`} className="text-gray-500 block text-sm">
                  {field.label}
                </label>
                
                <p className="text-black text-sm mb-2 font-bold">{globalQuestionNumber}. {field.description}</p>
                
                {renderField(field)}
              </div>
            );
          })}
        </div>
      </Card>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8 gap-4">
        <Button 
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        
        {currentStep < sections.length - 1 ? (
          <Button 
            type="button"
            onClick={handleNext}
            disabled={!isStepCompleted(currentStep)}
            className="flex items-center gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleNext}
            disabled={!isStepCompleted(currentStep)}
            className="flex items-center gap-2 animate-pulse-ring"
          >
            Final Review
            <Eye className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default SecurityFormPlayground;