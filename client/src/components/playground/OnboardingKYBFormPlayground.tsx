import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { ArrowLeft, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { wsService } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

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
        question: 'What is the registered business name?',
        tooltip: 'The full legal name as it appears on official registration documents',
        suggestion: 'name'
      },
      {
        name: 'registrationNumber',
        label: 'Registration Number',
        question: 'What is the corporation or business number?',
        tooltip: 'Issued by Corporations Canada or the relevant state authority',
      },
      {
        name: 'incorporationDate',
        label: 'Date of Incorporation',
        question: 'When was the business formed?',
        tooltip: 'The official date when the business was legally incorporated',
        suggestion: 'incorporation_year'
      },
      {
        name: 'jurisdiction',
        label: 'Jurisdiction of Incorporation',
        question: 'In which jurisdiction is the business incorporated?',
        tooltip: 'Examples: Ontario, British Columbia, or U.S. state',
        suggestion: 'hq_address'
      },
      {
        name: 'registeredAddress',
        label: 'Registered Business Address',
        question: 'What is the principal business address?',
        tooltip: 'The official registered address where the business operates',
        suggestion: 'hq_address'
      },
      {
        name: 'businessType',
        label: 'Business Type/Legal Structure',
        question: 'What is the legal structure of the business?',
        tooltip: 'Options include: corporation, limited liability company (LLC), partnership, or other forms',
        suggestion: 'legal_structure'
      }
    ],
    validation: (data: Record<string, unknown>) => {
      // Check all fields in the step
      return ['legalEntityName', 'registrationNumber', 'incorporationDate', 'jurisdiction', 'registeredAddress', 'businessType'].every(field => {
        const value = data[field];
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return true;  // Numbers are always valid
        return false;  // Any other type is invalid
      });
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
        question: 'Who are the current directors and senior officers?',
        tooltip: 'Include full legal names, dates of birth, and contact details',
        suggestion: 'founders_and_leadership'
      },
      {
        name: 'ultimateBeneficialOwners',
        label: 'Ultimate Beneficial Owners (UBOs)',
        question: 'Which individuals hold 25% or more ownership?',
        tooltip: 'Include direct and indirect ownership with supporting documentation',
        suggestion: 'investors'
      },
      {
        name: 'authorizedSigners',
        label: 'Authorized Signers',
        question: 'Who has legal signing authority for the business?',
        tooltip: 'Include documentation of signing authority',
        suggestion: 'founders_and_leadership'
      }
    ],
    validation: (data: Record<string, string>) => {
      return ['directorsAndOfficers', 'ultimateBeneficialOwners', 'authorizedSigners'].every(field =>
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
        question: 'What are the official registration documents?',
        tooltip: 'Documents that confirm business registration and legal status',
      },
      {
        name: 'goodStanding',
        label: 'Proof of Good Standing',
        question: 'Is the business in good standing with regulators?',
        tooltip: 'Current status with the regulatory body',
      },
      {
        name: 'licenses',
        label: 'Licensing and Regulatory Documents',
        question: 'What business licenses and permits are held?',
        tooltip: 'All current licenses and permits related to business activities',
      }
    ],
    validation: (data: Record<string, string>) => {
      return ['corporateRegistration', 'goodStanding', 'licenses'].every(field =>
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
        question: 'What is the business tax ID?',
        tooltip: 'EIN in the U.S. or CRA Business Number in Canada',
      },
      {
        name: 'financialStatements',
        label: 'Financial Statements',
        question: 'Are recent financial statements available?',
        tooltip: 'Recent audited financial statements or documentation of financial health',
      },
      {
        name: 'operationalPolicies',
        label: 'Operational Policies',
        question: 'What security and compliance policies are in place?',
        tooltip: 'Policies for data protection, cybersecurity (API security for OpenBanking), and business continuity',
      }
    ],
    validation: (data: Record<string, string>) => {
      return ['taxId', 'financialStatements', 'operationalPolicies'].every(field =>
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
        question: 'Are there any sanctions or adverse media flags?',
        tooltip: 'History of sanctions or adverse media watchlist appearances',
      },
      {
        name: 'dueDiligence',
        label: 'Due Diligence Reports',
        question: 'What due diligence reports are available?',
        tooltip: 'Recent third-party due diligence or risk assessment reports verifying compliance',
      }
    ],
    validation: (data: Record<string, string>) => {
      return ['sanctionsCheck', 'dueDiligence'].every(field =>
        typeof data[field] === 'string' && data[field].trim() !== ''
      );
    }
  }
];

// Calculate total fields across all steps
const TOTAL_FIELDS = FORM_STEPS.reduce((acc, step) => acc + step.fields.length, 0);

// Simplified empty value check
const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

// Simplified progress calculation
const calculateProgress = (formData: Record<string, any>) => {
  console.log('[Progress Debug] Calculating form progress');

  const filledFields = FORM_FIELD_NAMES.filter(fieldName => {
    const value = formData[fieldName];
    const isEmpty = isEmptyValue(value);
    console.log(`[Progress Debug] Field ${fieldName}:`, { value, isEmpty });
    return !isEmpty;
  }).length;

  const progress = Math.min(Math.round((filledFields / TOTAL_FIELDS) * 100), 100);
  console.log('[Progress Debug] Progress calculation:', { filledFields, totalFields: TOTAL_FIELDS, progress });
  return progress;
};

// Helper function to filter out non-form fields from metadata
const extractFormData = (metadata: Record<string, any>) => {
  const formData: Record<string, string> = {};
  console.log('[KYB Form Debug] Extracting form data from metadata:', {
    metadataKeys: Object.keys(metadata),
    formFieldNames: FORM_FIELD_NAMES
  });

  FORM_FIELD_NAMES.forEach(fieldName => {
    if (metadata[fieldName] !== undefined && metadata[fieldName] !== null) {
      formData[fieldName] = String(metadata[fieldName]).trim();
    }
  });

  return formData;
};


// Calculate progress by only counting KYB form fields
const FORM_FIELD_NAMES = FORM_STEPS.reduce((acc, step) => {
  return [...acc, ...step.fields.map(field => field.name)];
}, [] as string[]);

// Status determination based on progress thresholds
const getStatusFromProgress = (progress: number): string => {
  console.log('[Status Debug] Determining status for progress:', progress);

  if (progress === 0) return 'NOT_STARTED';
  if (progress === 100) return 'COMPLETED';
  return 'IN_PROGRESS';
};

interface OnboardingKYBFormPlaygroundProps {
  taskId?: number;
  onSubmit?: (formData: Record<string, any>) => void;
  companyName: string;
  companyData?: any;
  savedFormData?: Record<string, any>;
}

export const OnboardingKYBFormPlayground = ({
  taskId,
  onSubmit,
  companyName,
  companyData: initialCompanyData,
  savedFormData: initialSavedFormData
}: OnboardingKYBFormPlaygroundProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);


  // Load saved form data on mount
  useEffect(() => {
    console.log('[Form Debug] Loading saved form data:', {
      hasSavedData: !!initialSavedFormData,
      savedDataKeys: initialSavedFormData ? Object.keys(initialSavedFormData) : []
    });

    if (initialSavedFormData) {
      setFormData(initialSavedFormData);
      const initialProgress = calculateProgress(initialSavedFormData);
      setProgress(initialProgress);
    }
    setInitialLoadDone(true);
  }, [initialSavedFormData]);

  // Load form and perform company search in background
  useEffect(() => {
    let isMounted = true;

    const fetchCompanyData = async () => {
      if (!companyName || !initialLoadDone) {
        console.log("[KYB Form Debug] Skipping company search:", {
          hasCompanyName: !!companyName,
          initialLoadDone
        });
        return;
      }

      console.log("[KYB Form Debug] Starting company search:", {
        companyName,
        currentFormData: Object.keys(formData),
        hasInitialCompanyData: !!initialCompanyData
      });

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch("/api/company-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: companyName.trim() }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("[KYB Form Debug] Company search response:", {
          success: responseData.success,
          hasCompanyData: !!responseData.data?.company
        });

        if (isMounted) {
          if (responseData.success && responseData.data.searchComplete) {
            setCompanyData(responseData.data.company);
            setSearchCompleted(true);
          } else {
            console.error("[KYB Form Debug] API reported failure:", responseData.error);
            setSearchError(responseData.error || 'Failed to retrieve company data');
          }
        }
      } catch (error) {
        console.error("[KYB Form Debug] Company search error:", error);
        if (isMounted) {
          setSearchError(error instanceof Error ? error.message : 'Failed to search company');
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    fetchCompanyData();

    return () => {
      isMounted = false;
    };
  }, [companyName, initialLoadDone]);

  // Handle form field updates
  const handleFormDataUpdate = async (fieldName: string, value: string) => {
    console.log('[Form Debug] Updating field:', { fieldName, value });

    // Update form data
    const updatedFormData = {
      ...formData,
      [fieldName]: value
    };
    setFormData(updatedFormData);

    // Calculate new progress
    const newProgress = calculateProgress(updatedFormData);
    setProgress(newProgress);

    if (!taskId) return;

    try {
      // Update task status and progress
      const newStatus = getStatusFromProgress(newProgress);
      console.log('[Task Debug] Updating task:', { taskId, newProgress, newStatus });

      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          progress: newProgress
        })
      });

      if (!response.ok) throw new Error('Failed to update task status');

      // Save form data
      const saveResponse = await fetch('/api/kyb/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          progress: newProgress,
          formData: updatedFormData
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save form progress');

      // Notify via WebSocket
      await wsService.send('task_updated', {
        taskId,
        progress: newProgress,
        status: newStatus
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

    } catch (error) {
      console.error('[Form Debug] Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load saved form data on mount
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!taskId) return;

      console.log('[KYB Form Debug] === Initial Load ===');
      console.log('[KYB Form Debug] Loading task:', taskId);

      try {
        const response = await fetch(`/api/kyb/progress/${taskId}`);
        if (!response.ok) {
          console.error('[KYB Form Debug] Failed to load progress:', response.statusText);
          throw new Error('Failed to load progress');
        }

        const data = await response.json();
        console.log('[KYB Form Debug] Loaded progress data:', {
          progress: data.progress,
          formDataKeys: data.formData ? Object.keys(data.formData) : [],
          hasFormData: !!data.formData
        });

        if (data.formData) {
          const extractedData = extractFormData(data.formData);
          console.log('[KYB Form Debug] Extracted form fields:', {
            extractedFields: Object.keys(extractedData),
            totalFields: TOTAL_FIELDS,
            filledFields: Object.values(extractedData).filter(val => !isEmptyValue(val)).length
          });

          setFormData(prev => ({...prev, ...extractedData}));
          setProgress(data.progress || 0);
          // Calculate initial progress

        }

        setInitialLoadDone(true);
      } catch (error) {
        console.error('[KYB Form Debug] Error in initial load:', error);
        setInitialLoadDone(true);
      }
    };

    loadSavedProgress();
  }, [taskId]);


  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const handleNext = () => {
    console.log('[KYB Form Debug] Navigation Event: Next button clicked');
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(current => current + 1);
    } else {
      console.log('Form submitted:', formData);
      if (onSubmit) {
        onSubmit(formData);
      }
      setIsSubmitted(true);
    }
  };

  const currentStepData = FORM_STEPS[currentStep];
  const isLastStep = currentStep === FORM_STEPS.length - 1;

  // Check if current step is valid
  const isCurrentStepValid = (() => {
    const result = currentStepData.validation(formData);
    console.log('Current step validation:', {
      step: currentStepData.id,
      formData,
      isValid: result
    });
    return result;
  })();

  const getSuggestionForField = (fieldName: string) => {
    // Only return suggestions if search is completed
    if (!searchCompleted || !companyData) {
      console.log("[KYB Form Debug] No suggestions available:", {
        searchCompleted,
        hasCompanyData: !!companyData,
        fieldName
      });
      return undefined;
    }

    const field = currentStepData.fields.find(f => f.name === fieldName);

    if (!field?.suggestion) {
      console.log("[KYB Form Debug] No suggestion mapping for field:", fieldName);
      return undefined;
    }

    const suggestionValue = companyData[field.suggestion];

    console.log("[KYB Form Debug] Processing suggestion for field:", {
      fieldName,
      suggestionKey: field.suggestion,
      rawValue: suggestionValue,
      companyDataKeys: Object.keys(companyData)
    });

    if (suggestionValue === undefined || suggestionValue === null) {
      console.log("[KYB Form Debug] No suggestion value found for field:", fieldName);
      return undefined;
    }

    // Handle different data types appropriately
    if (Array.isArray(suggestionValue)) {
      return suggestionValue.join(', ');
    } else if (typeof suggestionValue === 'object') {
      return JSON.stringify(suggestionValue);
    }

    return String(suggestionValue);
  };

  const handleSuggestionClick = (fieldName: string, suggestion: any) => {
    // Ensure suggestion is converted to string
    const stringValue = String(suggestion);

    // Create new form data object
    const updatedFormData = {
      ...formData,
      [fieldName]: stringValue
    };

    // Update form data state
    setFormData(updatedFormData);

    // Debug logging
    console.log('Suggestion click debug:', {
      fieldName,
      originalValue: suggestion,
      originalType: typeof suggestion,
      convertedValue: stringValue,
      convertedType: typeof stringValue,
      formDataBefore: formData,
      formDataAfter: updatedFormData,
      currentStepValidation: currentStepData.validation(updatedFormData)
    });
  };


  // Determine field variant based on validation and form state
  const getFieldVariant = (field: any, value: string | undefined) => {
    const isEmpty = !value || value.trim() === '';
    const isTouched = value !== undefined;
    const suggestion = getSuggestionForField(field.name);

    // Only show error state when the field has been touched and is empty
    if (suggestion && !isTouched) {
      return 'ai-suggestion';
    } else if (isTouched && !isEmpty) {
      return 'successful';
    }

    // Return default state instead of error when loading the form
    return 'default';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
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
        </div>

        {/* Progress bar */}
        {!isSubmitted && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

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
                const { mainText, tooltipText } = extractTooltipContent(field.question);
                const variant = getFieldVariant(field, value);

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
                        {field.tooltip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">{field.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                    <FormField
                      type="text"                      variant={variant}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFormDataUpdate(field.name, e.target.value)}
                      aiSuggestion={getSuggestionForField(field.name)}
                      onSuggestionClick={() => {
                        const suggestion = getSuggestionForField(field.name);
                        if (suggestion) {
                          handleSuggestionClick(field.name, suggestion);
                        }
                      }}
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