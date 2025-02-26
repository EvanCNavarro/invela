import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CardFormPlaygroundProps {
  taskId: number;
  companyName: string;
  companyData?: {
    name: string;
    description?: string;
  };
  savedFormData?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
}

interface CardField {
  id: number;
  field_key: string;
  wizard_section: string;
  question_label: string;
  question: string;
  example_response?: string;
  ai_search_instructions?: string;
}

export function CardFormPlayground({
  taskId,
  companyName,
  companyData,
  savedFormData,
  onSubmit
}: CardFormPlaygroundProps) {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState<string>("");
  const [formResponses, setFormResponses] = useState<Record<string, string>>(savedFormData || {});
  const [progress, setProgress] = useState(0);

  console.log('[CardFormPlayground] Initializing with props:', {
    taskId,
    companyName,
    companyDataPresent: !!companyData,
    hasSavedFormData: !!savedFormData,
    savedFormDataKeys: savedFormData ? Object.keys(savedFormData) : [],
    timestamp: new Date().toISOString()
  });

  // Fetch all CARD fields
  const { data: cardFields = [], isLoading, error } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields'],
    queryFn: async () => {
      console.log('[CardFormPlayground] Fetching CARD fields - Start');

      try {
        const response = await fetch('/api/card/fields');

        console.log('[CardFormPlayground] CARD fields API response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[CardFormPlayground] Error fetching fields:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            timestamp: new Date().toISOString()
          });
          throw new Error('Failed to fetch CARD fields');
        }

        const data = await response.json();
        console.log('[CardFormPlayground] Fields fetched successfully:', {
          count: data.length,
          sections: [...new Set(data.map((f: CardField) => f.wizard_section))],
          fieldsPreview: data.slice(0, 3).map((f: CardField) => ({
            key: f.field_key,
            section: f.wizard_section
          })),
          timestamp: new Date().toISOString()
        });

        return data;
      } catch (error) {
        console.error('[CardFormPlayground] Error in queryFn:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }
  });

  // Log error state changes
  useEffect(() => {
    if (error) {
      console.error('[CardFormPlayground] Query error state:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }, [error]);

  // Group fields by section with logging
  const sections = cardFields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
      console.log('[CardFormPlayground] New section created:', {
        section: field.wizard_section,
        timestamp: new Date().toISOString()
      });
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);

  // Set initial section if not set
  useEffect(() => {
    if (!currentSection && Object.keys(sections).length > 0) {
      const firstSection = Object.keys(sections)[0];
      console.log('[CardFormPlayground] Setting initial section:', firstSection);
      setCurrentSection(firstSection);
    }
  }, [sections]);

  // Calculate and update progress
  useEffect(() => {
    const totalFields = cardFields.length;
    const answeredFields = Object.values(formResponses).filter(Boolean).length;
    const calculatedProgress = Math.floor((answeredFields / totalFields) * 100);

    console.log('[CardFormPlayground] Updating progress:', {
      totalFields,
      answeredFields,
      progress: calculatedProgress
    });

    setProgress(calculatedProgress);
  }, [formResponses, cardFields]);

  const handleResponseChange = (fieldKey: string, value: string) => {
    console.log('[CardFormPlayground] Field updated:', {
      fieldKey,
      hasValue: !!value
    });

    setFormResponses(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSubmit = () => {
    console.log('[CardFormPlayground] Submitting form:', {
      taskId,
      responseCount: Object.keys(formResponses).length,
      progress
    });

    if (progress < 90) {
      toast({
        title: "Cannot Submit Yet",
        description: "Please complete at least 90% of the form before submitting.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formResponses);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          CARD Assessment for {companyData?.name || companyName}
        </h1>
        {companyData?.description && (
          <p className="text-muted-foreground">{companyData.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(sections).map((section) => (
          <Button
            key={section}
            variant={currentSection === section ? "default" : "outline"}
            onClick={() => setCurrentSection(section)}
            className="text-sm"
          >
            {section}
          </Button>
        ))}
      </div>

      {/* Questions */}
      {currentSection && sections[currentSection] && (
        <div className="space-y-6">
          {sections[currentSection].map((field) => (
            <Card key={field.id} className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{field.question_label}</h3>
                <p className="text-muted-foreground">{field.question}</p>
                {field.example_response && (
                  <p className="text-sm text-muted-foreground italic">
                    Example: {field.example_response}
                  </p>
                )}
                {field.ai_search_instructions && (
                  <p className="text-sm text-blue-600">
                    AI Hint: {field.ai_search_instructions}
                  </p>
                )}
              </div>
              <Textarea
                value={formResponses[field.field_key] || ''}
                onChange={(e) => handleResponseChange(field.field_key, e.target.value)}
                placeholder="Enter your response..."
                className="min-h-[100px]"
              />
            </Card>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSubmit}
          disabled={progress < 90}
          className="px-8"
        >
          Submit CARD Assessment
        </Button>
      </div>
    </div>
  );
}