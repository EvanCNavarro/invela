import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Function to extract tooltip content from question text
const extractTooltipContent = (question: string): { mainText: string; tooltipText: string | null } => {
  const match = question.match(/^(.*?)(?:\s*\((e\.g\.|i\.e\.,|example:)?(.*?)\))?$/i);
  if (!match || !match[2]) {
    return { mainText: question, tooltipText: null };
  }
  return {
    mainText: match[1].trim(),
    tooltipText: match[2].replace(/^(?:e\.g\.|i\.e\.,|example:)\s*/i, '').trim()
  };
};

// Define the form steps based on KYB requirements
const FORM_STEPS = [
  {
    id: 'entity-identification',
    title: 'Entity Identification',
    description: 'Basic information about your company',
    fields: [
      { 
        name: 'legalEntityName', 
        label: 'Legal Entity Name', 
        question: 'What is the full, registered name of the business?',
        suggestion: 'name' 
      },
      { 
        name: 'registrationNumber', 
        label: 'Registration Number',
        question: 'What is your corporation number or business number (e.g., issued by Corporations Canada or the relevant state authority)?'
      },
      { 
        name: 'incorporationDate', 
        label: 'Date of Incorporation',
        question: 'When was the business legally formed?',
        suggestion: 'incorporationYear' 
      },
      { 
        name: 'jurisdiction', 
        label: 'Jurisdiction of Incorporation',
        question: 'In which state or province is your business incorporated (e.g., Ontario, British Columbia, or U.S. state)?',
        suggestion: 'hqAddress' 
      },
      { 
        name: 'registeredAddress', 
        label: 'Registered Business Address',
        question: 'What is your principal place of business or registered address?',
        suggestion: 'hqAddress' 
      },
      { 
        name: 'businessType', 
        label: 'Business Type/Legal Structure',
        question: 'Is your entity structured as a corporation, limited liability company (LLC), partnership, or another form?',
        suggestion: 'legalStructure' 
      }
    ],
    validation: (data: Record<string, string>) => {
      const requiredFields = ['legalEntityName', 'registrationNumber', 'incorporationDate'];
      return requiredFields.every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  },
  {
    id: 'ownership-management',
    title: 'Ownership & Management',
    description: 'Details about company ownership and management',
    fields: [
      { 
        name: 'directorsAndOfficers', 
        label: 'Directors and Officers',
        question: 'Who are the directors and senior officers? Please include full legal names, dates of birth, and contact details.',
        suggestion: 'foundersAndLeadership' 
      },
      { 
        name: 'ultimateBeneficialOwners', 
        label: 'Ultimate Beneficial Owners (UBOs)',
        question: 'Which individuals directly or indirectly own 25% or more of the business? Please provide supporting documentation.'
      },
      { 
        name: 'authorizedSigners', 
        label: 'Authorized Signers',
        question: 'Who is authorized to sign legally binding documents on behalf of the business, and how is their authority documented?'
      }
    ],
    validation: (data: Record<string, string>) => {
      const requiredFields = ['directorsAndOfficers', 'ultimateBeneficialOwners'];
      return requiredFields.every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  },
  {
    id: 'official-documentation',
    title: 'Official Documentation',
    description: 'Required legal and regulatory documents',
    fields: [
      { 
        name: 'corporateRegistration', 
        label: 'Corporate Registration Documents',
        question: 'Can you provide the official document(s) that confirm your business registration and legal status?'
      },
      { 
        name: 'goodStanding', 
        label: 'Proof of Good Standing',
        question: 'Is your business current and in good standing with the regulatory body?'
      },
      { 
        name: 'licenses', 
        label: 'Licensing and Regulatory Documents',
        question: 'What additional licenses or permits do you hold that relate to your business activities?'
      }
    ],
    validation: (data: Record<string, string>) => {
      const requiredFields = ['corporateRegistration', 'goodStanding'];
      return requiredFields.every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  },
  {
    id: 'financial-operational',
    title: 'Financial & Operational',
    description: 'Financial and operational information',
    fields: [
      { 
        name: 'taxId', 
        label: 'Tax Identification',
        question: 'What is your tax ID (e.g., EIN in the U.S. or CRA Business Number in Canada)?'
      },
      { 
        name: 'financialStatements', 
        label: 'Financial Statements',
        question: 'Can you provide recent audited financial statements or other financial documentation that demonstrates your business\'s financial health?'
      },
      { 
        name: 'operationalPolicies', 
        label: 'Operational Policies',
        question: 'Do you have documented policies for data protection, cybersecurity (especially for API security related to OpenBanking), and business continuity plans?'
      }
    ],
    validation: (data: Record<string, string>) => {
      const requiredFields = ['taxId', 'financialStatements'];
      return requiredFields.every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  },
  {
    id: 'compliance-risk',
    title: 'Compliance & Risk',
    description: 'Compliance and risk assessment information',
    fields: [
      { 
        name: 'sanctionsCheck', 
        label: 'Sanctions and Adverse Media Checks',
        question: 'Has your business ever been flagged on sanctions or adverse media watchlists?'
      },
      { 
        name: 'dueDiligence', 
        label: 'Due Diligence Reports',
        question: 'Do you have any recent third-party due diligence or risk assessment reports that can verify your compliance?'
      }
    ],
    validation: (data: Record<string, string>) => {
      const requiredFields = ['sanctionsCheck', 'dueDiligence'];
      return requiredFields.every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  }
];

export const OnboardingKYBFormPlayground = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState("");
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleCompanySearch = async () => {
    if (!companyName.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const { data } = await response.json();
      setCompanyData(data.company);
    } catch (error) {
      console.error("Error searching company:", error);
    } finally {
      setIsSearching(false);
    }
  };

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

  // Calculate progress based on current step
  const progress = isSubmitted
    ? 100
    : Math.round((currentStep / (FORM_STEPS.length - 1)) * 75);

  // Check if current step is valid
  const isCurrentStepValid = currentStepData.validation(formData);

  const getSuggestionForField = (fieldName: string) => {
    const field = currentStepData.fields.find(f => f.name === fieldName);
    if (field?.suggestion && companyData?.[field.suggestion]) {
      return companyData[field.suggestion];
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Enter company name..."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          onBlur={handleCompanySearch}
        />
        <Button onClick={handleCompanySearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>

      <Card className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className={`px-2 py-1 text-xs rounded ${
                isSubmitted
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isSubmitted ? 'COMPLETED' : 'IN PROGRESS'}
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
                const value = formData[field.name];
                const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
                const isTouched = value !== undefined;
                const suggestion = getSuggestionForField(field.name);
                const { mainText, tooltipText } = extractTooltipContent(field.question);

                // Determine field variant based on validation
                let variant: 'default' | 'error' | 'successful' | 'ai-suggestion' = 'default';
                if (suggestion && !isTouched) {
                  variant = 'ai-suggestion';
                } else if (isTouched) {
                  variant = isEmpty ? 'error' : 'successful';
                }

                return (
                  <div key={field.name} className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-foreground">
                          {mainText}
                        </span>
                        {tooltipText && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{tooltipText}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                    <FormField
                      type="text"
                      variant={variant}
                      value={value || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [field.name]: e.target.value
                      }))}
                      aiSuggestion={suggestion}
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

export default OnboardingKYBFormPlayground;