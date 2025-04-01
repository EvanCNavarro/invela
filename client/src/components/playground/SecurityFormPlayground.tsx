import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Check, HelpCircle } from 'lucide-react';
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
}

export function SecurityFormPlayground({
  taskId,
  companyName,
  companyData,
  savedFormData = {},
  onSubmit,
}: SecurityFormPlaygroundProps) {
  const [formData, setFormData] = useState<Record<string, any>>(savedFormData || {});
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [sections, setSections] = useState<string[]>([]);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<string>('');
  
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
      const response = await fetch(`/api/security/response/${companyData.name}/${fieldId}`, {
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
    
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            id={`field_${field.id}`}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Type your answer here"
            className="w-full"
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            id={`field_${field.id}`}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Type your answer here"
            className="w-full min-h-[100px]"
          />
        );
        
      case 'select':
        return (
          <Select 
            value={fieldValue} 
            onValueChange={(value) => handleFieldChange(field.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={`field_${field.id}`}
              checked={fieldValue === true || fieldValue === 'true'}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={`field_${field.id}`}>
              {fieldValue === true || fieldValue === 'true' ? 'Yes' : 'No'}
            </Label>
          </div>
        );
        
      default:
        return (
          <Input
            id={`field_${field.id}`}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder="Type your answer here"
            className="w-full"
          />
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
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Security Assessment Review</h2>
          <p className="text-muted-foreground mb-4">
            Please review your security assessment for {companyData.name} before submitting.
          </p>
          
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-600">Security Assessment Complete</AlertTitle>
            <AlertDescription className="text-green-700">
              All required security information has been provided. Please review and submit.
            </AlertDescription>
          </Alert>
          
          <div className="mb-6">
            <div className="h-[10px] bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4965EC] transition-all duration-300 ease-in-out"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
        
        <Card className="border border-gray-200 rounded-md p-6 mb-6">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={section} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white">
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-medium">{section}</h3>
                </div>
                <Separator />
                
                {fields?.filter(field => field.section === section).map((field) => (
                  <div key={field.id} className="pl-10 border-l-2 border-gray-100 py-2">
                    <div className="flex justify-between mb-1">
                      <label className="font-medium text-sm">
                        {field.label}
                      </label>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                      </Badge>
                    </div>
                    <div className="bg-gray-50 p-3 rounded mb-2 text-gray-700 text-sm">
                      {formData[`field_${field.id}`]?.toString() || ''}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-8">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setIsReviewMode(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Edit
            </Button>
            
            <Button 
              type="button" 
              onClick={handleSubmitForm}
              className="min-w-[150px]"
            >
              Submit Security Assessment
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Normal edit mode with step navigation
  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold">Security Assessment: {companyData.name}</h2>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-medium text-xs">
            In Progress
          </Badge>
        </div>
        <p className="text-gray-500 mb-5 text-base">
          Complete the security assessment for {companyData.name}. This assessment evaluates security protocols, 
          data handling practices, and compliance measures. This is a required step before proceeding to the 
          CARD assessment.
        </p>
        
        <div className="flex justify-end mb-2">
          <span className="text-lg font-medium">{completionPercentage}% Complete</span>
        </div>
        <div className="h-[10px] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#4965EC] transition-all duration-300 ease-in-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-center mb-8 overflow-x-auto pb-4">
        <div className="flex space-x-3 md:space-x-6">
          {sections.map((section, index) => {
            const isCurrent = index === currentStep;
            const isCompleted = isStepCompleted(index);
            const isClickable = isCompleted || index <= currentStep;
            
            // Colors
            const squircleColor = isCurrent ? '#4965EC' : 
                              isCompleted ? '#4965EC' : '#9CA3AF';
            const textColor = isCurrent ? '#4965EC' : 
                           isCompleted ? '#4965EC' : '#6B7280';
            
            return (
              <div 
                key={index} 
                className={`flex flex-col items-center relative group ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
      <Card className="border border-gray-200 rounded-md p-6 mb-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
              {sections[currentStep] || 'Security Assessment'}
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-5 w-5 text-gray-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="max-w-xs">
                    Complete all fields in this section before moving to the next.
                    All fields with a red asterisk (*) are required.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Separator />
          
          {sections[currentStep] && fields?.filter(field => field.section === sections[currentStep]).map((field) => (
            <div key={field.id} className="space-y-3 py-4 border-b border-gray-100 last:border-0">
              <div className="flex justify-between">
                <label htmlFor={`field_${field.id}`} className="font-medium block mb-2">
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {formData[`field_${field.id}`] ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mb-3">
                <p className="text-slate-700">{field.description}</p>
              </div>
              
              {renderField(field)}
            </div>
          ))}
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
          Previous Section
        </Button>
        
        {currentStep < sections.length - 1 ? (
          <Button 
            type="button"
            onClick={handleNext}
            disabled={!isStepCompleted(currentStep)}
            className="flex items-center gap-2"
          >
            Next Section
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleNext}
            disabled={!isStepCompleted(currentStep)}
            className="flex items-center gap-2"
          >
            Review & Submit
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default SecurityFormPlayground;