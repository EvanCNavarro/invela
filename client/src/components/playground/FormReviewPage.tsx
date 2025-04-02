import { ArrowLeft, ArrowUp, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FormReviewPageProps {
  formData: Record<string, any>;
  fieldConfigs: Record<string, any>; // Map of field names to their configs
  onBack: () => void;
  onSubmit: () => void;
  isSubmitted?: boolean; // New prop to determine if the form has been submitted
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

  // Function to scroll to top when "Back to Top" is clicked
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Card className="p-6 max-w-3xl mx-auto mb-8" style={{ transform: 'none' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isSubmitted ? "Survey Answers" : "KYB Survey"}
        </h2>
        <Badge 
          className={`px-3 py-1 ${
            isSubmitted 
              ? "bg-green-600 hover:bg-green-600 text-white" 
              : "bg-blue-600 hover:bg-blue-600"
          }`}
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
                <p className="text-gray-600 text-sm">
                  {isSubmitted ? entry.question : `Q: ${entry.question}`}
                </p>
                <div className="flex items-start mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    {isSubmitted ? (
                      <span className="font-bold">{entry.value}</span>
                    ) : (
                      <>
                        <span className="font-normal text-gray-500">Answer: </span>
                        <span className="font-bold">{entry.value}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Submission Terms - only show if not submitted */}
      {!isSubmitted && (
        <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="font-semibold mb-2">Submission Terms</h3>
          <p className="text-sm text-gray-600">
            By submitting this form, you confirm that all information provided is accurate and complete 
            to the best of your knowledge. This information will be used for compliance and risk assessment purposes.
          </p>
        </div>
      )}
      
      <div className={`flex ${isSubmitted ? 'justify-center' : 'justify-between'} mt-8 pt-4 border-t`}>
        {/* Back button - only show if not submitted */}
        {!isSubmitted && (
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-lg px-4 transition-all hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        
        {/* Submit or Back to Top button */}
        <Button
          onClick={isSubmitted ? scrollToTop : onSubmit}
          className={`rounded-lg px-4 ${
            isSubmitted 
              ? "hover:bg-blue-700 transition-all" 
              : "hover:bg-blue-700 transition-all animate-pulse-ring"
          }`}
          style={!isSubmitted ? { animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', transform: 'none' } : {}}
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