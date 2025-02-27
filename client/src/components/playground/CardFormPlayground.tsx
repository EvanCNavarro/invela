import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";
import { CheckCircle2, Info } from "lucide-react";

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
  partial_risk_score_max: number;
}

interface CardResponse {
  id: number;
  task_id: number;
  field_id: number;
  response_value: string | null;
  status: 'EMPTY' | 'COMPLETE';
  version: number;
  progress?: number;
  ai_suspicion_level: number;
  partial_risk_score: number;
  reasoning: string;
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
  const [loadingFields, setLoadingFields] = useState<Record<number, boolean>>({});
  const [fieldAnalysis, setFieldAnalysis] = useState<Record<number, { 
    suspicionLevel: number;
    riskScore: number;
    reasoning: string;
  }>>({});

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

  const { data: cardFields = [], isLoading: isLoadingFields } = useQuery({
    queryKey: ['/api/card/fields'],
    queryFn: async () => {
      console.log('[CardFormPlayground] Fetching CARD fields');
      const response = await fetch('/api/card/fields');
      if (!response.ok) {
        throw new Error('Failed to fetch CARD fields');
      }
      return response.json();
    }
  });

  const { data: existingResponses = [], isLoading: isLoadingResponses } = useQuery({
    queryKey: ['/api/card/responses', taskId],
    queryFn: async () => {
      console.log('[CardFormPlayground] Fetching existing responses:', { taskId });
      const response = await fetch(`/api/card/responses/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch responses');
      }
      return response.json();
    },
    enabled: !!taskId
  });

  const saveResponse = useMutation({
    mutationFn: async ({ fieldId, response }: { fieldId: number, response: string }) => {
      console.log('[CardFormPlayground] Saving response:', {
        taskId,
        fieldId,
        hasResponse: !!response
      });

      const res = await fetch(`/api/card/response/${taskId}/${fieldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });

      if (!res.ok) {
        throw new Error('Failed to save response');
      }

      return res.json();
    },
    onSuccess: (data) => {
      console.log('[CardFormPlayground] Response saved successfully:', {
        progress: data.progress,
        status: data.status
      });
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/card/responses', taskId] });
    },
    onError: (error) => {
      console.error('[CardFormPlayground] Error saving response:', error);
      toast({
        title: "Error",
        description: "Failed to save response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const analyzeResponse = useMutation({
    mutationFn: async ({ fieldId, response }: { fieldId: number, response: string }) => {
      console.log('[CardFormPlayground] Starting OpenAI analysis:', {
        taskId,
        fieldId,
        responseLength: response.length
      });

      const res = await fetch(`/api/card/analyze/${taskId}/${fieldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });

      if (!res.ok) {
        throw new Error('Failed to analyze response');
      }

      const result = await res.json();
      console.log('[CardFormPlayground] OpenAI analysis complete:', {
        fieldId,
        suspicionLevel: result.ai_suspicion_level,
        riskScore: result.partial_risk_score
      });

      return result;
    },
    onSuccess: (data) => {
      console.log('[CardFormPlayground] Updating UI with analysis:', {
        fieldId: data.field_id,
        suspicionLevel: data.ai_suspicion_level,
        riskScore: data.partial_risk_score
      });

      setFieldAnalysis(prev => ({
        ...prev,
        [data.field_id]: {
          suspicionLevel: data.ai_suspicion_level,
          riskScore: data.partial_risk_score,
          reasoning: data.reasoning
        }
      }));
    },
    onError: (error) => {
      console.error('[CardFormPlayground] OpenAI analysis error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze response. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (existingResponses.length > 0 && cardFields.length > 0) {
      console.log('[CardFormPlayground] Loading existing responses:', {
        responseCount: existingResponses.length
      });

      const fieldMap = new Map(cardFields.map(f => [f.id, f.field_key]));
      const responses: Record<string, string> = {};

      existingResponses.forEach(response => {
        const fieldKey = fieldMap.get(response.field_id);
        if (fieldKey && response.response_value) {
          responses[fieldKey] = response.response_value;
        }
      });

      setFormResponses(responses);
    }
  }, [existingResponses, cardFields]);

  const sections = cardFields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);

  useEffect(() => {
    if (!currentSection && Object.keys(sections).length > 0) {
      setCurrentSection(Object.keys(sections)[0]);
    }
  }, [sections]);

  const handleResponseChange = async (field: CardField, value: string) => {
    console.log('[CardFormPlayground] Field updated:', {
      fieldKey: field.field_key,
      hasValue: !!value
    });

    // Update local state immediately for responsive UI
    setFormResponses(prev => ({
      ...prev,
      [field.field_key]: value
    }));

    // Save to database
    try {
      await saveResponse.mutateAsync({
        fieldId: field.id,
        response: value
      });
    } catch (error) {
      console.error('[CardFormPlayground] Error saving response:', error);
    }
  };

  const validateResponse = (value: string): boolean => {
    if (value.length < 10) return false;
    if (!/[.!?](\s|$)/.test(value)) return false;
    return true;
  };

  const handleBlur = async (field: CardField, value: string) => {
    if (!value || !validateResponse(value)) return;

    console.log('[CardFormPlayground] Field blur - starting OpenAI analysis:', {
      fieldId: field.id,
      hasValidResponse: true
    });

    setLoadingFields(prev => ({ ...prev, [field.id]: true }));

    try {
      await analyzeResponse.mutateAsync({
        fieldId: field.id,
        response: value
      });
    } finally {
      setLoadingFields(prev => ({ ...prev, [field.id]: false }));
    }
  };

  const handleSubmit = () => {
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

  if (isLoadingFields || isLoadingResponses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            Compliance & Risk Documentation Request
          </h1>
          {companyData?.description && (
            <p className="text-muted-foreground">{companyData.description}</p>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={progress < 90}
          className="px-8"
        >
          Submit Assessment
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress 
          value={progress} 
          className="h-2 bg-gray-200" 
        />
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

      <TooltipProvider>
        {currentSection && sections[currentSection] && (
          <div className="space-y-6">
            {sections[currentSection].map((field) => (
              <Card 
                key={field.id} 
                className={`p-6 space-y-4 relative border-2 ${
                  loadingFields[field.id]
                    ? 'border-gray-300'
                    : formResponses[field.field_key] 
                    ? 'border-green-500/50' 
                    : 'border-transparent'
                }`}
              >
                <div className="absolute top-4 right-4 w-5 h-5">
                  {loadingFields[field.id] ? (
                    <LoadingSpinner size="sm" />
                  ) : formResponses[field.field_key] && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base text-muted-foreground font-medium">
                    {field.question_label}
                  </h3>
                  <p className="text-lg text-foreground font-semibold flex items-center gap-2">
                    {field.question}
                    {field.example_response && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className="ml-2 h-auto p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="p-4 max-w-[300px] text-sm rounded-md"
                        >
                          <p className="whitespace-normal">
                            Example: {field.example_response}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                </div>

                <Textarea
                  value={formResponses[field.field_key] || ''}
                  onChange={(e) => handleResponseChange(field, e.target.value)}
                  onBlur={(e) => handleBlur(field, e.target.value)}
                  placeholder="Enter your response..."
                  className="min-h-[100px]"
                  disabled={loadingFields[field.id]}
                />

                {fieldAnalysis[field.id] && (
                  <div className="mt-2 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Risk Score:</span>
                      <span className={`font-medium ${
                        fieldAnalysis[field.id].riskScore > field.partial_risk_score_max * 0.7
                          ? 'text-red-500'
                          : fieldAnalysis[field.id].riskScore > field.partial_risk_score_max * 0.3
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}>
                        {fieldAnalysis[field.id].riskScore}/{field.partial_risk_score_max}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {fieldAnalysis[field.id].reasoning}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
}