import { ArrowUp, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FormReviewPageProps {
  formData: Record<string, any>;
  fieldConfigs: Record<string, any>; // Map of field names to their configs
  onBack: () => void;
  onSubmit: () => void;
  isSubmitted?: boolean; // New prop to determine if form has been submitted
}

const FormReviewPage = ({ 
  formData, 
  fieldConfigs, 
  onBack, 
  onSubmit, 
  isSubmitted = false 
}: FormReviewPageProps) => {
  // Filter out empty fields and create entries with their corresponding question
  const formEntries = Object.entries(formData)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      fieldName: key,
      question: fieldConfigs[key]?.question || key,
      value: String(value)
    }));

  return (
    <Card className="p-6 max-w-3xl mx-auto mb-8" style={{ transform: 'none' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isSubmitted ? "Survey Answers" : "Survey Answers For Review"}
        </h2>
        <Badge 
          className={`${isSubmitted ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-600"} px-3 py-1`}
        >
          {isSubmitted ? "SUBMITTED" : "IN REVIEW"}
        </Badge>
      </div>
      
      <div className="space-y-3">
        {formEntries.map((entry, index) => (
          <div key={entry.fieldName} className="border-b pb-3 mb-3">
            <div className="flex gap-2">
              <span className="font-bold text-gray-500">{index + 1}.</span>
              <div className="w-full">
                <p className="text-gray-600 text-sm">{entry.question}</p>
                <div className="flex items-start mt-1">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 mr-2 flex-shrink-0 ${isSubmitted ? "text-green-600" : "text-blue-600"}`} />
                  <div>
                    <span className="font-bold">{entry.value}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {!isSubmitted && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-lg font-medium mb-2">Submission Terms</h3>
          <p className="text-sm text-gray-600 mb-4">
            By submitting this form, you confirm that all information provided is accurate and complete to the best of your knowledge.
          </p>
        </div>
      )}
      
      <div className="flex justify-between mt-8 pt-4 border-t">
        {!isSubmitted && (
          <Button
            onClick={onBack}
            variant="outline"
            className="rounded-lg px-4"
          >
            Back
          </Button>
        )}
        
        <Button
          onClick={onSubmit}
          className={`rounded-lg px-4 hover:bg-blue-700 transition-all ${isSubmitted ? "mx-auto" : "ml-auto"}`}
        >
          {isSubmitted ? (
            <>
              Back to Top
              <ArrowUp className="h-4 w-4 ml-1 text-white" />
            </>
          ) : (
            <>
              Submit
              <Check className="h-4 w-4 ml-1 text-white" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default FormReviewPage;