import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from "lucide-react";

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

interface CardResponse {
  id: number;
  task_id: number;
  field_id: number;
  response_value: string | null;
  status: 'EMPTY' | 'COMPLETE';
  version: number;
  progress?: number;
}

export function CardFormPlayground({
  taskId,
  companyName,
  companyData,
  savedFormData,
  onSubmit
}: CardFormPlaygroundProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState<string>("");
  const [formResponses, setFormResponses] = useState<Record<string, string>>(savedFormData || {});
  const [progress, setProgress] = useState(0);

  const { data: taskData } = useQuery({
    queryKey: ['/api/tasks/card', companyName],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/card/${companyName}`);
      if (!response.ok) {
        throw new Error('Failed to fetch task data');
      }
      return response.json();
    }
  });

  useEffect(() => {
    if (taskData?.progress !== undefined) {
      setProgress(taskData.progress);
    }
  }, [taskData]);

  const { data: cardFields = [], isLoading: isLoadingFields, error: fieldsError } = useQuery({
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

  const { data: existingResponses = [], isLoading: isLoadingResponses } = useQuery({
    queryKey: ['/api/card/responses', taskId],
    queryFn: async () => {
      console.log('[CardFormPlayground] Fetching existing responses for task:', {
        taskId,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/api/card/responses/${taskId}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CardFormPlayground] Error fetching responses:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          timestamp: new Date().toISOString()
        });
        throw new Error('Failed to fetch responses');
      }

      const data = await response.json();
      console.log('[CardFormPlayground] Responses fetched:', {
        count: data.length,
        hasResponses: data.length > 0,
        timestamp: new Date().toISOString()
      });

      return data;
    },
    enabled: !!taskId
  });

  const saveResponse = useMutation({
    mutationFn: async ({ fieldId, response }: { fieldId: number, response: string }) => {
      console.log('[CardFormPlayground] Saving response:', {
        taskId,
        fieldId,
        hasResponse: !!response,
        timestamp: new Date().toISOString()
      });

      const res = await fetch(`/api/card/response/${taskId}/${fieldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[CardFormPlayground] Error saving response:', {
          status: res.status,
          statusText: res.statusText,
          errorText,
          timestamp: new Date().toISOString()
        });
        throw new Error('Failed to save response');
      }

      const data = await res.json();
      console.log('[CardFormPlayground] Response saved:', {
        responseId: data.id,
        status: data.status,
        progress: data.progress,
        version: data.version,
        timestamp: new Date().toISOString()
      });

      return data;
    },
    onSuccess: (data) => {
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/card/responses', taskId] });
    },
    onError: (error) => {
      console.error('[CardFormPlayground] Mutation error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Error",
        description: "Failed to save response. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (existingResponses.length > 0 && cardFields.length > 0) {
      console.log('[CardFormPlayground] Loading existing responses:', {
        responseCount: existingResponses.length,
        timestamp: new Date().toISOString()
      });

      const fieldMap = new Map(cardFields.map(f => [f.id, f.field_key]));
      const responses: Record<string, string> = {};

      existingResponses.forEach(response => {
        const fieldKey = fieldMap.get(response.field_id);
        if (fieldKey && response.response_value) {
          responses[fieldKey] = response.response_value;
        }
      });

      console.log('[CardFormPlayground] Responses loaded:', {
        fieldCount: Object.keys(responses).length,
        responseValues: responses,
        timestamp: new Date().toISOString()
      });

      setFormResponses(responses);
    }
  }, [existingResponses, cardFields]);

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

  useEffect(() => {
    if (!currentSection && Object.keys(sections).length > 0) {
      const firstSection = Object.keys(sections)[0];
      console.log('[CardFormPlayground] Setting initial section:', {
        section: firstSection,
        timestamp: new Date().toISOString()
      });
      setCurrentSection(firstSection);
    }
  }, [sections]);

  const handleResponseChange = async (field: CardField, value: string) => {
    console.log('[CardFormPlayground] Field updated:', {
      fieldKey: field.field_key,
      hasValue: !!value,
      timestamp: new Date().toISOString()
    });

    setFormResponses(prev => ({
      ...prev,
      [field.field_key]: value
    }));

    try {
      await saveResponse.mutateAsync({
        fieldId: field.id,
        response: value
      });
    } catch (error) {
      console.error('[CardFormPlayground] Error saving response:', {
        fieldKey: field.field_key,
        error,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleSubmit = () => {
    console.log('[CardFormPlayground] Submitting form:', {
      taskId,
      responseCount: Object.keys(formResponses).length,
      progress,
      timestamp: new Date().toISOString()
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

  const isLoading = isLoadingFields || isLoadingResponses;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          CARD Assessment for {companyData?.name || companyName}
        </h1>
        {companyData?.description && (
          <p className="text-muted-foreground">{companyData.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

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

      {currentSection && sections[currentSection] && (
        <div className="space-y-6">
          {sections[currentSection].map((field) => (
            <Card key={field.id} className="p-6 space-y-4 relative">
              {formResponses[field.field_key] && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-base text-muted-foreground font-medium">
                  {field.question_label}
                </h3>
                <p className="text-lg text-foreground">
                  {field.question}
                  {field.example_response && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                        >
                          ℹ️
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Example: {field.example_response}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </p>
              </div>

              <Textarea
                value={formResponses[field.field_key] || ''}
                onChange={(e) => handleResponseChange(field, e.target.value)}
                placeholder="Enter your response..."
                className="min-h-[100px]"
              />
            </Card>
          ))}
        </div>
      )}

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