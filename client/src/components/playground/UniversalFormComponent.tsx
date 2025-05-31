import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField as OriginalFormField } from "@/components/ui/form-field";
import { ArrowLeft, ArrowRight, HelpCircle, Check, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { unifiedWebSocketService } from "@/services/websocket-unified";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import the form utilities and interfaces
import { 
  FormField,
  formExtractTooltipContent,
  formIsEmptyValue,
  formCalculateProgress,
  formValidateStep,
  formFindFirstIncompleteStep,
  formFindFirstEmptyField,
  formGetStatusFromProgress,
  formProcessSuggestion,
  formSendProgressUpdate,
  formExtractFieldNames,
  formExtractDataFromMetadata
} from "@/utils/formUtils";

// Import form service interfaces
import { FormServiceInterface } from "@/services/formService";
import { 
  kybService, 
  getKybFields, 
  groupKybFieldsBySection, 
  KybField, 
  saveKybProgress, 
  getKybProgress, 
  submitKybForm
} from "@/services/kybService";

// State machine approach for loading states
type FormLoadingState = 
  | { status: 'idle' }
  | { status: 'loading-fields'; requestId?: string }
  | { status: 'loading-data'; requestId?: string; hasFields: boolean }
  | { status: 'ready'; formInitialized: boolean }
  | { status: 'error'; message: string; code: string };

// Define actions for the state machine
type FormLoadingAction = 
  | { type: 'START_LOADING_FIELDS'; requestId?: string }
  | { type: 'FIELDS_LOADED_SUCCESS'; hasFields: boolean; requestId?: string }
  | { type: 'START_LOADING_DATA'; requestId?: string }
  | { type: 'DATA_LOADED_SUCCESS' }
  | { type: 'LOADING_ERROR'; message: string; code: string };

// Reducer function to handle state transitions
function loadingReducer(state: FormLoadingState, action: FormLoadingAction): FormLoadingState {
  console.log('[Loading State Reducer]', { 
    currentState: state.status, 
    action: action.type,
    timestamp: new Date().toISOString() 
  });

  switch (state.status) {
    case 'idle':
      if (action.type === 'START_LOADING_FIELDS') {
        return { status: 'loading-fields', requestId: action.requestId };
      }
      break;
    
    case 'loading-fields':
      if (action.type === 'FIELDS_LOADED_SUCCESS' && 
          (!action.requestId || action.requestId === state.requestId)) {
        return { 
          status: 'loading-data', 
          requestId: action.requestId, 
          hasFields: action.hasFields 
        };
      } else if (action.type === 'LOADING_ERROR') {
        return { 
          status: 'error', 
          message: action.message, 
          code: action.code 
        };
      }
      break;

    case 'loading-data':
      if (action.type === 'DATA_LOADED_SUCCESS') {
        return { 
          status: 'ready', 
          formInitialized: true 
        };
      } else if (action.type === 'LOADING_ERROR') {
        return { 
          status: 'error', 
          message: action.message, 
          code: action.code 
        };
      }
      break;

    case 'ready':
      // Once ready, we only transition to error
      if (action.type === 'LOADING_ERROR') {
        return { 
          status: 'error', 
          message: action.message, 
          code: action.code 
        };
      }
      break;

    case 'error':
      // Allow retrying from error state
      if (action.type === 'START_LOADING_FIELDS') {
        return { 
          status: 'loading-fields', 
          requestId: action.requestId 
        };
      }
      break;
  }

  // If no valid transition, return current state
  return state;
}

// We now use the FormField type imported from formUtils.ts

// Define the form steps based on April 2025 updated KYB requirements
const FORM_STEPS: FormField[][] = [
  // Step 1: Company Profile - Basic information about the company (8 fields)
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
      name: 'companyPhone',
      label: 'Company Phone',
      question: 'What is the company\'s phone number?',
      tooltip: 'The main contact number for business communications'
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
    },
    {
      name: 'priorNames',
      label: 'Previous Company Names',
      question: 'List any names the company has operated under in the past five years.',
      tooltip: 'Include all former legal names and doing-business-as (DBA) names'
    }
  ],
  // Step 2: Governance & Leadership - Information about who controls the company (10 fields)
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
      name: 'contactEmail',
      label: 'Representative Email',
      question: 'What is your email address?',
      tooltip: 'The email of the primary representative completing this form'
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
    },
    {
      name: 'governmentOwnership',
      label: 'Government Ownership',
      question: 'Is the company owned or controlled by a government entity?',
      tooltip: 'Any direct or indirect ownership or control by a government entity',
      field_type: 'BOOLEAN'
    },
    {
      name: 'externalAudit',
      label: 'External Audit',
      question: 'Has the company had a non-financial external audit in the last 18 months?',
      tooltip: 'Audits covering security, compliance, or operational processes',
      field_type: 'BOOLEAN'
    },
    {
      name: 'controlEnvironment',
      label: 'Control Environment',
      question: 'Does the company operate under a single control environment for all services?',
      tooltip: 'Whether all company operations follow a unified set of controls and procedures',
      field_type: 'BOOLEAN'
    }
  ],
  // Step 3: Financial Profile - Financial metrics and information (4 fields)
  [
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
  // Step 4: Operations & Compliance - Operational details and compliance (8 fields)
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
      tooltip: 'Results of sanctions and watchlist screening',
      field_type: 'BOOLEAN'
    },
    {
      name: 'dueDiligence',
      label: 'Due Diligence',
      question: 'What due diligence has been performed?',
      tooltip: 'Summary of completed due diligence processes and findings'
    },
    {
      name: 'investigationsIncidents',
      label: 'Legal Investigations',
      question: 'Has the company or any of its affiliates faced legal or regulatory investigations in the last five years?',
      tooltip: 'Any formal investigations by regulatory bodies, law enforcement, or government agencies',
      field_type: 'BOOLEAN'
    },
    {
      name: 'regulatoryActions',
      label: 'Regulatory Orders',
      question: 'Has the company been issued regulatory orders or been specifically cited for high-risk findings?',
      tooltip: 'Any formal orders, mandates, or citations from regulatory authorities',
      field_type: 'BOOLEAN'
    }
  ]
];

// Define step titles for better organization and user experience
const STEP_TITLES = [
  "Company\nProfile", 
  "Governance &\nLeadership", 
  "Financial\nProfile", 
  "Operations &\nCompliance"
];

// FormReviewPage component for showing the review page
interface FormReviewPageProps {
  formData: Record<string, any>;
  fieldConfigs: Record<string, any>;
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

  // Get company name from the form data
  const companyName = formData.legalEntityName || "your company";
  const [termsAccepted, setTermsAccepted] = useState(true);
  
  // Get the current user name (using email if full name not available)
  const userName = "John Doe"; // Replace with actual user name when available

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
        
        {formEntries.map((entry, index) => (
          <div key={entry.fieldName} className="mb-3 bg-white p-3 border border-gray-100 rounded-md shadow-sm">
            <div className="flex flex-col">
              <p className="text-gray-500 mb-1">
                <span className="font-medium text-gray-600 mr-1">{index + 1}.</span> Q: {entry.question}
              </p>
              <p className="font-semibold text-black flex items-center">
                <Check className="h-4 w-4 mr-1 text-green-600" /> Answer: {entry.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Terms and conditions acceptance section */}
      <div 
        className={`mt-8 mb-6 p-4 rounded-lg border transition-colors ${
          termsAccepted 
            ? "bg-blue-50 border-blue-200" 
            : "bg-gray-50 border-gray-200"
        } cursor-pointer`}
        onClick={() => setTermsAccepted(!termsAccepted)}
      >
        <div className="flex items-start gap-3">
          <div 
            className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded border mt-0.5 transition-colors ${
              termsAccepted 
                ? "bg-blue-600 border-blue-600" 
                : "bg-white border-gray-300"
            }`}
            style={{ minWidth: '20px', minHeight: '20px' }}
          >
            {termsAccepted && <Check className="h-3 w-3 text-white" />}
          </div>
          
          <div className="flex-grow">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Submission Terms</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              I, <span className="font-bold text-black">{userName}</span>, acknowledge that I am an authorized representative of <span className="font-bold text-black">{companyName}</span> and certify 
              that all information provided is accurate and complete to the best of my knowledge. I understand that Invela 
              will use this information to assess accreditation status and calculate risk scores. I grant Invela permission 
              to securely store, process, and verify this data in accordance with industry regulations. I accept full 
              responsibility for any inaccuracies or omissions in the submitted data.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-4 border-t">
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
          disabled={!termsAccepted}
          className={`rounded-lg px-4 transition-all ${
            termsAccepted 
              ? "hover:bg-blue-700 animate-pulse-ring" 
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          Submit
          <Check className="h-4 w-4 ml-1 text-white" />
        </Button>
      </div>
    </Card>
  );
};

// Calculate all field names from the static form steps
const FORM_FIELD_NAMES = FORM_STEPS.reduce((acc, step) => {
  return [...acc, ...step.map(field => field.name)];
}, [] as string[]);

// Create wrapper functions for form validation utilities
const validateCurrentStep = (formData: Record<string, unknown>, step: FormField[]): boolean => {
  return formValidateStep(formData, step);
};

// Reuse the existing form progress calculation 
const calculateProgress = (formData: Record<string, any>, totalFieldCount?: number): number => {
  const fieldNames = FORM_FIELD_NAMES;
  return formCalculateProgress(formData, fieldNames, totalFieldCount);
};

// For suggestions handling
const processSuggestion = (fieldName: string, suggestion: string | undefined, companyData: any): string | undefined => {
  return formProcessSuggestion(fieldName, suggestion, companyData);
};

// For tooltip content extraction
const extractTooltipContent = (text: string): { mainText: string; tooltipText: string | null } => {
  return formExtractTooltipContent(text);
};

// Use the imported isEmptyValue function
const isEmptyValue = formIsEmptyValue;

interface OnboardingKYBFormPlaygroundProps {
  taskId?: number;
  onSubmit?: (formData: Record<string, any>) => void;
  companyName: string;
  companyData?: any;
  savedFormData?: Record<string, any>;
  initialReviewMode?: boolean;
}

// Enhanced debug logging for form data
const logFormDataDebug = (stage: string, data: any) => {
  console.log(`[KYB Form Data Debug] ${stage}:`, {
    timestamp: new Date().toISOString(),
    fieldCount: Object.keys(data || {}).length,
    fields: Object.entries(data || {}).map(([key, value]) => ({
      field: key,
      value,
      isEmpty: formIsEmptyValue(value)
    }))
  });
};

// Using the KYB service for conversion
// We use the KYB service's converter function rather than implementing our own

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
      isEmpty: formIsEmptyValue(value)
    })) : []
  });
};


export const OnboardingKYBFormPlayground = ({
  taskId,
  onSubmit,
  companyName,
  companyData: initialCompanyData,
  savedFormData: initialSavedFormData,
  initialReviewMode = false
}: OnboardingKYBFormPlaygroundProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const unifiedToast = useUnifiedToast();
  const queryClient = useQueryClient();
  const { send } = useUnifiedWebSocket();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(initialReviewMode);
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  
  // Simplified loading state
  // State machine for form loading management
  const [loadingState, dispatchLoading] = useReducer(
    loadingReducer, 
    { status: 'idle' }
  );
  
  const lastProgressRef = useRef<number>(0);
  const lastUpdateRef = useRef(0);
  const suggestionProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const formDataRef = useRef<Record<string, string>>({});
  const formInitializedRef = useRef(false);
  const [dynamicFormSteps, setDynamicFormSteps] = useState<FormField[][]>([]);
  const [fieldConfig, setFieldConfig] = useState<Record<string, FormField>>({});
  
  // Fetch KYB fields from the server
  const { data: kybFields, isLoading: isLoadingFields, error: kybFieldsError } = useQuery({
    queryKey: ['/api/kyb/fields'],
    queryFn: getKybFields,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
  
  // Process KYB fields when they are loaded
  useEffect(() => {
    if (kybFields && kybFields.length > 0) {
      // Convert API fields to form fields
      const formFieldsMap: Record<string, FormField> = {};
      const groupedBySection: Record<string, KybField[]> = groupKybFieldsBySection(kybFields);
      const newFormSteps: FormField[][] = [];
      
      console.log('[KYB Form Debug] Processing API fields:', {
        fieldCount: kybFields.length,
        groups: Object.keys(groupedBySection),
        timestamp: new Date().toISOString()
      });
      
      // Start loading fields using the state machine
      dispatchLoading({ 
        type: 'START_LOADING_FIELDS',
        requestId: Date.now().toString() 
      });
      
      // Process each group into a form step
      Object.entries(groupedBySection).forEach(([groupName, fields]) => {
        const formFields = fields
          .sort((a, b) => a.order - b.order) // Ensure fields are in correct order
          .map(field => {
            const formField = kybService.convertToFormField(field);
            formFieldsMap[field.field_key] = formField;
            return formField;
          });
          
        newFormSteps.push(formFields);
      });
      
      // Update state with processed fields
      setDynamicFormSteps(newFormSteps);
      setFieldConfig(formFieldsMap);
      
      console.log('[KYB Form Debug] Dynamic form steps created:', {
        stepCount: newFormSteps.length,
        fieldCount: Object.keys(formFieldsMap).length,
        stepsBreakdown: newFormSteps.map(step => step.map(f => f.name)),
        timestamp: new Date().toISOString()
      });
      
      // Signal that fields are loaded, transition to loading data state
      dispatchLoading({ 
        type: 'FIELDS_LOADED_SUCCESS', 
        hasFields: true,
        requestId: Date.now().toString() 
      });
      
    } else if (kybFields !== undefined && kybFields.length === 0 && isLoadingFields === false) {
      // If there are no fields but loading is complete, transition to next state
      console.log('[KYB Form Debug] No fields found but loading complete, transitioning state', {
        hasFields: false,
        timestamp: new Date().toISOString()
      });
      dispatchLoading({ 
        type: 'FIELDS_LOADED_SUCCESS', 
        hasFields: false,
        requestId: Date.now().toString() 
      });
    }
  }, [kybFields, isLoadingFields]);

  // Function to find the first incomplete step
  const findFirstIncompleteStep = (formData: Record<string, string>): number => {
    // Use dynamic steps if available, otherwise fallback to static steps
    const steps: FormField[][] = dynamicFormSteps.length > 0 ? dynamicFormSteps : FORM_STEPS;
    
    for (let i = 0; i < steps.length; i++) {
      const step: FormField[] = steps[i];
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

  // Check if we should show the review page directly
  useEffect(() => {
    // Parse URL query parameters to check for review=true
    const urlParams = new URLSearchParams(window.location.search);
    const shouldShowReview = urlParams.get('review') === 'true';
    
    if (shouldShowReview) {
      console.log('[KYB Form Debug] Review mode triggered from URL parameter');
      setIsReviewMode(true);
    }
  }, []);

  // Enhanced extract form data function that uses dynamic fields when available
  const extractFormDataEnhanced = useCallback((metadata: Record<string, any>) => {
    const formData: Record<string, string> = {};
    
    // Get all possible field names - from dynamic fields if available, otherwise from static fields
    let allFieldNames: string[] = FORM_FIELD_NAMES;
    
    if (dynamicFormSteps && dynamicFormSteps.length > 0) {
      allFieldNames = dynamicFormSteps.flatMap((step: FormField[]) => 
        step.map((field: FormField) => field.name)
      );
    }

    console.log('[Form Debug] Extracting form data from metadata (enhanced):', {
      metadataKeys: Object.keys(metadata),
      formFieldNames: allFieldNames,
      usingDynamicFields: dynamicFormSteps && dynamicFormSteps.length > 0,
      timestamp: new Date().toISOString()
    });

    // Extract form data from metadata for all supported field names
    allFieldNames.forEach(fieldName => {
      const value = metadata[fieldName];
      if (!isEmptyValue(value)) {
        formData[fieldName] = String(value).trim();
      }
    });

    return formData;
  }, [dynamicFormSteps]);

  // Effect to initialize form data
  useEffect(() => {
    let mounted = true;

    const initializeFormData = async () => {
      // We want to proceed if we're in loading-data state
      // This is a critical condition - only initialize form data after fields are loaded
      if (loadingState.status !== 'loading-data') {
        console.log('[KYB Form Debug] Not in loading-data state, skipping form data initialization:', loadingState.status);
        return;
      }

      // We're already in loading-data state, no need to dispatch again
      // Just log that we're starting the data initialization process
      console.log('[KYB Form Debug] Starting form data initialization', {
        timestamp: new Date().toISOString()
      });
      
      // Create an empty initial data structure
      let initialData: Record<string, string> = {};

      try {
        // Load saved form data from server if a taskId is provided
        if (taskId) {
          console.log('[KYB Form Debug] Loading form data for task:', taskId);
          
          const response = await fetch(`/api/kyb/progress/${taskId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch task data: ${response.statusText}`);
          }

          const { formData: savedData, progress: savedProgress, status } = await response.json();
          
          // Log what we received
          console.log('[KYB Form Debug] Loaded task data:', {
            taskId,
            hasData: !!savedData,
            dataFields: savedData ? Object.keys(savedData) : [],
            savedProgress,
            status,
            timestamp: new Date().toISOString()
          });

          // Process the form data if it exists
          if (savedData && Object.keys(savedData).length > 0) {
            // Convert all values to strings to ensure consistency
            initialData = Object.entries(savedData).reduce((acc, [key, value]) => {
              if (value !== null && value !== undefined) {
                // Safely convert to string
                acc[key] = String(value);
              }
              return acc;
            }, {} as Record<string, string>);

            // Update progress state
            setProgress(savedProgress || 0);
            lastProgressRef.current = savedProgress || 0;
            
            // Auto-set review mode if task is ready for submission
            if (status && status.toUpperCase() === 'READY_FOR_SUBMISSION') {
              console.log('[KYB Form Debug] Setting review mode due to task status:', status);
              setIsReviewMode(true);
            }
          }
        } 
        // Use initial form data passed as a prop if available
        else if (initialSavedFormData && Object.keys(initialSavedFormData).length > 0) {
          console.log('[KYB Form Debug] Using provided initialSavedFormData');
          
          // Convert all values to strings
          initialData = Object.entries(initialSavedFormData).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>);

          // Calculate and set progress
          const initialProgress = calculateProgress(initialData);
          setProgress(initialProgress);
          lastProgressRef.current = initialProgress;
        }

        if (mounted) {
          // First, update the refs to ensure consistency
          formDataRef.current = initialData;

          // Then update state
          setFormData(initialData);

          // Log successful initialization
          console.log('[KYB Form Debug] Form data initialized successfully:', {
            dataKeys: Object.keys(initialData),
            dataCount: Object.keys(initialData).length,
            timestamp: new Date().toISOString()
          });

          // Mark initialization as complete
          formInitializedRef.current = true;
          
          // Set the current step based on form completion status
          const firstIncompleteStep = findFirstIncompleteStep(initialData);
          console.log('[KYB Form Debug] Setting initial step:', {
            step: firstIncompleteStep,
            timestamp: new Date().toISOString()
          });
          setCurrentStep(firstIncompleteStep);
          
          // Mark loading as complete - AFTER all state is set
          dispatchLoading({ 
            type: 'DATA_LOADED_SUCCESS' 
          });
        }
      } catch (error) {
        console.error('Error initializing form:', error);
        if (mounted) {
          // Show error to user
          unifiedToast.error("Failed to load form data");
          
          // Set a basic empty form data to prevent undefined errors
          setFormData({});
          formDataRef.current = {};
          
          // Mark loading as failed but allow interaction with form
          dispatchLoading({ 
            type: 'LOADING_ERROR', 
            message: 'Form initialization failed', 
            code: 'INIT_FAILED' 
          });
        }
      }
    };

    // Only run initialization when in loading-data state (not loading-fields)
    // This ensures we don't try to initialize data before fields are loaded
    if (loadingState.status === 'loading-data') {
      console.log('[KYB Form Debug] Initializing form data in loading-data state:', loadingState.status);
      initializeFormData();
    }

    return () => {
      mounted = false;
    };
  // We don't want to include loadingState.status in dependencies as it will create a loop
  // Instead, we use the check in the effect body to run initialization when appropriate
  }, [taskId, initialSavedFormData, calculateProgress, extractFormDataEnhanced, kybFields]);

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

      await send('task_updated', {
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

      unifiedToast.error("Failed to save progress. Please try again.");
    }
  };

  const handleBack = () => {
    if (isReviewMode) {
      // Exit review mode and go back to form
      setIsReviewMode(false);
      return;
    }
    
    if (currentStep > 0) {
      setCurrentStep(current => current - 1);
    }
  };

  const handleNext = () => {
    console.log('[KYB Form Debug] Navigation Event: Next button clicked');
    
    if (isReviewMode) {
      // From review mode, submit the form
      console.log('Form submitted from review page:', formData);
      if (onSubmit) {
        onSubmit(formData);
      }
      setIsSubmitted(true);
      return;
    }
    
    // Use dynamic steps length if available, otherwise fallback to static steps
    const maxSteps = dynamicFormSteps.length > 0 ? dynamicFormSteps.length - 1 : FORM_STEPS.length - 1;
    
    if (currentStep < maxSteps) {
      setCurrentStep(current => current + 1);
    } else {
      // Last step completed, go to review mode instead of submitting
      setIsReviewMode(true);
    }
  };
  
  const handleSubmit = () => {
    console.log('Form submitted after review:', formData);
    if (onSubmit) {
      onSubmit(formData);
    }
    setIsSubmitted(true);
  };

  // Use dynamic form steps if available, otherwise fall back to static steps
  const currentStepData: FormField[] = dynamicFormSteps.length > 0 && dynamicFormSteps[currentStep] 
    ? dynamicFormSteps[currentStep] 
    : FORM_STEPS[currentStep];
    
  const isLastStep: boolean = dynamicFormSteps.length > 0 
    ? currentStep === dynamicFormSteps.length - 1
    : currentStep === FORM_STEPS.length - 1;

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
      // First check if we have the field in our field config (from API)
      const dynamicField = fieldConfig[fieldName];
      
      // If found in dynamic config, use it
      if (dynamicField) {
        if (!dynamicField.suggestion) {
          console.log('[KYB Form Debug] No suggestion mapping found in dynamic field:', {
            fieldName,
            fieldConfig: dynamicField,
            timestamp: new Date().toISOString()
          });
          return undefined;
        }
        
        const suggestion = processSuggestion(fieldName, dynamicField.suggestion, companyData);
        console.log('[KYB Form Debug] Dynamic field suggestion result:', {
          fieldName,
          suggestion,
          timestamp: new Date().toISOString()
        });
        
        return suggestion;
      }
      
      // Fall back to static field definitions if not found in dynamic config
      const staticField = FORM_STEPS
        .flatMap(step => step)
        .find(f => f.name === fieldName);
      
      if (!staticField?.suggestion) {
        console.log('[KYB Form Debug] No suggestion mapping found in static field:', {
          fieldName,
          fieldConfig: staticField,
          timestamp: new Date().toISOString()
        });
        return undefined;
      }

      const suggestion = processSuggestion(fieldName, staticField.suggestion, companyData);
      console.log('[KYB Form Debug] Static field suggestion result:', {
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
      // Only fetch company data if form is properly initialized and we have a company name
      if (!companyName || loadingState.status !== 'ready') {
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        console.log('[KYB Form Debug] Starting company search:', {
          companyName,
          formLoadingState: loadingState.status,
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
        }
      }
    };

    fetchCompanyData();

    return () => {
      isMounted = false;
    };
  }, [companyName, loadingState.status]);

  // Update renderField function to handle multiple choice fields
  const renderField = (field: FormField) => {
    // Only render fields when the form is ready and initialized
    if (loadingState.status !== 'ready') return null;

    const fieldValue = formData[field.name];
    const value = fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '';

    console.log('[Form Debug] Rendering field:', {
      fieldName: field.name,
      rawValue: fieldValue,
      processedValue: value,
      fieldType: field.field_type,
      formDataKeys: Object.keys(formData),
      isReady: loadingState.status === 'ready',
      timestamp: new Date().toISOString()
    });

    const { mainText, tooltipText } = extractTooltipContent(field.question);
    const variant = getFieldVariant(field, value);

    // Return dropdown/select for multiple choice fields
    if (field.field_type === 'MULTIPLE_CHOICE' && field.options) {
      const isSelected = !isEmptyValue(value);
      return (
        <div key={field.name} className="space-y-2 py-1">
          <div className="flex flex-col gap-0.5 mb-1">
            <label className="text-sm font-medium text-gray-500">
              {field.label}
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-black">
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
      <div key={field.name} className="space-y-2 py-1">
        <div className="flex flex-col gap-0.5 mb-1">
          <label className="text-sm font-medium text-gray-500">
            {field.label}
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-black">
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
      {loadingState.status !== 'ready' ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
            <div className="text-sm text-muted-foreground">
              {loadingState.status === 'loading-fields' ? "Loading form fields..." : 
               loadingState.status === 'loading-data' ? "Loading saved data..." : 
               "Initializing form..."}
            </div>
          </div>
        </Card>
      ) : isReviewMode ? (
        <FormReviewPage
          formData={formData}
          fieldConfigs={Object.keys(fieldConfig).length > 0 ? fieldConfig : FORM_STEPS.flat().reduce((acc, field) => {
            acc[field.name] = field;
            return acc;
          }, {} as Record<string, FormField>)}
          onBack={handleBack}
          onSubmit={handleSubmit}
        />
      ) : (
        <div>
          {/* Header Section - Outside Card */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-grow mr-4">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold">KYB Form: {companyName}</h2>
                  <div className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                    isSubmitted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isSubmitted ? 'COMPLETED' : 'IN PROGRESS'}
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Complete the Know Your Business (KYB) form to establish your business profile. This information is required for regulatory compliance and risk assessment.
                </p>
              </div>
              {!isSubmitted && (
                <div className="flex items-center text-base bg-gray-50 px-4 py-2 rounded-md shadow-sm min-w-[160px] justify-center whitespace-nowrap">
                  <span className="font-medium text-lg mr-1">{progress}%</span>
                  <span className="text-[#6B7280] font-medium">Complete</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {!isSubmitted && (
              <div className="h-[10px] bg-[#E5E7EB] rounded-full overflow-hidden mb-8">
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%`, backgroundColor: '#4965EC' }}
                />
              </div>
            )}

            {/* Step Wizard */}
            {!isSubmitted && (
              <div className="flex justify-start px-0 mb-4 gap-6">
                {(dynamicFormSteps.length > 0 ? dynamicFormSteps : FORM_STEPS).map((step, index) => {
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
                  // 3. It's the next available step AND the current step is valid
                  // 4. The prior step is completed (for skipping to future steps)
                  // 5. The form is 100% complete
                  const isNextStep = index === currentStep + 1;
                  const isPriorStepCompleted = index > 0 && 
                    (dynamicFormSteps.length > 0 ? dynamicFormSteps : FORM_STEPS)[index-1].map(field => field.name)
                      .every(fieldName => formData && formData[fieldName] && 
                        (formData[fieldName].toString?.().trim() !== '' || 
                         typeof formData[fieldName] === 'boolean'));
                  
                  const isClickable = hasProgress || 
                                     index <= currentStep || 
                                     (isNextStep && isCurrentStepValid) || 
                                     isPriorStepCompleted ||
                                     progress === 100;
                  
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
                  
                  // Determine step title based on the group
                  let stepTitle = STEP_TITLES[index];
                  
                  // If using dynamic form steps, get the step title from the first field's group
                  if (dynamicFormSteps.length > 0 && step.length > 0) {
                    // Get the first field in the step which should have its group set
                    const firstField = step[0];
                    
                    if (firstField && firstField.name) {
                      // Find corresponding field in kybFields
                      const kybField = kybFields?.find(f => f.field_key === firstField.name);
                      
                      if (kybField) {
                        // Normalize the group name for display
                        const group = kybField.group;
                        stepTitle = group
                          // Convert camelCase to Title Case with spaces
                          .replace(/([A-Z])/g, ' $1')
                          // Capitalize first letter
                          .replace(/^./, str => str.toUpperCase());
                      }
                    }
                  }
                  
                  return (
                    <div 
                      key={step[0].name} 
                      className={`flex flex-col items-center justify-center relative py-2 px-3 w-[250px] ${
                        isClickable ? 'cursor-pointer group' : 'cursor-not-allowed'
                      }`}
                      onClick={() => {
                        // Allow clicking to navigate to a step if:
                        // 1. It's a completed step or the current step
                        // 2. It's the next step and the current step is valid
                        // 3. Its prior step is fully completed
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
                        className="flex items-center justify-center h-10 w-10 rounded-lg border-2 shadow-sm transition-all duration-200 z-10"
                        style={{
                          borderColor: squircleColor,
                          backgroundColor: isCompleted || isCurrent ? squircleColor : 'white',
                          color: isCompleted || isCurrent ? 'white' : squircleColor
                        }}
                      >
                        {isCompleted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                        className="text-sm mt-3 text-center w-full mx-auto min-h-[40px] whitespace-pre-line font-bold transition-colors duration-200 z-10 px-4"
                        style={{ color: textColor }}
                      >
                        {stepTitle}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Fields Section - Only show when not submitted */}
          {!isSubmitted && (
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="space-y-5">
                {currentStepData.map(renderField)}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            {!isSubmitted && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="rounded-lg px-5 py-2 transition-all hover:bg-gray-50 text-gray-700 border-gray-200"
              >
                {currentStep > 0 && <ArrowLeft className="h-4 w-4 mr-2" />}
                Back
              </Button>
            )}
            {isSubmitted ? (
              <div className="ml-auto">
                <Button
                  disabled
                  className="bg-green-600 hover:bg-green-600 text-white rounded-lg px-5 py-2 shadow-sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Submitted
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid}
                className="rounded-lg px-5 py-2 hover:bg-blue-700 transition-all shadow-sm"
                style={{ transform: 'none' }}
              >
                {isLastStep ? 'Final Review' : 'Next'}
                {!isLastStep && <ArrowRight className="h-4 w-4 ml-2" />}
                {isLastStep && <Eye className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingKYBFormPlayground;