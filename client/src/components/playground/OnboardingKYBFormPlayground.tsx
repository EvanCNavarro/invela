import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField as OriginalFormField } from "@/components/ui/form-field";
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

// Update the field type to include suggestion
type FormField = {
  name: string;
  label: string;
  question: string;
  tooltip: string;
  suggestion?: string;
};

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
const FORM_STEPS: FormField[][] = [
  [
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
    },
    {
      name: 'jurisdiction',
      label: 'Jurisdiction of Incorporation',
      question: 'In which jurisdiction is the business incorporated?',
      tooltip: 'Examples: Ontario, British Columbia, or U.S. state',
      suggestion: 'hq_address'
    }
  ],
  [
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
  [
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
  [
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
  [
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
  ]
];

// Calculate total fields across all steps
const TOTAL_FIELDS = FORM_STEPS.reduce((acc, step) => acc + step.length, 0);

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
const validateCurrentStep = (formData: Record<string, unknown>, step: FormField[]) => {
  const result = step.every(field => !isEmptyValue(formData[field.name]));
  console.log('Current step validation:', {
    step: step.map(s => s.name),
    formData,
    isValid: result
  });
  return result;
};

// Update the field processing functions with enhanced logging
const processSuggestion = (fieldName: string, suggestion: string | undefined, companyData: any) => {
  console.log('[KYB Form Debug] Processing suggestion:', {
    fieldName,
    suggestionKey: suggestion,
    hasCompanyData: !!companyData,
    availableCompanyKeys: companyData ? Object.keys(companyData) : [],
    rawValue: companyData?.[suggestion ?? ''],
    timestamp: new Date().toISOString()
  });

  if (!suggestion || !companyData?.[suggestion]) {
    console.log('[KYB Form Debug] No valid suggestion found:', {
      fieldName,
      suggestion,
      timestamp: new Date().toISOString()
    });
    return undefined;
  }

  const value = companyData[suggestion];
  const processedValue = Array.isArray(value) ? value.join(', ') : String(value);

  console.log('[KYB Form Debug] Processed suggestion value:', {
    fieldName,
    rawValue: value,
    processedValue,
    valueType: typeof value,
    isArray: Array.isArray(value),
    timestamp: new Date().toISOString()
  });

  return processedValue;
};

// Calculate progress by only counting KYB form fields
const FORM_FIELD_NAMES = FORM_STEPS.reduce((acc, step) => {
  return [...acc, ...step.map(field => field.name)];
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

// Enhanced debug logging for form data
const logFormDataDebug = (stage: string, data: any) => {
  console.log(`[KYB Form Data Debug] ${stage}:`, {
    timestamp: new Date().toISOString(),
    fieldCount: Object.keys(data || {}).length,
    fields: Object.entries(data || {}).map(([key, value]) => ({
      field: key,
      value,
      isEmpty: isEmptyValue(value)
    }))
  });
};

// Enhanced debug logging for company data
const logCompanyDataDebug = (data: any) => {
  console.log('[KYB Form Company Debug] Available company data:', {
    timestamp: new Date().toISOString(),
    hasData: !!data,
    fields: data ? Object.keys(data) : [],
    mappableFields: data ? Object.entries(data).map(([key, value]) => ({
      field: key,
      type: typeof value,
      isArray: Array.isArray(value),
      isEmpty: isEmptyValue(value)
    })) : []
  });
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
  const [isLoading, setIsLoading] = useState(true);  // New loading state
  const [dataInitialized, setDataInitialized] = useState(false);  // New initialization state
  const lastProgressRef = useRef<number>(0);
  const lastUpdateRef = useRef(0);
  const suggestionProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const formDataRef = useRef<Record<string, string>>({});
  const [isCompanyDataLoading, setIsCompanyDataLoading] = useState(false); // Added state for company data loading

  // Function to find the first incomplete step
  const findFirstIncompleteStep = (formData: Record<string, string>): number => {
    for (let i = 0; i < FORM_STEPS.length; i++) {
      const step = FORM_STEPS[i];
      const isStepValid = validateCurrentStep(formData, step);
      if (!isStepValid) {
        return i;
      }
    }
    return 0; // Return to first step if all are complete
  };

  // Function to find first empty field in current step
  const findFirstEmptyField = (step: FormField[], formData: Record<string, string>): string | null => {
    for (const field of step) {
      if (isEmptyValue(formData[field.name])) {
        return field.name;
      }
    }
    return null;
  };

  // Load initial form data with forced refresh and set initial step
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      console.log('[KYB Form Debug] Starting initial data load:', {
        taskId,
        companyName,
        hasSavedData: !!initialSavedFormData,
        hasCompanyData: !!initialCompanyData,
        timestamp: new Date().toISOString()
      });

      let dataToLoad: Record<string, string> = {};

      if (taskId) {
        try {
          const response = await fetch(`/api/kyb/progress/${taskId}`);
          if (!response.ok) throw new Error('Failed to fetch latest progress');
          const { formData: latestFormData, progress: latestProgress } = await response.json();

          console.log('[KYB Form Debug] Task data retrieved:', {
            taskId,
            progress: latestProgress,
            formDataFields: Object.keys(latestFormData || {}),
            formData: latestFormData,
            timestamp: new Date().toISOString()
          });

          if (latestFormData) {
            dataToLoad = Object.entries(latestFormData).reduce((acc, [key, value]) => {
              if (value !== null && value !== undefined) {
                acc[key] = String(value);
              }
              return acc;
            }, {} as Record<string, string>);
          }

          setProgress(latestProgress);
          lastProgressRef.current = latestProgress;
          logFormDataDebug('Initial task data', dataToLoad);
        } catch (error) {
          console.error('[KYB Form Debug] Error fetching latest data:', error);
          if (initialSavedFormData) {
            dataToLoad = extractFormData(initialSavedFormData);
            const calculatedProgress = calculateProgress(dataToLoad);
            setProgress(calculatedProgress);
            lastProgressRef.current = calculatedProgress;
            logFormDataDebug('Fallback to initial saved data', dataToLoad);
          }
        }
      } else if (initialSavedFormData) {
        dataToLoad = extractFormData(initialSavedFormData);
        const calculatedProgress = calculateProgress(dataToLoad);
        setProgress(calculatedProgress);
        lastProgressRef.current = calculatedProgress;
        logFormDataDebug('Using initial saved data', dataToLoad);
      }

      console.log('[KYB Form Debug] Setting initial form data:', {
        dataToLoad,
        fields: Object.keys(dataToLoad),
        values: Object.values(dataToLoad),
        timestamp: new Date().toISOString()
      });

      if (initialCompanyData) {
        logCompanyDataDebug(initialCompanyData);
        setCompanyData(initialCompanyData);
      }

      setFormData(dataToLoad);
      formDataRef.current = dataToLoad;

      const incompleteStepIndex = findFirstIncompleteStep(dataToLoad);
      setCurrentStep(incompleteStepIndex);

      // Set initialization flag after all data is loaded
      setDataInitialized(true);
      setIsLoading(false);

      console.log('[KYB Form Debug] Initial data load complete:', {
        currentStep: incompleteStepIndex,
        formFields: Object.keys(dataToLoad),
        formData: dataToLoad,
        isInitialized: true,
        timestamp: new Date().toISOString()
      });
    };

    loadInitialData();
  }, [taskId, initialSavedFormData, initialCompanyData]);

  // Clean up and invalidate cache when unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks/kyb'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      }
    };
  }, [taskId, queryClient]);

  // Handle form updates
  const handleFormDataUpdate = async (fieldName: string, value: string) => {
    if (!taskId || !isMountedRef.current) return;

    console.log('[KYB Form Debug] Field update triggered:', {
      fieldName,
      newValue: value,
      previousValue: formData[fieldName],
      timestamp: new Date().toISOString()
    });

    const currentTimestamp = Date.now();
    if (currentTimestamp - lastUpdateRef.current < 500) {
      console.log('[Form Debug] Debouncing update:', {
        timeSinceLastUpdate: currentTimestamp - lastUpdateRef.current,
        skipped: true,
        timestamp: new Date().toISOString()
      });
      return;
    }
    lastUpdateRef.current = currentTimestamp;

    try {
      const updatedFormData = {
        ...formData,
        [fieldName]: value.trim()
      };

      if (isEmptyValue(updatedFormData[fieldName])) {
        delete updatedFormData[fieldName];
      }

      const newProgress = calculateProgress(updatedFormData);

      setFormData(updatedFormData);
      formDataRef.current = updatedFormData;
      setProgress(newProgress);
      lastProgressRef.current = newProgress;

      const response = await fetch('/api/kyb/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          progress: newProgress,
          formData: updatedFormData,
          fieldUpdates: {
            [fieldName]: {
              value: value.trim(),
              status: isEmptyValue(value.trim()) ? 'EMPTY' : 'COMPLETE',
              updatedAt: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save progress');

      const result = await response.json();
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
        fieldName,
        timestamp: new Date().toISOString()
      });

      if (!isMountedRef.current) return;

      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      });
    }
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


  // Enhanced getSuggestionForField function
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
        .flatMap(step => step)
        .find(f => f.name === fieldName);

      if (!field?.suggestion) {
        console.log('[KYB Form Debug] No suggestion mapping found:', {
          fieldName,
          fieldConfig: field,
          timestamp: new Date().toISOString()
        });
        return undefined;
      }

      const suggestion = processSuggestion(fieldName, field.suggestion, companyData);
      console.log('[KYB Form Debug] Final suggestion result:', {
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
      currentStepValidation: currentStepData.every(f => !isEmptyValue(updatedFormData[f.name]))
    });
  };

  // Update getFieldVariant function to properly handle pre-populated fields
  const getFieldVariant = (field: FormField, value: string | undefined) => {
    const isEmpty = isEmptyValue(value);
    const suggestion = getSuggestionForField(field.name);

    // If we have a value that's not empty, show as successful
    if (!isEmpty && value !== undefined) {
      console.log('[Form Debug] Field variant:', {
        fieldName: field.name,
        value,
        variant: 'successful',
        timestamp: new Date().toISOString()
      });
      return 'successful';
    }

    // If we have an AI suggestion and no value yet
    if (suggestion && isEmpty) {
      console.log('[Form Debug] Field variant:', {
        fieldName: field.name,
        hasSuggestion: true,
        variant: 'ai-suggestion',
        timestamp: new Date().toISOString()
      });
      return 'ai-suggestion';
    }

    // Default state for empty fields
    console.log('[Form Debug] Field variant:', {
      fieldName: field.name,
      isEmpty,
      variant: 'default',
      timestamp: new Date().toISOString()
    });
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

  // Load company data
  useEffect(() => {
    let isMounted = true;

    const fetchCompanyData = async () => {
      if (!companyName || !dataInitialized) {  // Changed from initialLoadDone to dataInitialized
        setIsLoading(false);
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
          setIsLoading(false);
        }
      }
    };

    fetchCompanyData();

    return () => {
      isMounted = false;
    };
  }, [companyName, dataInitialized]);  // Updated dependency array to use dataInitialized

  return (
    <div className="space-y-6">
      {isLoading ? (
        <Card className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
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
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-medium">{progress}</span>
                  <span className="text-[#6B7280]">% Complete</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {!isSubmitted && (
              <div className="h-[2px] bg-[#E5E7EB] rounded-full overflow-hidden mb-12">
                <div
                  className="h-full bg-[#4F46E5] transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Step Wizard */}
            {!isSubmitted && (
              <div className="flex items-center justify-between px-2 mb-2">
                {FORM_STEPS.map((step, index) => (
                  <div key={step.map(s => s.name)} className="flex flex-col items-center relative">
                    <div
                      className={`flex items-center justify-center h-7 min-w-[28px] px-2.5 rounded-full border transition-all duration-200
                      ${index === currentStep
                        ? 'border-[#4F46E5] bg-[#4F46E5] text-white shadow-sm'
                        : index < currentStep
                        ? 'border-[#4F46E5] text-[#4F46E5] bg-white'
                        : 'border-[#D1D5DB] text-[#6B7280] bg-white'
                      }`}
                    >
                      <span className="text-sm font-medium leading-none">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    {index < FORM_STEPS.length - 1 && (
                      <div
                        className={`absolute top-3.5 left-[calc(100%_+_4px)] h-[1.5px] transition-all duration-200
                        ${index < currentStep ? 'bg-[#4F46E5]' : 'bg-[#E5E7EB]'}`}
                        style={{ width: 'calc(100% - 40px)' }}
                      />
                    )}
                    <span className="text-xs text-[#6B7280] mt-2.5 text-center w-28 whitespace-nowrap font-medium">
                      {step[0].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-t border-gray-200 my-6" />

          {/* Form Fields Section - Only show when not submitted */}
          {!isSubmitted && (
            <div className="space-y-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{currentStepData[0].label}</h3>
                <p className="text-sm text-muted-foreground">{`Step ${currentStep + 1} of ${FORM_STEPS.length}`}</p>
              </div>

              <div className="space-y-6">
                {currentStepData.map(field => {
                  const value = formData[field.name] || '';
                  const { mainText, tooltipText } = extractTooltipContent(field.question);
                  const variant = getFieldVariant(field, value);
                  const isEmpty = isEmptyValue(value);

                  return (
                    <div key={field.name} className="space-y-3">
                      <div className="flex flex-col gap-1.5 mb-2">
                        <label className="text-sm font-semibold text-foreground">
                          {field.label}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">
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
                      <OriginalFormField
                        type="text"
                        name={field.name}
                        variant={variant}
                        value={value}
                        onChange={(e) => handleFormDataUpdate(field.name, e.target.value)}
                        aiSuggestion={getSuggestionForField(field.name)}
                        onSuggestionClick={() => {
                          const suggestion = getSuggestionForField(field.name);
                          if (suggestion) {
                            handleSuggestionClick(field.name, suggestion);
                          }
                        }}
                        className="mb-4"
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
                className={`${isLastStep ? 'relative after:absolute after:inset-0 after:rounded-md after:border-blue-500 after:animate[ripple_1.5s_ease-in-out_infinite]' : ''}`}
              >
                {isLastStep ? 'Submit' : 'Next'}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );};

export default OnboardingKYBFormPlayground;