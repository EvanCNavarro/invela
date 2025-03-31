import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField as OriginalFormField } from "@/components/ui/form-field";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { wsService } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Update the field type to include suggestion
type FormField = {
  name: string;
  label: string;
  question: string;
  tooltip: string;
  suggestion?: string;
  field_type?: string;
  options?: string[];
};

// Function to extract tooltip content from question text
const extractTooltipContent = (text: string): { mainText: string; tooltipText: string | null } => {
  // The main text is the question itself
  const mainText = text;
  // The tooltip text comes from the tooltip property directly
  return {
    mainText,
    tooltipText: null // We don't need to parse the question since we have a separate tooltip field
  };
};

// Define the form steps based on updated KYB requirements with 4 more balanced steps
const FORM_STEPS: FormField[][] = [
  // Step 1: Company Profile - Basic information about the company
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
      tooltip: 'Issued by Corporations Canada or the relevant state authority'
    },
    {
      name: 'incorporationDate',
      label: 'Incorporation Date',
      question: 'When was the company incorporated?',
      tooltip: 'The official date when the business was legally incorporated',
      field_type: 'DATE'
    },
    {
      name: 'registeredAddress',
      label: 'Registered Business Address',
      question: 'What is the registered business address?',
      tooltip: 'The official registered address where the business operates',
      suggestion: 'hq_address'
    },
    {
      name: 'businessType',
      label: 'Business Type',
      question: 'What type of business entity is this?',
      tooltip: 'Options include: corporation, limited liability company (LLC), partnership, or other forms',
      suggestion: 'legal_structure'
    },
    {
      name: 'jurisdiction',
      label: 'Jurisdiction',
      question: 'In which jurisdiction is the company registered?',
      tooltip: 'The jurisdiction where the business is legally registered',
      suggestion: 'hq_address'
    }
  ],
  // Step 2: Governance & Leadership - Information about who controls the company and its legal standing
  [
    {
      name: 'directorsAndOfficers',
      label: 'Directors and Officers',
      question: 'Who are the current directors and officers?',
      tooltip: 'Include full legal names and positions of all directors and officers',
      suggestion: 'founders_and_leadership'
    },
    {
      name: 'ultimateBeneficialOwners',
      label: 'Ultimate Beneficial Owners',
      question: 'Who are the ultimate beneficial owners?',
      tooltip: 'Individuals who own 25% or more of the company, directly or indirectly',
      suggestion: 'investors'
    },
    {
      name: 'authorizedSigners',
      label: 'Authorized Signers',
      question: 'Who are the authorized signers for the company?',
      tooltip: 'Individuals with legal authority to sign on behalf of the company',
      suggestion: 'founders_and_leadership'
    },
    {
      name: 'corporateRegistration',
      label: 'Corporate Registration',
      question: 'Can you provide corporate registration details?',
      tooltip: 'Official registration documents and identification numbers'
    },
    {
      name: 'goodStanding',
      label: 'Good Standing',
      question: 'Is the company in good standing with regulatory authorities?',
      tooltip: 'Current compliance status with relevant regulatory bodies',
      field_type: 'BOOLEAN'
    },
    {
      name: 'licenses',
      label: 'Licenses',
      question: 'What licenses and permits does the company hold?',
      tooltip: 'All current business licenses and regulatory permits'
    }
  ],
  // Step 3: Financial Profile - Financial metrics and tax information
  [
    {
      name: 'taxId',
      label: 'Tax ID',
      question: 'What is the company\'s tax identification number?',
      tooltip: 'EIN in the U.S. or equivalent tax ID in other jurisdictions'
    },
    {
      name: 'taxReceipts',
      label: 'Tax Receipts',
      question: 'Please provide the company\'s most recent tax receipts or fiscal year tax filings.',
      tooltip: 'Most recent fiscal year tax documentation'
    },
    {
      name: 'annualRecurringRevenue',
      label: 'Annual Recurring Revenue',
      question: 'What is the company\'s most recent Annual Recurring Revenue (ARR)?',
      tooltip: 'Select the appropriate revenue range for your company',
      field_type: 'MULTIPLE_CHOICE',
      options: [
        'Less than $1 million',
        '$1 million - $10 million',
        '$10 million - $50 million',
        'Greater than $50 million'
      ]
    },
    {
      name: 'monthlyRecurringRevenue',
      label: 'Monthly Recurring Revenue',
      question: 'What is the company\'s most recent Monthly Recurring Revenue (MRR)?',
      tooltip: 'Current monthly recurring revenue figure'
    },
    {
      name: 'marketCapitalization',
      label: 'Market Capitalization',
      question: 'What is the company\'s current market capitalization?',
      tooltip: 'Current market value of the company\'s shares'
    },
    {
      name: 'lifetimeCustomerValue',
      label: 'Lifetime Customer Value',
      question: 'What is the company\'s average Lifetime Customer Value (LCV)?',
      tooltip: 'Average revenue generated by a customer over the entire relationship'
    }
  ],
  // Step 4: Operations & Compliance - Operational details and compliance information
  [
    {
      name: 'financialStatements',
      label: 'Financial Statements',
      question: 'Can you provide recent financial statements?',
      tooltip: 'Recent audited financial statements or documentation'
    },
    {
      name: 'operationalPolicies',
      label: 'Operational Policies',
      question: 'What are the key operational policies?',
      tooltip: 'Documentation of core business and operational procedures'
    },
    {
      name: 'dataVolume',
      label: 'Data Volume',
      question: 'How much data does the company currently manage?',
      tooltip: 'Total volume of data managed by the company'
    },
    {
      name: 'dataTypes',
      label: 'Data Types',
      question: 'Which types of data does the company need access to?',
      tooltip: 'Categories and types of data required for operations'
    },
    {
      name: 'sanctionsCheck',
      label: 'Sanctions Check',
      question: 'Has sanctions screening been completed?',
      tooltip: 'Results of sanctions and watchlist screening'
    },
    {
      name: 'dueDiligence',
      label: 'Due Diligence',
      question: 'What due diligence has been performed?',
      tooltip: 'Summary of completed due diligence processes and findings'
    }
  ]
];

// Define step titles for better organization and user experience
const STEP_TITLES = [
  "Company Profile", 
  "Governance & Leadership", 
  "Financial Profile", 
  "Operations & Compliance"
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

  // Get the raw value from company data
  const value = companyData[suggestion];
  
  // Format the value based on its type
  let processedValue = '';
  
  if (Array.isArray(value)) {
    // If it's an array, join it with commas
    processedValue = value.join(', ');
  } else if (typeof value === 'string') {
    // If it's a string that looks like a JSON array, clean it up
    if (value.startsWith('{') && value.includes('","')) {
      try {
        // Try to parse as array-like string: {"item1","item2"}
        const cleanedJson = value
          .replace(/^\{/, '[')  // Replace opening {
          .replace(/\}$/, ']')  // Replace closing }
          .replace(/\\"/g, '"'); // Replace escaped quotes
        
        // Parse the modified JSON
        const parsed = JSON.parse(cleanedJson);
        
        // Join the array with commas
        if (Array.isArray(parsed)) {
          processedValue = parsed.join(', ');
        } else {
          processedValue = String(value);
        }
      } catch (e) {
        // If parsing fails, just clean up the JSON-like format
        processedValue = value
          .replace(/^\{"|"\}$/g, '')  // Remove {"..."} wrapping
          .replace(/\\"/g, '"')        // Replace escaped quotes
          .replace(/","/, ', ');       // Replace "," with comma and space
      }
    } else {
      // Regular string
      processedValue = String(value);
    }
  } else {
    // Other types (number, boolean, etc.)
    processedValue = String(value);
  }

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
  const [isLoading, setIsLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const lastProgressRef = useRef<number>(0);
  const lastUpdateRef = useRef(0);
  const suggestionProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const formDataRef = useRef<Record<string, string>>({});
  const isCompanyDataLoading = useState(false);

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

  // Effect to initialize form data
  useEffect(() => {
    let mounted = true;

    const initializeFormData = async () => {
      setIsLoading(true);
      let initialData: Record<string, string> = {};

      try {
        if (taskId) {
          const response = await fetch(`/api/kyb/progress/${taskId}`);
          if (!response.ok) throw new Error('Failed to fetch task data');

          const { formData: savedData, progress: savedProgress } = await response.json();
          console.log('[KYB Form Debug] Loaded task data:', {
            taskId,
            hasData: !!savedData,
            fields: savedData ? Object.keys(savedData) : [],
            timestamp: new Date().toISOString()
          });

          if (savedData) {
            initialData = Object.entries(savedData).reduce((acc, [key, value]) => {
              if (value !== null && value !== undefined) {
                acc[key] = String(value);
              }
              return acc;
            }, {} as Record<string, string>);

            setProgress(savedProgress);
            lastProgressRef.current = savedProgress;
          }
        } else if (initialSavedFormData) {
          initialData = Object.entries(initialSavedFormData).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>);

          const initialProgress = calculateProgress(initialData);
          setProgress(initialProgress);
          lastProgressRef.current = initialProgress;
        }

        if (mounted) {
          // First, update the refs
          formDataRef.current = initialData;

          // Then set the state
          setFormData(initialData);

          console.log('[KYB Form Debug] Form data initialized:', {
            dataKeys: Object.keys(initialData),
            values: Object.values(initialData),
            timestamp: new Date().toISOString()
          });

          // Set initialization flags
          setDataInitialized(true);
          setFormReady(true);

          // Finally set the current step
          setCurrentStep(findFirstIncompleteStep(initialData));
        }
      } catch (error) {
        console.error('Error initializing form:', error);
        if (mounted) {
          toast({
            title: "Error",
            description: "Failed to load form data",
            variant: "destructive"
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeFormData();

    return () => {
      mounted = false;
    };
  }, [taskId, initialSavedFormData]);

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
        [fieldName]: value
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
              value: value,
              status: isEmptyValue(value) ? 'EMPTY' : 'COMPLETE',
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

  // Update getFieldVariant function to properly handle dropdown fields
  const getFieldVariant = (field: FormField, value: string | undefined) => {
    const isEmpty = isEmptyValue(value);
    const suggestion = getSuggestionForField(field.name);

    // If we have a value that's not empty, show as successful
    if (!isEmpty && value !== undefined) {
      console.log('[Form Debug] Field variant:', {
        fieldName: field.name,
        value,
        variant: 'successful',
        fieldType: field.field_type,
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
      if (!companyName || !dataInitialized) {
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
  }, [companyName, dataInitialized]);

  // Update renderField function to handle multiple choice fields
  const renderField = (field: FormField) => {
    if (!formReady) return null;

    const fieldValue = formData[field.name];
    const value = fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '';

    console.log('[Form Debug] Rendering field:', {
      fieldName: field.name,
      rawValue: fieldValue,
      processedValue: value,
      fieldType: field.field_type,
      formDataKeys: Object.keys(formData),
      isReady: formReady,
      timestamp: new Date().toISOString()
    });

    const { mainText, tooltipText } = extractTooltipContent(field.question);
    const variant = getFieldVariant(field, value);

    // Return dropdown/select for multiple choice fields
    if (field.field_type === 'MULTIPLE_CHOICE' && field.options) {
      const isSelected = !isEmptyValue(value);
      return (
        <div key={field.name} className="space-y-2">
          <div className="flex flex-col gap-1 mb-1">
            <label className="text-sm font-semibold text-foreground">
              {field.label}
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {mainText}
              </span>
              {field.tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{field.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <Select
            value={value}
            onValueChange={(newValue) => handleFormDataUpdate(field.name, newValue)}
          >
            <SelectTrigger className={`w-full ${isSelected ? 'border-green-500' : ''}`}>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Original input field rendering for text fields
    return (
      <div key={field.name} className="space-y-2">
        <div className="flex flex-col gap-1 mb-1">
          <label className="text-sm font-semibold text-foreground">
            {field.label}
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {mainText}
            </span>
            {field.tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
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
          className="mb-0"
        />
      </div>
    );
  };

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
              </div>
              {!isSubmitted && (
                <div className="flex items-center gap-1 text-base">
                  <span className="font-medium text-lg">{progress}</span>
                  <span className="text-[#6B7280] font-medium">% Complete</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {!isSubmitted && (
              <div className="h-[4px] bg-[#E5E7EB] rounded-full overflow-hidden mb-4">
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%`, backgroundColor: '#4965EC' }}
                />
              </div>
            )}

            {/* Step Wizard */}
            {!isSubmitted && (
              <div className="flex justify-between px-2 mb-4 mx-auto max-w-[700px]">
                {FORM_STEPS.map((step, index) => {
                  // Check if ALL fields in this step are completed
                  const stepFields = step.map(field => field.name);
                  const stepCompleted = stepFields.every(fieldName => 
                    formData && formData[fieldName] && formData[fieldName].toString().trim() !== '');
                  
                  // Check if ANY fields in this step have values
                  const hasProgress = stepFields.some(fieldName => 
                    formData && formData[fieldName] && formData[fieldName].toString().trim() !== '');
                  
                  // Determine colors and status
                  const isCompleted = stepCompleted;
                  const isCurrent = index === currentStep;
                  
                  // Step should be clickable if:
                  // 1. It has any progress at all
                  // 2. It's the current step or any previous step
                  // 3. It's the next available step
                  // 4. The form is 100% complete
                  const isClickable = hasProgress || index <= currentStep + 1 || progress === 100;
                  
                  // Color scheme
                  const squircleColor = isCompleted 
                    ? '#209C5A' // Green for completed
                    : isCurrent 
                      ? '#4965EC' // Blue for current step
                      : '#6B7280'; // Dark grey for incomplete
                  
                  const textColor = isCompleted 
                    ? '#209C5A' 
                    : isCurrent 
                      ? '#4965EC' 
                      : '#6B7280';
                  
                  return (
                    <div 
                      key={step[0].name} 
                      className={`flex flex-col items-center justify-center relative py-2 px-3 w-1/4 ${
                        isClickable ? 'cursor-pointer group' : 'cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (isClickable) {
                          setCurrentStep(index);
                        }
                      }}
                    >
                      {/* Current step background */}
                      {isCurrent && (
                        <div className="absolute inset-0 rounded-lg bg-gray-100/80" />
                      )}
                      
                      {/* Button-like hover effect */}
                      {isClickable && !isCurrent && (
                        <div className="absolute inset-0 rounded-lg bg-gray-100/0 group-hover:bg-gray-100/60 transition-all duration-200" />
                      )}
                      
                      {/* Step indicator squircle */}
                      <div
                        className="flex items-center justify-center h-9 w-9 rounded-lg border-2 transition-all duration-200 z-10"
                        style={{
                          borderColor: squircleColor,
                          backgroundColor: isCurrent ? squircleColor : 'white',
                          color: isCurrent ? 'white' : squircleColor
                        }}
                      >
                        {isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <span className="text-sm font-bold leading-none">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        )}
                      </div>

                      {/* Step label with better wrapping */}
                      <div 
                        className="text-xs mt-3 text-center w-full mx-auto min-h-[36px] whitespace-pre-line font-bold transition-colors duration-200 z-10"
                        style={{ color: textColor }}
                      >
                        {STEP_TITLES[index].includes(' ') 
                          ? STEP_TITLES[index].split(' ').length > 2 
                            ? STEP_TITLES[index] 
                            : STEP_TITLES[index].replace(' ', '\n')
                          : STEP_TITLES[index]
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-t-2 border-dashed border-spacing-x-4 border-gray-300 mt-1 mb-5" style={{ borderWidth: '2px', borderSpacing: '1rem' }} />

          {/* Form Fields Section - Only show when not submitted */}
          {!isSubmitted && (
            <div className="space-y-4">
              <div className="space-y-4">
                {currentStepData.map(renderField)}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            {!isSubmitted && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="rounded-lg px-4 transition-all hover:bg-gray-100"
              >
                {currentStep > 0 && <ArrowLeft className="h-4 w-4 mr-1" />}
                Back
              </Button>
            )}
            {isSubmitted ? (
              <div className="ml-auto">
                <Button
                  disabled
                  className="bg-green-600 hover:bg-green-600 text-white rounded-lg px-4"
                >
                  Submitted
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid}
                className={`rounded-lg px-4 hover:bg-blue-700 transition-all ${isLastStep ? 'relative after:absolute after:inset-0 after:rounded-lg after:border-blue-500 after:animate-[ripple_1.5s_ease-in-out_infinite]' : ''}`}
              >
                {isLastStep ? 'Submit' : 'Next'}
                {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default OnboardingKYBFormPlayground;