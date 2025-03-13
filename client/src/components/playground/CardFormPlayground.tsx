import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { CheckCircle2, Info, Download } from "lucide-react";
import confetti from 'canvas-confetti';
import { Trophy } from "lucide-react";
import { useLocation } from "wouter";

interface CardFormPlaygroundProps {
  taskId: number;
  companyName: string;
  companyData?: {
    name: string;
    description?: string;
  };
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
  onSubmit
}: CardFormPlaygroundProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successData, setSuccessData] = useState<{
    riskScore: number;
    assessmentFile: string;
  } | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loadingFields, setLoadingFields] = useState<Record<number, boolean>>({});
  const [fieldAnalysis, setFieldAnalysis] = useState<Record<number, {
    suspicionLevel: number;
    riskScore: number;
    reasoning: string;
  }>>({});
  const [openTooltip, setOpenTooltip] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [previousResponses, setPreviousResponses] = useState<Record<string, string>>({});

  const { data: taskData } = useQuery({
    queryKey: ['/api/tasks/card', companyName],
    queryFn: async () => {
      console.log('[CardFormPlayground] Fetching task data:', { companyName, timestamp: new Date().toISOString() });
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
      console.log('[CardFormPlayground] Fetching CARD fields', { timestamp: new Date().toISOString() });
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
      console.log('[CardFormPlayground] Fetching existing responses:', { taskId, timestamp: new Date().toISOString() });
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
        hasResponse: !!response,
        timestamp: new Date().toISOString()
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
        status: data.status,
        timestamp: new Date().toISOString()
      });
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/card/responses', taskId] });
    },
    onError: (error) => {
      console.error('[CardFormPlayground] Error saving response:', { error, timestamp: new Date().toISOString() });
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
        responseLength: response.length,
        timestamp: new Date().toISOString()
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
        riskScore: result.partial_risk_score,
        timestamp: new Date().toISOString()
      });

      return result;
    },
    onSuccess: (data) => {
      console.log('[CardFormPlayground] Updating UI with analysis:', {
        fieldId: data.field_id,
        suspicionLevel: data.ai_suspicion_level,
        riskScore: data.partial_risk_score,
        timestamp: new Date().toISOString()
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
      console.error('[CardFormPlayground] OpenAI analysis error:', { error, timestamp: new Date().toISOString() });
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

      setFormResponses(responses);
      setPreviousResponses(responses);
    }
  }, [existingResponses, cardFields]);


  const sections = cardFields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);

  const handleResponseChange = async (field: CardField, value: string) => {
    console.log('[CardFormPlayground] Field value changing:', {
      fieldId: field.id,
      fieldKey: field.field_key,
      currentValue: formResponses[field.field_key],
      newValue: value,
      allCurrentResponses: formResponses,
      timestamp: new Date().toISOString()
    });

    const updatedResponses = {
      ...formResponses,
      [field.field_key]: value
    };

    console.log('[CardFormPlayground] Updated responses state:', {
      fieldId: field.id,
      fieldKey: field.field_key,
      updatedValue: value,
      allUpdatedResponses: updatedResponses,
      timestamp: new Date().toISOString()
    });

    setFormResponses(updatedResponses);

    if (!value.trim()) {
      console.log('[CardFormPlayground] Empty field detected - saving empty response:', {
        fieldId: field.id,
        fieldKey: field.field_key,
        timestamp: new Date().toISOString()
      });

      try {
        await saveResponse.mutateAsync({
          fieldId: field.id,
          response: ''
        });
      } catch (error) {
        console.error('[CardFormPlayground] Error saving empty response:', {
          error,
          fieldId: field.id,
          fieldKey: field.field_key,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const validateResponse = (value: string, previousValue?: string): boolean => {
    if (!value) {
      console.log('[CardFormPlayground] Validation failed: empty value');
      return false;
    }

    if (previousValue && value.trim() === previousValue.trim()) {
      console.log('[CardFormPlayground] Validation failed: unchanged value');
      return false;
    }

    if (value.trim().length < 2) {
      console.log('[CardFormPlayground] Validation failed: too short');
      return false;
    }

    console.log('[CardFormPlayground] Validation passed:', {
      valueLength: value.length,
      hasChanged: value !== previousValue,
      timestamp: new Date().toISOString()
    });

    return true;
  };

  const handleBlur = async (field: CardField, value: string) => {
    const previousValue = previousResponses[field.field_key];

    console.log('[CardFormPlayground] Field blur event:', {
      fieldId: field.id,
      fieldKey: field.field_key,
      currentValue: value,
      previousValue,
      timestamp: new Date().toISOString()
    });

    if (!validateResponse(value, previousValue)) {
      console.log('[CardFormPlayground] Validation failed:', {
        fieldId: field.id,
        fieldKey: field.field_key,
        value: value,
        previousValue,
        timestamp: new Date().toISOString()
      });
      return;
    }

    setPreviousResponses(prev => {
      const updated = {
        ...prev,
        [field.field_key]: value
      };
      console.log('[CardFormPlayground] Updated previous responses:', {
        fieldId: field.id,
        fieldKey: field.field_key,
        updatedPreviousResponses: updated,
        timestamp: new Date().toISOString()
      });
      return updated;
    });

    console.log('[CardFormPlayground] Starting save and analysis chain:', {
      fieldId: field.id,
      fieldKey: field.field_key,
      value: value,
      timestamp: new Date().toISOString()
    });

    setLoadingFields(prev => ({ ...prev, [field.id]: true }));

    try {
      console.log('[CardFormPlayground] Step 1: Saving response');
      const saveResult = await saveResponse.mutateAsync({
        fieldId: field.id,
        response: value
      });

      console.log('[CardFormPlayground] Save response result:', {
        fieldId: field.id,
        status: saveResult.status,
        progress: saveResult.progress,
        timestamp: new Date().toISOString()
      });

      console.log('[CardFormPlayground] Step 2: Starting OpenAI analysis');
      const analysis = await analyzeResponse.mutateAsync({
        fieldId: field.id,
        response: value
      });

      console.log('[CardFormPlayground] Analysis complete:', {
        fieldId: field.id,
        suspicionLevel: analysis.ai_suspicion_level,
        riskScore: analysis.partial_risk_score,
        hasReasoning: !!analysis.reasoning,
        timestamp: new Date().toISOString()
      });

      setFieldAnalysis(prev => ({
        ...prev,
        [field.id]: {
          suspicionLevel: analysis.ai_suspicion_level,
          riskScore: analysis.partial_risk_score,
          reasoning: analysis.reasoning
        }
      }));

    } catch (error) {
      console.error('[CardFormPlayground] Analysis chain error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        fieldId: field.id,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Error",
        description: "Failed to analyze response. Please try again.",
        variant: "destructive"
      });
    } finally {
      console.log('[CardFormPlayground] Analysis chain complete for field:', {
        fieldId: field.id,
        timestamp: new Date().toISOString()
      });
      setLoadingFields(prev => ({ ...prev, [field.id]: false }));
    }
  };

  const submitAssessment = useMutation({
    mutationFn: async () => {
      console.log('[CardFormPlayground] Submitting assessment:', {
        taskId,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/api/card/submit/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit assessment');
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      console.log('[CardFormPlayground] Assessment submitted successfully:', {
        taskId,
        riskScore: data.riskScore,
        assessmentFile: data.assessmentFile,
        timestamp: new Date().toISOString()
      });

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00A3FF', '#0091FF', '#0068FF', '#0059FF', '#0040FF']
      });

      setSuccessData({
        riskScore: data.riskScore,
        assessmentFile: data.assessmentFile
      });
      setIsSuccessModalOpen(true);

      toast({
        title: "Assessment Submitted",
        description: `Assessment completed successfully. Risk Score: ${data.riskScore}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

      if (onSubmit) {
        onSubmit(data);
      }
    },
    onError: (error) => {
      console.error('[CardFormPlayground] Error submitting assessment:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit assessment. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    console.log('[CardFormPlayground] Handling submit:', {
      formResponses,
      progress,
      timestamp: new Date().toISOString()
    });

    // Count completed responses
    const completedResponses = Object.values(formResponses).filter(response => response && response.trim().length > 0).length;

    if (completedResponses < 3) {
      toast({
        title: "Cannot Submit Yet",
        description: "Please complete at least 3 questions before submitting.",
        variant: "destructive"
      });
      return;
    }

    submitAssessment.mutate();
  };

  useEffect(() => {
    if (!currentSection && Object.keys(sections).length > 0) {
      setCurrentSection(Object.keys(sections)[0]);
    }
  }, [sections]);

  if (isLoadingFields || isLoadingResponses) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            Compliance Form: {companyData?.name || companyName}
          </h1>
          <p className="text-muted-foreground">
            Complete the Compliance and Risk Disclosure form
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={Object.values(formResponses).filter(response => response && response.trim().length > 0).length < 3 || submitAssessment.isPending}
          className="px-8"
        >
          {submitAssessment.isPending ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Assessment'
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{Object.values(formResponses).filter(response => response && response.trim().length > 0).length} / {cardFields.length}</span>
        </div>
        <Progress
          value={Object.values(formResponses).filter(response => response && response.trim().length > 0).length / cardFields.length *100}
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
                <div className="absolute top-4 right-4">
                  {loadingFields[field.id] ? (
                    <LoadingSpinner size="sm" className="w-5 h-5" />
                  ) : formResponses[field.field_key] && (
                    <Tooltip open={openTooltip === field.id} onOpenChange={(open) => setOpenTooltip(open ? field.id : null)}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => setOpenTooltip(openTooltip === field.id ? null : field.id)}
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </Button>
                      </TooltipTrigger>
                      {fieldAnalysis[field.id] && (
                        <TooltipContent
                          side="right"
                          align="start"
                          className="p-4 max-w-[300px] space-y-2"
                        >
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
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Suspicion Level:</span>
                            <span className={`font-medium ${
                              fieldAnalysis[field.id].suspicionLevel > 70
                                ? 'text-red-500'
                                : fieldAnalysis[field.id].suspicionLevel > 30
                                ? 'text-yellow-500'
                                : 'text-green-500'
                            }`}>
                              {fieldAnalysis[field.id].suspicionLevel}%
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground whitespace-normal">
                            {fieldAnalysis[field.id].reasoning}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
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
              </Card>
            ))}
          </div>
        )}
      </TooltipProvider>

      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-xl font-semibold">
                Success! 🎉
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <p className="text-base">
              You successfully submitted the CARD Survey on behalf of <span className="font-semibold">{companyName}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              🔓 <span className="font-medium">Achievement Unlocked:</span> You've gained access to new insights! Explore your company's risk analysis and data in the Insights tab.
            </p>
          </div>
          <div className="flex justify-between gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                navigate('/insights');
                setIsSuccessModalOpen(false);
              }}
            >
              Go to Insights
            </Button>
            <Button
              onClick={() => {
                navigate('/dashboard');
                setIsSuccessModalOpen(false);
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}