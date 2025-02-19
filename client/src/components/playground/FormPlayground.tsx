import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ChevronLeft } from "lucide-react";

// Define the steps for the wizard
const FORM_STEPS = [
  {
    id: 'company-details',
    title: 'Company Details',
    description: 'Basic information about your company',
    fields: ['name', 'legalStructure']
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Where your company operates',
    fields: ['address', 'country']
  },
  {
    id: 'additional-info',
    title: 'Additional Information',
    description: 'Other important details',
    fields: ['description', 'website']
  }
];

export const FormPlayground = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legalStructure: '',
    address: '',
    country: '',
    description: '',
    website: ''
  });

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(current => current + 1);
    } else {
      console.log('Form submitted:', formData);
      setIsSubmitted(true);
    }
  };

  const currentStepData = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;

  // Calculate progress (only reaches 100% after submission)
  const progress = isSubmitted 
    ? 100 
    : Math.round(((currentStep) / FORM_STEPS.length) * 75); // Max 75% before submission

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                  IN PROGRESS
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">KYB Survey</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Questionnaire | Task
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {progress}% Complete
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form Fields Section */}
        <div className="space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </div>

          <div className="space-y-4">
            {currentStepData.fields.map(field => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-medium">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <FormField
                  type="text"
                  variant="default"
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [field]: e.target.value
                  }))}
                  placeholder={`Enter ${field.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            {currentStep > 0 && <ChevronLeft className="h-4 w-4 mr-2" />}
            Back
          </Button>
          <Button 
            onClick={handleNext}
            className={isLastStep ? 'animate-pulse' : ''}
          >
            {isLastStep ? 'Submit' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FormPlayground;