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

// Helper function to safely check if a value is empty
const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return false;
  return true;
};

interface OnboardingKYBFormPlaygroundProps {
  taskId?: number;
  onSubmit?: (formData: Record<string, any>) => void;
  companyName: string;
  companyData?: any;
}

// Calculate progress by only counting KYB form fields
const FORM_FIELD_NAMES = FORM_STEPS.reduce((acc, step) => {
  return [...acc, ...step.fields.map(field => field.name)];
}, [] as string[]);

export const OnboardingKYBFormPlayground = ({
  taskId,
  onSubmit,
  companyName,
  companyData: initialCompanyData
}: OnboardingKYBFormPlaygroundProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const queryClient = useQueryClient();

  // Helper to filter out non-form fields from metadata
  const extractFormData = (metadata: Record<string, any>) => {
    const formData: Record<string, string> = {};

    // Log the metadata we're processing
    console.log('[KYB Form Debug] Processing metadata:', metadata);

    FORM_FIELD_NAMES.forEach(fieldName => {
      // Only set value if it exists and is not empty
      if (metadata[fieldName] !== undefined && metadata[fieldName] !== null) {
        const value = metadata[fieldName];
        formData[fieldName] = String(value).trim();
        console.log(`[KYB Form Debug] Extracted field ${fieldName}:`, formData[fieldName]);
      }
    });

    return formData;
  };

  // Calculate progress by only counting KYB form fields
  const calculateProgress = () => {
    // Only count fields that are part of the KYB form
    const filledFields = FORM_FIELD_NAMES.filter(fieldName =>
      !isEmptyValue(formData[fieldName])
    ).length;
    return Math.min(Math.round((filledFields / TOTAL_FIELDS) * 100), 100);
  };

  // Save progress to backend
  const saveProgress = async (currentProgress: number) => {
    if (!taskId || !initialLoadDone) return;

    try {
      const response = await fetch('/api/kyb/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          progress: currentProgress,
          formData
        })
      });

      if (!response.ok) throw new Error('Failed to save progress');

      // Notify via WebSocket about progress update
      await wsService.send('task_updated', {
        taskId,
        progress: currentProgress,
        status: currentProgress === 100 ? 'completed' : 'in_progress'
      });

      setLastSavedProgress(currentProgress);

      // Invalidate task queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Load saved form data on mount
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (!taskId) return;

      console.log('[KYB Form Debug] Loading saved progress for task:', taskId);

      try {
        const response = await fetch(`/api/kyb/progress/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to load progress');
        }

        const data = await response.json();
        console.log('[KYB Form Debug] Loaded saved data:', data);

        if (data.formData) {
          // Only extract KYB form fields from metadata
          const extractedData = extractFormData(data.formData);
          console.log('[KYB Form Debug] Extracted form data:', extractedData);

          // Log form field states before updating
          console.log('[KYB Form Debug] Current form state:', {
            formData,
            currentStep,
            progress: lastSavedProgress
          });

          setFormData(extractedData);
          setLastSavedProgress(data.progress || 0);

          // Set the current step based on the last completed step
          const lastCompletedStep = FORM_STEPS.reduce((lastStep, step, index) => {
            const stepFields = step.fields.map(f => f.name);
            const stepData = Object.fromEntries(
              Object.entries(extractedData).filter(([key]) => stepFields.includes(key))
            );
            const isStepValid = step.validation(stepData);

            console.log(`[KYB Form Debug] Validating step ${index}:`, {
              stepName: step.title,
              fields: stepFields,
              data: stepData,
              isValid: isStepValid
            });

            return isStepValid ? index : lastStep;
          }, 0);

          console.log('[KYB Form Debug] Setting current step to:', lastCompletedStep);
          setCurrentStep(lastCompletedStep);
        }

        setInitialLoadDone(true);
        console.log('[KYB Form Debug] Initial load completed');
      } catch (error) {
        console.error('[KYB Form Debug] Error loading saved progress:', error);
        setInitialLoadDone(true);
      }
    };

    loadSavedProgress();

    // Cleanup function to log when component unmounts
    return () => {
      console.log('[KYB Form Debug] Component unmounting, current state:', {
        formData,
        currentStep,
        progress: lastSavedProgress
      });
    };
  }, [taskId]);

  // Save progress when form data changes
  useEffect(() => {
    if (!initialLoadDone) {
      console.log('[KYB Form Debug] Skipping save - initial load not done');
      return;
    }

    const progress = calculateProgress();
    console.log('[KYB Form Debug] Calculated progress:', {
      progress,
      formData,
      lastSavedProgress
    });

    const debounceTimer = setTimeout(() => {
      console.log('[KYB Form Debug] Saving progress:', {
        progress,
        formData,
        taskId
      });
      saveProgress(progress);
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [formData, initialLoadDone]);

  // Load form and perform company search in background
  useEffect(() => {
    let isMounted = true;

    const fetchCompanyData = async () => {
      if (!companyName) {
        console.log("[KYB Form Debug] No company name provided, skipping search");
        return;
      }

      console.log("[KYB Form Debug] Starting search with params:", {
        companyName,
        initialData: initialCompanyData,
        taskId
      });

      setIsSearching(true);
      setSearchError(null);
      setSearchCompleted(false);

      try {
        console.log("[KYB Form Debug] Making API request to /api/company-search");
        const response = await fetch("/api/company-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: companyName.trim() }),
        });

        console.log("[KYB Form Debug] Received API response:", {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("[KYB Form Debug] Parsed response data:", responseData);

        if (isMounted) {
          if (responseData.success && responseData.data.searchComplete) {
            console.log("[KYB Form Debug] Setting company data:", responseData.data.company);
            setCompanyData(responseData.data.company);
            setSearchCompleted(true);

            // Invalidate caches after successful update
            console.log("[KYB Form Debug] Invalidating related query caches");
            queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
            queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          } else {
            console.error("[KYB Form Debug] API reported failure:", responseData.error);
            setSearchError(responseData.error || 'Failed to retrieve company data');
          }
        }
      } catch (error) {
        console.error("[KYB Form Debug] Error in search process:", {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        if (isMounted) {
          setSearchError(error instanceof Error ? error.message : 'Failed to search company');
        }
      } finally {
        if (isMounted) {
          console.log("[KYB Form Debug] Search process completed");
          setIsSearching(false);
        }
      }
    };

    // Start the search process in background
    fetchCompanyData();

    return () => {
      isMounted = false;
    };
  }, [companyName, queryClient, taskId]);

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

  // Calculate progress based on filled fields
  const progress = isSubmitted
    ? 100
    : calculateProgress();

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

  // Update form data handler
  const handleFormDataUpdate = (fieldName: string, value: string) => {
    console.log('[KYB Form Debug] Updating form field:', {
      fieldName,
      oldValue: formData[fieldName],
      newValue: value
    });

    setFormData(prev => {
      const newData = {
        ...prev,
        [fieldName]: value
      };

      // Log detailed form update
      console.log('[KYB Form Debug] Form data updated:', {
        fieldName,
        value,
        previousData: prev,
        newData,
        progress: calculateProgress()
      });

      return newData;
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
                      type="text"
                      variant={variant}
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