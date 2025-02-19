import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ArrowLeft } from "lucide-react";

// Define the steps for the wizard
const FORM_STEPS = [
  {
    id: 'company-details',
    title: 'Company Details',
    description: 'Basic information about your company',
    fields: ['name', 'legalStructure'],
    validation: (data: Record<string, string>) => 
      data.name.trim() !== '' && data.legalStructure.trim() !== ''
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Where your company operates',
    fields: ['address', 'country'],
    validation: (data: Record<string, string>) => 
      data.address.trim() !== '' && data.country.trim() !== ''
  },
  {
    id: 'additional-info',
    title: 'Additional Information',
    description: 'Other important details',
    fields: ['description', 'website'],
    validation: (data: Record<string, string>) => 
      data.description.trim() !== '' && data.website.trim() !== ''
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

  // Calculate progress based on current step (25% per step)
  const progress = isSubmitted 
    ? 100 
    : Math.round((currentStep / (FORM_STEPS.length - 1)) * 75);

  // Check if current step is valid
  const isCurrentStepValid = currentStepData.validation(formData);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`px-2 py-1 text-xs rounded ${
                  isSubmitted 
                    ? 'bg-green-100 text-green-600'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isSubmitted ? 'COMPLETED' : 'IN PROGRESS'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">KYB Survey</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Questionnaire | Task
              </p>
            </div>
            {!isSubmitted && (
              <div className="text-sm text-muted-foreground">
                {progress}% Complete
              </div>
            )}
          </div>

          {/* Progress bar - only show when not submitted */}
          {!isSubmitted && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <hr className="border-t border-gray-200 my-6" />

        {/* Form Wizard Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step circle */}
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-sm
                  ${index < currentStep || isSubmitted 
                    ? 'bg-green-600 text-white' 
                    : index === currentStep && !isSubmitted
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }
                `}>
                  {index < currentStep || isSubmitted ? '✓' : index + 1}
                </div>
                {/* Step title */}
                <div className="mx-2">
                  <p className={`text-xs font-medium ${
                    index === currentStep && !isSubmitted
                      ? 'text-blue-500'
                      : index < currentStep || isSubmitted
                        ? 'text-green-600'
                        : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {/* Connector line */}
                {index < FORM_STEPS.length - 1 && (
                  <div className={`
                    flex-1 h-[1px]
                    ${index < currentStep || isSubmitted
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-t border-gray-200 my-6" />

        {/* Form Fields Section - Only show when not submitted */}
        {!isSubmitted && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
            </div>

            <div className="space-y-4">
              {currentStepData.fields.map(field => {
                const isEmpty = !formData[field as keyof typeof formData]?.trim();
                const isTouched = formData[field as keyof typeof formData] !== '';

                // Determine field variant based on validation
                let variant: 'default' | 'error' | 'successful' = 'default';
                if (isTouched) {
                  variant = isEmpty ? 'error' : 'successful';
                }

                return (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <FormField
                      type="text"
                      variant={variant}
                      value={formData[field as keyof typeof formData]}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [field]: e.target.value
                      }))}
                      placeholder={`Enter ${field.toLowerCase()}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          {!isSubmitted && (
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              {currentStep > 0 && <ArrowLeft className="h-4 w-4 mr-2" />}
              Back
            </Button>
          )}
          {isSubmitted ? (
            <div className="ml-auto">
              <Button 
                disabled
                className="bg-green-600 hover:bg-green-600 text-white"
              >
                Submitted
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={!isCurrentStepValid}
              className={`${isLastStep ? 'relative after:absolute after:inset-0 after:rounded-md after:border-3 after:border-blue-500 after:animate-[ripple_1.5s_ease-in-out_infinite]' : ''}`}
            >
              {isLastStep ? 'Submit' : 'Next'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FormPlayground;