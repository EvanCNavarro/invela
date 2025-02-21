import { useState, useEffect, useRef } from "react";
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
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Update progress calculation logging
const calculateProgress = (formData: Record<string, any>) => {
  console.log('[Progress Debug] Starting progress calculation:', {
    timestamp: new Date().toISOString(),
    formDataKeys: Object.keys(formData)
  });

  const filledFields = FORM_FIELD_NAMES.filter(fieldName => {
    const value = formData[fieldName];
    const isEmpty = isEmptyValue(value);
    console.log(`[Progress Debug] Field "${fieldName}":`, {
      value,
      isEmpty,
      type: typeof value,
      validation: value ? 'present' : 'missing'
    });
    return !isEmpty;
  }).length;

  const progress = Math.round((filledFields / TOTAL_FIELDS) * 100);
  console.log('[Progress Debug] Final calculation:', {
    filledFields,
    totalFields: TOTAL_FIELDS,
    progress,
    timestamp: new Date().toISOString()
  });
  return progress;
};

// Helper function to filter out non-form fields from metadata
const extractFormData = (metadata: Record<string, any>) => {
  const formData: Record<string, string> = {};

  console.log('[Form Debug] Extracting form data from metadata:', {
    metadataKeys: Object.keys(metadata),
    formFieldNames: FORM_FIELD_NAMES,
    timestamp: new Date().toISOString()
  });

  FORM_FIELD_NAMES.forEach(fieldName => {
    const value = metadata[fieldName];
    if (!isEmptyValue(value)) {
      formData[fieldName] = String(value).trim();
    }
  });

  return formData;
};

// Current step validation enhancement
const validateCurrentStep = (formData: Record<string, unknown>, step: typeof FORM_STEPS[number]) => {
  const result = step.validation(formData);
  console.log('Current step validation:', {
    step: step.id,
    formData,
    isValid: result
  });
  return result;
};

// Enhanced suggestion processing
const processSuggestion = (fieldName: string, suggestion: any, companyData: any) => {
  console.log('[KYB Form Debug] Processing suggestion for field:', {
    fieldName,
    suggestionKey: suggestion,
    rawValue: companyData?.[suggestion],
    companyDataKeys: companyData ? Object.keys(companyData) : [],
    timestamp: new Date().toISOString()
  });

  if (!companyData?.[suggestion]) {
    console.log('[KYB Form Debug] No suggestion mapping for field:', {
      fieldName,
      timestamp: new Date().toISOString()
    });
    return undefined;
  }

  const value = companyData[suggestion];
  return Array.isArray(value) ? value.join(', ') : String(value);
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

// Add update queue manager
const createUpdateQueue = () => {
  const queue: Array<() => Promise<void>> = [];
  let isProcessing = false;

  const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    try {
      const nextUpdate = queue.shift();
      if (nextUpdate) await nextUpdate();
    } finally {
      isProcessing = false;
      if (queue.length > 0) processQueue();
    }
  };

  return {
    enqueue: (update: () => Promise<void>) => {
      queue.push(update);
      processQueue();
    }
  };
};

export const OnboardingKYBFormPlayground = ({
  taskId,
  onSubmit,
  companyName,
  companyData: initialCompanyData,
  savedFormData: initialSavedFormData
}: OnboardingKYBFormPlaygroundProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isCompanyDataLoading, setIsCompanyDataLoading] = useState(true);
  const updateQueueRef = useRef(createUpdateQueue());
  const lastProgressRef = useRef<number>(0);
  const lastUpdateRef = useRef(0);
  const suggestionProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Load initial form data
  useEffect(() => {
    console.log('[Form Debug] Starting initial data load:', {
      taskId,
      hasSavedData: !!initialSavedFormData,
      timestamp: new Date().toISOString()
    });

    if (initialSavedFormData) {
      const extractedData = extractFormData(initialSavedFormData);
      const calculatedProgress = calculateProgress(extractedData);

      setFormData(extractedData);
      setProgress(calculatedProgress);
      lastProgressRef.current = calculatedProgress;

      console.log('[Form Debug] Initial form state set:', {
        progress: calculatedProgress,
        fieldCount: Object.keys(extractedData).length,
        timestamp: new Date().toISOString()
      });
    }

    setInitialLoadDone(true);
  }, [initialSavedFormData]);

  // Load company data
  useEffect(() => {
    let isMounted = true;

    const fetchCompanyData = async () => {
      if (!companyName || !initialLoadDone) {
        setIsCompanyDataLoading(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        console.log('[KYB Form Debug] Starting company search:', {
          companyName,
          timestamp: new Date().toISOString()
        });

        const response = await fetch("/api/company-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: companyName.trim() }),
        });

        if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);

        const responseData = await response.json();

        if (isMounted) {
          if (responseData.success && responseData.data.searchComplete) {
            console.log('[KYB Form Debug] Company data received:', {
              dataFields: Object.keys(responseData.data.company),
              timestamp: new Date().toISOString()
            });

            setCompanyData(responseData.data.company);
            setSearchCompleted(true);
          } else {
            setSearchError(responseData.error || 'Failed to retrieve company data');
          }
        }
      } catch (error) {
        if (isMounted) {
          setSearchError(error instanceof Error ? error.message : 'Failed to search company');
        }
      } finally {
        if (isMounted) {
          setIsSearching(false);
          setIsCompanyDataLoading(false);
        }
      }
    };

    fetchCompanyData();

    return () => {
      isMounted = false;
    };
  }, [companyName, initialLoadDone]);

  // Handle form updates
  const handleFormDataUpdate = async (fieldName: string, value: string) => {
    if (!taskId || !isMountedRef.current) return;

    const currentTimestamp = Date.now();
    if (currentTimestamp - lastUpdateRef.current < 500) {
      console.log('[Form Debug] Debouncing update:', {
        timeSinceLastUpdate: currentTimestamp - lastUpdateRef.current,
        skipped: true,
        fieldName,
        timestamp: new Date().toISOString()
      });
      return;
    }
    lastUpdateRef.current = currentTimestamp;

    const updateOperation = async () => {
      // Wait for company data loading to complete
      if (isCompanyDataLoading) {
        console.log('[Form Debug] Waiting for company data to load before update');
        await new Promise(resolve => {
          const checkLoading = () => {
            if (!isCompanyDataLoading) {
              resolve(true);
            } else {
              setTimeout(checkLoading, 100);
            }
          };
          checkLoading();
        });
      }

      console.log('[Form Debug] Processing update:', {
        fieldName,
        value,
        hasCompanyData: !!companyData,
        timestamp: new Date().toISOString()
      });

      const updatedFormData = {
        ...formData,
        [fieldName]: value.trim()
      };

      if (isEmptyValue(updatedFormData[fieldName])) {
        delete updatedFormData[fieldName];
      }

      const newProgress = calculateProgress(updatedFormData);

      if (Math.abs(newProgress - lastProgressRef.current) > 25) {
        console.warn('[Form Debug] Large progress change detected:', {
          previous: lastProgressRef.current,
          new: newProgress,
          difference: newProgress - lastProgressRef.current
        });
      }

      try {
        if (!isMountedRef.current) return;

        setFormData(updatedFormData);
        setProgress(newProgress);
        lastProgressRef.current = newProgress;

        const response = await fetch('/api/kyb/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            progress: newProgress,
            formData: updatedFormData
          })
        });

        if (!response.ok) throw new Error('Failed to save progress');

        const result = await response.json();

        if (!isMountedRef.current) return;

        console.log('[Form Debug] Backend save result:', {
          savedProgress: result.savedData.progress,
          clientProgress: newProgress,
          progressMatch: result.savedData.progress === newProgress,
          timestamp: new Date().toISOString()
        });

        await wsService.send('task_updated', {
          taskId,
          progress: result.savedData.progress,
          status: result.savedData.status
        });

        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

      } catch (error) {
        console.error('[Form Debug] Save operation failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fieldName
        });

        if (!isMountedRef.current) return;

        if (initialSavedFormData) {
          const revertData = extractFormData(initialSavedFormData);
          const revertProgress = calculateProgress(revertData);

          setFormData(revertData);
          setProgress(revertProgress);
          lastProgressRef.current = revertProgress;
        }

        toast({
          title: "Error",
          description: "Failed to save progress. Please try again.",
          variant: "destructive"
        });
      }
    };

    updateQueueRef.current.enqueue(updateOperation);
  };

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
  const isCurrentStepValid = validateCurrentStep(formData, currentStepData);


  // Enhanced logging for suggestion handling
  const getSuggestionForField = (fieldName: string) => {
    if (suggestionProcessingRef.current) {
      console.log('[KYB Form Debug] Skipping suggestion processing - already in progress');
      return undefined;
    }

    if (!searchCompleted || !companyData) {
      console.log('[KYB Form Debug] No suggestions available:', {
        searchCompleted,
        hasCompanyData: !!companyData,
        fieldName,
        timestamp: new Date().toISOString()
      });
      return undefined;
    }

    suggestionProcessingRef.current = true;
    try {
      const field = FORM_STEPS
        .flatMap(step => step.fields)
        .find(f => f.name === fieldName);

      if (!field?.suggestion) {
        console.log('[KYB Form Debug] No suggestion mapping found:', {
          fieldName,
          timestamp: new Date().toISOString()
        });
        return undefined;
      }

      const suggestion = processSuggestion(fieldName, field.suggestion, companyData);
      console.log('[KYB Form Debug] Processed suggestion:', {
        fieldName,
        suggestion,
        timestamp: new Date().toISOString()
      });

      return suggestion;
    } finally {
      suggestionProcessingRef.current = false;
    }
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
    const isEmpty = isEmptyValue(value);
    const isTouched = value !== undefined;
    const suggestion = getSuggestionForField(field.name);

    if (isTouched && !isEmpty) {
      return 'successful';
    } else if (suggestion && !isTouched) {
      return 'ai-suggestion';
    }
    return 'default';
  };

  useEffect(() => {
    console.log('[Form Debug] Component mounted:', {
      taskId,
      hasInitialData: !!initialSavedFormData,
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log('[Form Debug] Component unmounting:', {
        taskId,
        finalProgress: progress,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-1">
              <div className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
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