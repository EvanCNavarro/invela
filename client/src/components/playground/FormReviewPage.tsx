import { ArrowLeft, Check } from "lucide-react";
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
    <Card className="p-6 max-w-3xl mx-auto mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review Submission</h2>
        <Badge className="bg-green-600 hover:bg-green-600 px-3 py-1">Ready for Submission</Badge>
      </div>
      
      <div className="space-y-6">
        {formEntries.map((entry, index) => (
          <div key={entry.fieldName} className="border-b pb-4">
            <div className="flex gap-2">
              <span className="font-bold text-gray-500">{index + 1}.</span>
              <div className="w-full">
                <p className="font-medium">{entry.question}</p>
                <p className="mt-1 text-gray-700">{entry.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-8 pt-4 border-t">
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