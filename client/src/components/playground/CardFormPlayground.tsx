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

  // Fetch card fields
  const { data: cardFields = [], isLoading } = useQuery<CardField[]>({
    queryKey: ['/api/card/fields'],
    queryFn: async () => {
      const response = await fetch('/api/card/fields');
      if (!response.ok) throw new Error('Failed to fetch CARD fields');
      return response.json();
    }
  });

  // Group fields by section
  const sections = cardFields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);

  // Set initial section if not set
  useEffect(() => {
    if (!currentSection && Object.keys(sections).length > 0) {
      setCurrentSection(Object.keys(sections)[0]);
    }
  }, [sections]);

  // Calculate progress
  useEffect(() => {
    const answeredQuestions = Object.keys(formResponses).length;
    const progress = Math.floor((answeredQuestions / 90) * 90); // 90 questions = 90% max
    setProgress(progress);
  }, [formResponses]);

  const handleResponseChange = (fieldKey: string, value: string) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSubmit = () => {
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
        <h1 className="text-2xl font-semibold">CARD Assessment for {companyData?.name || companyName}</h1>
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
