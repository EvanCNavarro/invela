import { ArrowLeft, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FormReviewPageProps {
  formData: Record<string, any>;
  fieldConfigs: Record<string, any>; // Map of field names to their configs
  onBack: () => void;
  onSubmit: () => void;
}

const FormReviewPage = ({ formData, fieldConfigs, onBack, onSubmit }: FormReviewPageProps) => {
  // Filter out empty fields and create entries with their corresponding question
  const formEntries = Object.entries(formData)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      fieldName: key,
      question: fieldConfigs[key]?.question || key,
      value: String(value)
    }));

  return (
    <Card className="p-6">
      {/* Header Section - Match the main form header */}
      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">KYB Survey</h2>
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
        
        {/* Form entries with reduced spacing - 12px instead of 24px */}
        <div className="space-y-3">
          {formEntries.map((entry, index) => (
            <div key={entry.fieldName} className="border-b border-gray-200 pb-3 mt-3">
              <div className="flex gap-2">
                <span className="font-bold text-gray-500">{index + 1}.</span>
                <div className="w-full">
                  <p className="text-gray-600 text-sm">Q: {entry.question}</p>
                  <div className="flex items-start mt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <span className="font-normal text-gray-500">Answer: </span>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Terms acceptance section */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-semibold mb-2">Submission Terms</h4>
          <p className="text-gray-600 text-sm mb-4">
            I, the undersigned, confirm that all information provided in this KYB survey for <span className="font-bold">{fieldConfigs.company_name?.value || formData.company_name}</span> is accurate and complete to the best of my knowledge.
          </p>
        </div>
      </div>
      
      <div className="flex justify-between mt-6 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-lg px-4 transition-all hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        
        <Button
          onClick={onSubmit}
          className="rounded-lg px-4 hover:bg-blue-700 transition-all animate-pulse-ring"
        >
          Submit
          <Check className="h-4 w-4 ml-1 text-white" />
        </Button>
      </div>
    </Card>
  );
};

export default FormReviewPage;