import { useState, useEffect, useRef, useCallback } from "react";
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
import { wsService } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedToast } from "@/hooks/use-unified-toast";
import { getKybFields, getKybFieldsByStepIndex, KybField, saveKybProgress, getKybProgress, groupKybFieldsBySection } from "@/services/kybService";
import { Badge } from "@/components/ui/badge";
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

// Simplified empty value check
const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Update progress calculation logging
// This version doesn't try to access dynamicFormSteps outside the component
const calculateProgress = (formData: Record<string, any>, totalFieldCount?: number, customFieldNames?: string[]) => {
  // If formData is undefined or null, return 0
  if (!formData) return 0;
  
  // Use provided custom field names or fall back to static field names
  const fieldNames = customFieldNames || FORM_FIELD_NAMES;
  
  // Calculate total fields count
  const totalFieldsCount = fieldNames.length;
  
  console.log('[Progress Debug] Starting progress calculation:', {
    timestamp: new Date().toISOString(),
    formDataKeys: Object.keys(formData),
    fieldNamesSource: customFieldNames ? 'dynamic' : 'static',
    totalFields: totalFieldCount || totalFieldsCount,
    fieldCount: fieldNames.length
  });

  const filledFields = fieldNames.filter(fieldName => {
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

  // Use provided total field count or calculate from fields
  const totalFields = totalFieldCount || totalFieldsCount;
  const progress = Math.round((filledFields / totalFields) * 100);
  console.log('[Progress Debug] Final calculation:', {
    filledFields,
    totalFields,
    progress,
    timestamp: new Date().toISOString()
  });
  return progress;
};

// Helper function to filter out non-form fields from metadata - basic version
const extractFormData = (metadata: Record<string, any>) => {
  const formData: Record<string, string> = {};

  console.log('[Form Debug] Extracting form data from metadata (basic):', {
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
      isEmpty: isEmptyValue(value)
    }))
  });
};

// Convert KybField from database to FormField format for the form
const convertKybFieldToFormField = (field: KybField): FormField => {
  // Map field types from database to form component
  let fieldType: string | undefined = undefined;
  let options: string[] | undefined = undefined;

  if (field.field_type === 'BOOLEAN') {
    fieldType = 'BOOLEAN';
  } else if (field.field_type === 'DATE') {
    fieldType = 'DATE';
  } else if (field.field_type === 'MULTIPLE_CHOICE') {
    fieldType = 'MULTIPLE_CHOICE';
    // Try to parse options from validation_rules if available
    if (field.validation_rules && typeof field.validation_rules === 'object') {
      const rules = field.validation_rules as any;
      if (rules.options && Array.isArray(rules.options)) {
        options = rules.options;
      }
    }
    // Default options if none are specified
    if (!options || options.length === 0) {
      options = [
        'Less than $1 million',
        '$1 million - $10 million',
        '$10 million - $50 million',
        'Greater than $50 million'
      ];
    }
  }

  return {
    name: field.field_key,
    label: field.display_name,
    question: field.question,
    tooltip: field.help_text || '',
    field_type: fieldType,
    options: options
  };
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
  savedFormData: initialSavedFormData,
  initialReviewMode = false
}: OnboardingKYBFormPlaygroundProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const unifiedToast = useUnifiedToast();
  const queryClient = useQueryClient();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(initialReviewMode);
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
  // Initialize dynamicFormSteps with empty arrays for each step to ensure consistent structure
  const [dynamicFormSteps, setDynamicFormSteps] = useState<FormField[][]>(() => {
    // Create an array with the same length as FORM_STEPS with separate empty arrays for each step
    console.log('[KYB Form Debug] INITIALIZATION: Creating empty placeholder steps array', {
      staticStepsCount: FORM_STEPS.length,
      timestamp: new Date().toISOString()
    });
    // Using map to create separate empty array instances for each step
    return Array(FORM_STEPS.length).fill(null).map(() => []);
  });
  const [fieldConfig, setFieldConfig] = useState<Record<string, FormField>>({});
  
  // Fetch all KYB fields to have them available for reference
  const { data: allKybFields, isLoading: isLoadingAllFields, error: allKybFieldsError } = useQuery({
    queryKey: ['/api/kyb/fields'],
    queryFn: getKybFields,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
  
  // Fetch KYB fields for the current step by step_index
  const { data: kybFields, isLoading: isLoadingFields, error: kybFieldsError } = useQuery({
    queryKey: ['/api/form-fields/company_kyb', currentStep],
    queryFn: () => getKybFieldsByStepIndex(currentStep),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !isSubmitted, // Only fetch if form is not submitted yet
  });
  
  // Process KYB fields when they are loaded
  useEffect(() => {
    if (kybFields && kybFields.length > 0) {
      // Convert API fields to form fields
      const formFieldsMap: Record<string, FormField> = {};
      
      // We're now getting fields specifically for the current step
      // So we don't need to group them by section, we can just process them directly
      const formFields = kybFields
        .sort((a, b) => a.order - b.order) // Ensure fields are in correct order
        .map(field => {
          const formField = convertKybFieldToFormField(field);
          formFieldsMap[field.field_key] = formField;
          return formField;
        });
      
      console.log('[KYB Form Debug] Processing step-based API fields:', {
        stepIndex: currentStep,
        fieldCount: kybFields.length,
        fieldNames: kybFields.map(f => f.field_key),
        timestamp: new Date().toISOString()
      });
      
      // Update state with processed fields
      setDynamicFormSteps(prevSteps => {
        // Make a copy of the previous steps
        const updatedSteps = [...prevSteps];
        
        // Update the step for the current index
        updatedSteps[currentStep] = formFields;
        
        console.log('[KYB Form Debug] Updating dynamicFormSteps:', {
          currentStep,
          previousStepsCount: prevSteps.length,
          updatedStepsCount: updatedSteps.length,
          updatedCurrentStepFieldCount: formFields.length,
          allSteps: updatedSteps.map((step, idx) => ({
            stepIndex: idx,
            fieldCount: step ? step.length : 0,
            fieldNames: step ? step.map(f => f.name) : []
          })),
          timestamp: new Date().toISOString()
        });
        
        return updatedSteps;
      });
      
      // Update the field config
      setFieldConfig(prevConfig => ({
        ...prevConfig,
        ...formFieldsMap
      }));
      
      console.log('[KYB Form Debug] Updated step fields:', {
        stepIndex: currentStep,
        fieldsUpdated: formFields.length,
        fieldNames: formFields.map(f => f.name),
        timestamp: new Date().toISOString()
      });
    }
  }, [kybFields, currentStep]);

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
      setIsLoading(true);
      let initialData: Record<string, string> = {};

      try {
        if (taskId) {
          const response = await fetch(`/api/kyb/progress/${taskId}`);
          if (!response.ok) throw new Error('Failed to fetch task data');

          const { formData: savedData, progress: savedProgress, status } = await response.json();
          console.log('[KYB Form Debug] Loaded task data:', {
            taskId,
            hasData: !!savedData,
            fields: savedData ? Object.keys(savedData) : [],
            status,
            timestamp: new Date().toISOString()
          });

          if (savedData) {
            // Use enhanced form data extraction that supports dynamic fields
            initialData = Object.entries(savedData).reduce((acc, [key, value]) => {
              if (value !== null && value !== undefined) {
                acc[key] = String(value);
              }
              return acc;
            }, {} as Record<string, string>);

            setProgress(savedProgress);
            lastProgressRef.current = savedProgress;
            
            // Auto-set review mode if task is ready for submission
            if (status && status.toUpperCase() === 'READY_FOR_SUBMISSION') {
              console.log('[KYB Form Debug] Setting review mode due to task status:', status);
              setIsReviewMode(true);
            }
          }
        } else if (initialSavedFormData) {
          // Use enhanced extraction with dynamic fields support
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
          unifiedToast.error("Failed to load form data");
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
  }, [taskId, initialSavedFormData, calculateProgress, extractFormDataEnhanced]);

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
  
  // Add effect to handle step changes
  useEffect(() => {
    console.log('[KYB Form Debug] Step changed:', {
      currentStep,
      fieldsLoaded: kybFields ? kybFields.length : 0,
      formReady,
      dynamicStepsCount: dynamicFormSteps.length,
      timestamp: new Date().toISOString()
    });
    
    // Check if we already have step data for the current step
    // If not, fetch it without invalidating cache
    const hasCurrentStepData = dynamicFormSteps.length > 0 && 
                               Array.isArray(dynamicFormSteps[currentStep]) && 
                               dynamicFormSteps[currentStep].length > 0;
                               
    if (!hasCurrentStepData) {
      console.log('[KYB Form Debug] No data found for current step, fetching:', { 
        currentStep, 
        timestamp: new Date().toISOString() 
      });
      
      // Only invalidate if we don't have the data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/form-fields/company_kyb', currentStep]
      });
    } else {
      console.log('[KYB Form Debug] Using existing data for step:', { 
        currentStep, 
        fieldCount: dynamicFormSteps[currentStep].length,
        timestamp: new Date().toISOString() 
      });
    }
    
    // Prefetch fields for adjacent steps - next and previous
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      // Only prefetch if we don't already have this data
      const hasPrevStepData = dynamicFormSteps.length > 0 && 
                              Array.isArray(dynamicFormSteps[prevStep]) && 
                              dynamicFormSteps[prevStep].length > 0;
                              
      if (!hasPrevStepData) {
        queryClient.prefetchQuery({
          queryKey: ['/api/form-fields/company_kyb', prevStep],
          queryFn: () => getKybFieldsByStepIndex(prevStep),
          staleTime: 5 * 60 * 1000,
        });
      }
    }
    
    // Use dynamic steps length if available, otherwise fallback to static steps
    const maxSteps = dynamicFormSteps.length > 0 ? dynamicFormSteps.length - 1 : FORM_STEPS.length - 1;
    
    if (currentStep < maxSteps) {
      const nextStep = currentStep + 1;
      // Only prefetch if we don't already have this data
      const hasNextStepData = dynamicFormSteps.length > 0 && 
                              Array.isArray(dynamicFormSteps[nextStep]) && 
                              dynamicFormSteps[nextStep].length > 0;
                              
      if (!hasNextStepData) {
        queryClient.prefetchQuery({
          queryKey: ['/api/form-fields/company_kyb', nextStep],
          queryFn: () => getKybFieldsByStepIndex(nextStep),
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [currentStep, queryClient, dynamicFormSteps, kybFields, getKybFieldsByStepIndex, formReady]);

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

      unifiedToast.error("Failed to save progress. Please try again.");
    }
  };

  const handleBack = async () => {
    console.log('[KYB Form Debug] NAVIGATION: Back button clicked', {
      status: 'START',
      currentStep,
      isReviewMode,
      timestamp: new Date().toISOString()
    });
    
    if (isReviewMode) {
      // STEP 1: Exit review mode and go back to form
      console.log('[KYB Form Debug] NAVIGATION-BACK STEP 1/5: Exiting review mode', {
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
      setIsReviewMode(false);
      return;
    }
    
    if (currentStep > 0) {
      // STEP 2: Prefetch data for the previous step before navigating
      const prevStep = currentStep - 1;
      console.log('[KYB Form Debug] NAVIGATION-BACK STEP 2/5: Preparing to navigate to previous step', {
        status: 'SUCCESS',
        prevStep,
        currentStep,
        timestamp: new Date().toISOString()
      });
      
      // STEP 3: Check if we already have data for the previous step
      const hasPrevStepData = dynamicFormSteps.length > 0 && 
                            Array.isArray(dynamicFormSteps[prevStep]) && 
                            dynamicFormSteps[prevStep].length > 0;
      
      console.log('[KYB Form Debug] NAVIGATION-BACK STEP 3/5: Checking for previous step data', {
        status: hasPrevStepData ? 'SUCCESS' : 'PENDING',
        prevStep,
        dynamicFormStepsLength: dynamicFormSteps.length,
        hasPrevStepData,
        fieldCount: hasPrevStepData ? dynamicFormSteps[prevStep].length : 0,
        timestamp: new Date().toISOString()
      });
                            
      // STEP 4: If we don't have the data yet, fetch it before navigation
      if (!hasPrevStepData) {
        console.log('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: Fetching data for previous step', {
          status: 'PENDING',
          prevStep,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Fetch the data synchronously before navigating
          const prevStepData = await getKybFieldsByStepIndex(prevStep);
          
          if (prevStepData && prevStepData.length > 0) {
            console.log('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: Data fetch completed', {
              status: 'SUCCESS',
              prevStep,
              fieldCount: prevStepData.length,
              fieldNames: prevStepData.map(f => f.field_key),
              timestamp: new Date().toISOString()
            });
            
            // Process the previous step data
            const formFieldsMap: Record<string, FormField> = {};
            const formFields = prevStepData
              .sort((a, b) => a.order - b.order)
              .map(field => {
                const formField = convertKybFieldToFormField(field);
                formFieldsMap[field.field_key] = formField;
                return formField;
              });
            
            // Update dynamicFormSteps with the new data
            setDynamicFormSteps(prevSteps => {
              const updatedSteps = [...prevSteps];
              updatedSteps[prevStep] = formFields;
              
              console.log('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: Updating form steps array', {
                status: 'SUCCESS',
                prevStep,
                currentStep,
                prevStepsLength: prevSteps.length,
                updatedStepsLength: updatedSteps.length,
                timestamp: new Date().toISOString()
              });
              
              return updatedSteps;
            });
            
            // Update fieldConfig with the new fields
            setFieldConfig(prevConfig => ({
              ...prevConfig,
              ...formFieldsMap
            }));
          } else {
            console.log('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: No data found for previous step', {
              status: 'FAILED',
              prevStep,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: Error fetching previous step data', {
            status: 'FAILED',
            prevStep,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log('[KYB Form Debug] NAVIGATION-BACK STEP 4/5: Using existing data for previous step', {
          status: 'SUCCESS',
          prevStep,
          fieldCount: dynamicFormSteps[prevStep].length,
          fieldNames: dynamicFormSteps[prevStep].map(f => f.name),
          timestamp: new Date().toISOString()
        });
      }
      
      // STEP 5: Navigate to the previous step
      console.log('[KYB Form Debug] NAVIGATION-BACK STEP 5/5: Navigating to previous step', {
        status: 'PENDING',
        fromStep: currentStep,
        toStep: prevStep,
        timestamp: new Date().toISOString()
      });
      
      setCurrentStep(current => {
        console.log('[KYB Form Debug] NAVIGATION-BACK STEP 5/5: Navigation complete', {
          status: 'SUCCESS',
          fromStep: current,
          toStep: current - 1,
          timestamp: new Date().toISOString()
        });
        return current - 1;
      });
    } else {
      console.log('[KYB Form Debug] NAVIGATION-BACK: Already at first step, cannot go back', {
        status: 'CANCELLED',
        currentStep,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleNext = async () => {
    console.log('[KYB Form Debug] NAVIGATION: Next button clicked', {
      status: 'START',
      currentStep,
      isReviewMode,
      timestamp: new Date().toISOString()
    });
    
    if (isReviewMode) {
      // STEP 1: From review mode, submit the form
      console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 1/5: Submitting form from review page', {
        status: 'SUCCESS',
        fieldCount: Object.keys(formData).length,
        timestamp: new Date().toISOString()
      });
      
      if (onSubmit) {
        onSubmit(formData);
      }
      setIsSubmitted(true);
      return;
    }
    
    // STEP 2: Calculate max steps and determine if we can navigate forward
    const maxSteps = dynamicFormSteps.length > 0 ? dynamicFormSteps.length - 1 : FORM_STEPS.length - 1;
    console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 2/5: Calculating navigation options', {
      status: 'SUCCESS',
      currentStep,
      maxSteps,
      dynamicFormStepsLength: dynamicFormSteps.length,
      canNavigateNext: currentStep < maxSteps,
      isLastStep: currentStep >= maxSteps,
      timestamp: new Date().toISOString()
    });
    
    if (currentStep < maxSteps) {
      // STEP 3: Prepare next step navigation
      const nextStep = currentStep + 1;
      console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 3/5: Preparing next step navigation', {
        status: 'SUCCESS',
        fromStep: currentStep,
        toStep: nextStep,
        timestamp: new Date().toISOString()
      });
      
      // Check if we already have data for the next step
      const hasNextStepData = dynamicFormSteps.length > 0 && 
                            Array.isArray(dynamicFormSteps[nextStep]) && 
                            dynamicFormSteps[nextStep].length > 0;
      
      console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 3/5: Checking next step data availability', {
        status: hasNextStepData ? 'SUCCESS' : 'PENDING',
        nextStep,
        hasNextStepData,
        fieldCount: hasNextStepData ? dynamicFormSteps[nextStep].length : 0,
        timestamp: new Date().toISOString()
      });
                            
      // STEP 4: If next step data is missing, fetch it
      if (!hasNextStepData) {
        console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: Fetching data for next step', {
          status: 'PENDING',
          nextStep,
          timestamp: new Date().toISOString()
        });
        
        try {
          // Fetch the data synchronously before navigating
          const nextStepData = await getKybFieldsByStepIndex(nextStep);
          
          if (nextStepData && nextStepData.length > 0) {
            console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: Data fetch completed', {
              status: 'SUCCESS',
              nextStep,
              fieldCount: nextStepData.length,
              fieldNames: nextStepData.map(f => f.field_key),
              timestamp: new Date().toISOString()
            });
            
            // Process the next step data
            const formFieldsMap: Record<string, FormField> = {};
            const formFields = nextStepData
              .sort((a, b) => a.order - b.order)
              .map(field => {
                const formField = convertKybFieldToFormField(field);
                formFieldsMap[field.field_key] = formField;
                return formField;
              });
            
            // Update dynamicFormSteps with the new data
            setDynamicFormSteps(prevSteps => {
              const updatedSteps = [...prevSteps];
              updatedSteps[nextStep] = formFields;
              
              console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: Updating form steps array', {
                status: 'SUCCESS',
                fromStep: currentStep,
                toStep: nextStep,
                prevStepsLength: prevSteps.length,
                updatedStepsLength: updatedSteps.length,
                newStepFieldCount: formFields.length,
                timestamp: new Date().toISOString()
              });
              
              return updatedSteps;
            });
            
            // Update fieldConfig with the new fields
            setFieldConfig(prevConfig => ({
              ...prevConfig,
              ...formFieldsMap
            }));
          } else {
            console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: No data found for next step', {
              status: 'FAILED',
              nextStep,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: Error fetching next step data', {
            status: 'FAILED',
            nextStep,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 4/5: Using existing data', {
          status: 'SUCCESS',
          nextStep,
          fieldCount: dynamicFormSteps[nextStep].length,
          fieldNames: dynamicFormSteps[nextStep].map(f => f.name),
          timestamp: new Date().toISOString()
        });
      }
      
      // STEP 5: Navigate to the next step
      console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 5/5: Navigating to next step', {
        status: 'PENDING',
        fromStep: currentStep,
        toStep: nextStep,
        timestamp: new Date().toISOString()
      });
      
      setCurrentStep(current => {
        console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 5/5: Navigation complete', {
          status: 'SUCCESS',
          fromStep: current,
          toStep: current + 1,
          timestamp: new Date().toISOString()
        });
        return current + 1;
      });
    } else {
      // STEP 5 (alternate): Enter review mode
      console.log('[KYB Form Debug] NAVIGATION-NEXT STEP 5/5: Entering review mode', {
        status: 'SUCCESS',
        lastStep: currentStep,
        timestamp: new Date().toISOString()
      });
      
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

  // STEP SELECTION ANALYSIS: Debug the step data selection process in detail
  console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - START', {
    timestamp: new Date().toISOString(),
    currentStepState: currentStep,
    isReviewMode,
    dynamicStepsCount: dynamicFormSteps.length
  });
  
  // Part 1: Analyze dynamicFormSteps structure
  console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - PART 1: Dynamic steps structure', {
    timestamp: new Date().toISOString(),
    dynamicStepsAvailable: dynamicFormSteps.length > 0,
    dynamicStepsSummary: dynamicFormSteps.map((step, idx) => ({
      stepIndex: idx,
      exists: !!step,
      isArray: Array.isArray(step),
      fieldCount: Array.isArray(step) ? step.length : 0,
      fieldNames: Array.isArray(step) && step.length > 0 ? step.map(f => f.name) : []
    }))
  });
  
  // Part 2: Current step analysis
  let hasCurrentStepInDynamicData = false;
  let currentStepDynamicFieldCount = 0;
  let validDynamicStep = false;
  
  if (dynamicFormSteps.length > 0) {
    hasCurrentStepInDynamicData = currentStep < dynamicFormSteps.length;
    if (hasCurrentStepInDynamicData) {
      validDynamicStep = Array.isArray(dynamicFormSteps[currentStep]) && dynamicFormSteps[currentStep].length > 0;
      currentStepDynamicFieldCount = validDynamicStep ? dynamicFormSteps[currentStep].length : 0;
    }
  }
  
  console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - PART 2: Current step availability', {
    timestamp: new Date().toISOString(),
    currentStep,
    hasCurrentStepInDynamicData,
    validDynamicStep,
    currentStepDynamicFieldCount,
    willFallbackToStatic: !validDynamicStep,
    staticStepsAvailable: FORM_STEPS.length > 0,
    staticStepsCount: FORM_STEPS.length,
    currentStepInStaticRange: currentStep < FORM_STEPS.length,
    staticStepFieldCount: currentStep < FORM_STEPS.length ? FORM_STEPS[currentStep].length : 0
  });
  
  // Part 3: Make the decision with explicit logging
  const useDynamicData = dynamicFormSteps.length > 0 && 
                        Array.isArray(dynamicFormSteps[currentStep]) && 
                        dynamicFormSteps[currentStep].length > 0;
                        
  console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - PART 3: Selection decision', {
    timestamp: new Date().toISOString(),
    useDynamicData,
    selectionReason: useDynamicData ? 'Valid dynamic step data available' : 'Falling back to static data',
    dynamicDataStatus: dynamicFormSteps.length > 0 
      ? (Array.isArray(dynamicFormSteps[currentStep]) 
         ? (dynamicFormSteps[currentStep].length > 0 
            ? 'COMPLETE' 
            : 'EMPTY_ARRAY') 
         : 'NOT_ARRAY') 
      : 'NO_DYNAMIC_DATA',
    staticDataStatus: currentStep < FORM_STEPS.length 
      ? (FORM_STEPS[currentStep].length > 0 
         ? 'AVAILABLE' 
         : 'EMPTY') 
      : 'OUT_OF_RANGE'
  });
  
  // Now select the current step data with enhanced error handling
  let currentStepData: FormField[] = [];
  
  try {
    if (useDynamicData) {
      currentStepData = dynamicFormSteps[currentStep];
      console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - SUCCESS: Using dynamic step data', {
        timestamp: new Date().toISOString(),
        fieldCount: currentStepData.length,
        fieldNames: currentStepData.map(f => f.name)
      });
    } else if (currentStep < FORM_STEPS.length) {
      currentStepData = FORM_STEPS[currentStep];
      console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - SUCCESS: Using static step data', {
        timestamp: new Date().toISOString(),
        fieldCount: currentStepData.length,
        fieldNames: currentStepData.map(f => f.name)
      });
    } else {
      console.error('[KYB Form Debug] STEP SELECTION ANALYSIS - ERROR: No valid step data available', {
        timestamp: new Date().toISOString(),
        currentStep,
        dynamicStepsCount: dynamicFormSteps.length,
        staticStepsCount: FORM_STEPS.length
      });
      // Fallback to empty array - we'll handle this gracefully in the UI
    }
  } catch (error) {
    console.error('[KYB Form Debug] STEP SELECTION ANALYSIS - EXCEPTION: Error selecting step data', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Fallback to empty array on error
  }
  
  // Final validation
  console.log('[KYB Form Debug] STEP SELECTION ANALYSIS - COMPLETE', {
    timestamp: new Date().toISOString(),
    success: currentStepData && currentStepData.length > 0,
    fieldCount: currentStepData?.length || 0,
    stepTitle: STEP_TITLES[currentStep] || 'Unknown Step',
    isLastStep: dynamicFormSteps.length > 0 
      ? currentStep === dynamicFormSteps.length - 1
      : currentStep === FORM_STEPS.length - 1
  });
    
  const isLastStep: boolean = dynamicFormSteps.length > 0 
    ? currentStep === dynamicFormSteps.length - 1
    : currentStep === FORM_STEPS.length - 1;

  // Check if current step is valid
  const isCurrentStepValid = validateCurrentStep(formData, currentStepData);
  
  console.log('[KYB Form Debug] CHECKPOINT 3: Step validation result', {
    currentStep,
    isValid: isCurrentStepValid,
    timestamp: new Date().toISOString()
  });


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
      {isLoading ? (
        <Card className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
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
                {/* Add extra debug for all steps */}
                {console.log('[KYB Form Debug] Rendering all steps:', {
                  stepsCount: dynamicFormSteps.length,
                  fallbackStepsCount: FORM_STEPS.length,
                  usingDynamic: dynamicFormSteps.length > 0,
                  firstStepSample: dynamicFormSteps.length > 0 && dynamicFormSteps[0]
                })}
                
                {(dynamicFormSteps.length > 0 ? dynamicFormSteps : FORM_STEPS).map((step, index) => {
                  // Enhanced step validation with extra logging
                  console.log('[KYB Form Debug] Processing step:', {
                    stepIndex: index,
                    isArray: Array.isArray(step),
                    length: step && Array.isArray(step) ? step.length : 0,
                    firstFieldSample: step && Array.isArray(step) && step.length > 0 ? step[0] : null
                  });
                  
                  // Safely check each step is valid
                  if (!step || !Array.isArray(step)) {
                    console.error('[KYB Form Debug] Invalid step found:', {
                      stepIndex: index,
                      step
                    });
                    // Return dummy element instead of null to maintain structure
                    return <div key={`empty-step-${index}`} className="flex-none w-[250px] opacity-50"></div>;
                  }
                  
                  // If the step array is empty, also render a placeholder
                  if (step.length === 0) {
                    console.error('[KYB Form Debug] Empty step array found:', {
                      stepIndex: index
                    });
                    return <div key={`empty-step-${index}`} className="flex-none w-[250px] opacity-50"></div>;
                  }
                  
                  // Extract field names safely
                  const stepFields = step
                    .filter(field => field && typeof field === 'object' && 'name' in field)
                    .map(field => field.name);
                    
                  // Check if ALL fields in this step are completed
                  const stepCompleted = stepFields.length > 0 && stepFields.every(fieldName => 
                    formData && formData[fieldName] && formData[fieldName].toString().trim() !== '');
                  
                  // Check if ANY fields in this step have values
                  const hasProgress = stepFields.length > 0 && stepFields.some(fieldName => 
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
                  
                  // Safe check for prior step completion - with proper null checking
                  let isPriorStepCompleted = false;
                  
                  if (index > 0) {
                    // First check if we have dynamicFormSteps or need to use FORM_STEPS
                    const formSteps = dynamicFormSteps.length > 0 ? dynamicFormSteps : FORM_STEPS;
                    
                    // Safely check if the previous step exists
                    if (formSteps && formSteps[index-1] && Array.isArray(formSteps[index-1])) {
                      // Now safely map and check each field
                      const fieldNames = formSteps[index-1].map(field => {
                        // Check that field is a valid object with name property before accessing
                        if (field && typeof field === 'object' && 'name' in field) {
                          return field.name;
                        }
                        return '';
                      }).filter(name => name !== ''); // Filter out any empty names

                      // Check if we have any field names to check
                      if (fieldNames.length > 0) {
                        // Check if all fields have valid values
                        isPriorStepCompleted = fieldNames.every(fieldName => 
                          formData && 
                          formData[fieldName] !== undefined && 
                          formData[fieldName] !== null &&
                          (
                            // String values should be non-empty when trimmed
                            (typeof formData[fieldName] === 'string' && formData[fieldName].trim() !== '') ||
                            // Boolean values are valid as-is
                            typeof formData[fieldName] === 'boolean' ||
                            // Numbers are valid as-is (except NaN)
                            (typeof formData[fieldName] === 'number' && !isNaN(formData[fieldName]))
                          )
                        );
                      }
                    }
                  }
                  
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
                  
                  // Safely extract the first field name for the key
                  const firstField = step[0];
                  const firstFieldName = firstField && typeof firstField === 'object' && 'name' in firstField ? 
                    firstField.name : `step-${index}`;
                    
                  return (
                    <div 
                      key={firstFieldName} 
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