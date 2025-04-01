import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [currentSection, setCurrentSection] = useState<string>('');
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [sections, setSections] = useState<string[]>([]);
  
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

  // Extract unique sections
  useEffect(() => {
    if (fields) {
      const uniqueSections = [...new Set(fields.map(field => field.section))];
      setSections(uniqueSections);
      
      if (!currentSection && uniqueSections.length > 0) {
        setCurrentSection(uniqueSections[0]);
      }
    }
  }, [fields, currentSection]);

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

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Security Assessment</h2>
        <p className="text-muted-foreground mb-4">
          Please complete this security assessment for {companyData.name}. 
          This is a required step before proceeding to the CARD assessment.
        </p>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Completion: {completionPercentage}%</span>
            <Badge variant={completionPercentage === 100 ? "default" : "outline"} className={completionPercentage === 100 ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
              {completionPercentage === 100 ? "Ready to submit" : "In progress"}
            </Badge>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
        
        {completionPercentage === 100 && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-600">Security Assessment Complete</AlertTitle>
            <AlertDescription className="text-green-700">
              All required security information has been provided. You can now submit the assessment.
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <Tabs defaultValue={sections[0]} value={currentSection} onValueChange={setCurrentSection}>
          <TabsList className="mb-4 flex flex-wrap gap-2">
            {sections.map((section) => (
              <TabsTrigger key={section} value={section} className="text-sm">
                {section}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {sections.map((section) => (
            <TabsContent key={section} value={section} className="space-y-6">
              <h3 className="text-lg font-medium flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                {section}
              </h3>
              <Separator className="my-4" />
              
              {fields?.filter(field => field.section === section).map((field) => (
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
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="flex justify-end mt-8">
          <Button 
            type="submit" 
            disabled={completionPercentage < 100}
            className="min-w-[150px]"
          >
            {completionPercentage < 100 ? 'Complete all fields to submit' : 'Submit Security Assessment'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SecurityFormPlayground;