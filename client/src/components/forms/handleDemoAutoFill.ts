import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

const logger = getLogger('handleDemoAutoFill');

interface DemoAutoFillOptions {
  taskId?: number;
  taskType: string;
  form: any;
  resetForm: (data: Record<string, any>) => void;
  updateField: (fieldKey: string, value: any) => Promise<void>;
  refreshStatus: () => Promise<void>;
  saveProgress: () => Promise<void>;
  onProgress?: (progress: number) => void;
  formService: FormServiceInterface | null;
  setForceRerender: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Universal demo auto-fill handler that works for all form types
 * 
 * This function uses a direct database update approach instead of API calls
 * to populate form fields with demo data.
 */
export async function handleDemoAutoFill({
  taskId,
  taskType,
  form,
  resetForm,
  updateField,
  refreshStatus,
  saveProgress,
  onProgress,
  formService,
  setForceRerender
}: DemoAutoFillOptions): Promise<void> {
  if (!taskId || !formService) {
    toast({
      title: 'Demo Auto-Fill Error',
      description: 'Could not auto-fill the form. Missing task ID or form service.',
      variant: 'destructive',
    });
    return;
  }

  try {
    logger.info(`Starting demo auto-fill for task ${taskId}`);
    
    // Show a single loading toast with an ID
    const toastId = 'demo-autofill-loading';
    toast({
      id: toastId,
      title: 'Demo Auto-Fill',
      description: 'Filling form with sample data...',
      variant: 'default',
    });

    // Get all field definitions with demo values from the database
    const fieldsResponse = await getFormFieldsWithDemoValues(taskType);
    
    if (!fieldsResponse.success) {
      toast({
        id: toastId,
        title: 'Demo Auto-Fill Failed',
        description: fieldsResponse.message || 'Failed to load demo field values',
        variant: 'destructive',
      });
      return;
    }
    
    logger.info(`Retrieved ${fieldsResponse.fields.length} fields with demo values`);
    
    // Apply demo values directly to form
    let appliedCount = 0;
    
    // Batch updates for better performance
    const updatePromises = [];
    
    for (const field of fieldsResponse.fields) {
      if (field.demoValue !== null && field.demoValue !== undefined) {
        updatePromises.push(updateField(field.fieldKey, field.demoValue));
        appliedCount++;
      }
    }
    
    // Process all updates
    if (updatePromises.length > 0) {
      // Update the existing loading toast with new description
      toast({
        id: toastId,
        title: 'Demo Auto-Fill',
        description: 'Updating form fields...',
        variant: 'default',
      });
      
      await Promise.all(updatePromises);
      
      logger.info(`Applied ${appliedCount} demo values to form fields`);
      
      // Save all changes
      await saveProgress();
      
      // Give database a moment to catch up
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh form data to ensure consistency
      if (formService) {
        logger.info('Refreshing form data from service');
        const refreshedData = await formService.getFormData();
        logger.info('Form data refreshed', { fieldCount: Object.keys(refreshedData || {}).length });
        resetForm(refreshedData);
      }
      
      // Force a re-render to update the UI
      setForceRerender((prev: boolean) => !prev);
      
      // Update progress if needed
      if (onProgress) {
        await refreshStatus();
      }
      
      // Show success message - replace the loading toast with the success toast
      toast({
        id: toastId,
        title: 'Demo Auto-Fill Complete',
        description: `Successfully filled ${appliedCount} form fields with sample data.`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'Demo Auto-Fill Notice',
        description: 'No demo values found for this form type.',
        variant: 'default',
      });
    }
  } catch (error) {
    logger.error('Error during demo auto-fill:', error);
    toast({
      id: toastId,
      title: 'Auto-Fill Error',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
}

/**
 * Get field definitions with demo values for the specified form type
 * This bypasses the server authentication by getting demo values directly from the form type
 */
async function getFormFieldsWithDemoValues(formType: string): Promise<{ 
  success: boolean, 
  fields: Array<{ fieldKey: string, demoValue: any }>,
  message?: string 
}> {
  try {
    // Map form types to field lists with demo values
    const demoFieldsByType: Record<string, Array<{ fieldKey: string, demoValue: any }>> = {
      'kyb': [
        { fieldKey: 'legalEntityName', demoValue: 'Demo Corporation' },
        { fieldKey: 'registrationNumber', demoValue: '12-3456789' },
        { fieldKey: 'incorporationDate', demoValue: '2020-01-15' },
        { fieldKey: 'businessType', demoValue: 'Limited Liability Company (LLC)' },
        { fieldKey: 'jurisdiction', demoValue: 'Delaware, United States' },
        { fieldKey: 'registeredAddress', demoValue: '123 Market Street, Wilmington, DE 19801' },
        { fieldKey: 'companyPhone', demoValue: '(302) 555-1234' },
        { fieldKey: 'priorNames', demoValue: 'None' },
        { fieldKey: 'goodStanding', demoValue: 'Yes' },
        { fieldKey: 'externalAudit', demoValue: 'No' },
        { fieldKey: 'ultimateBeneficialOwners', demoValue: 'John Smith (65%), Jane Doe (35%)' },
        { fieldKey: 'licenses', demoValue: 'Money Transmitter License #MT-12345, Financial Data Provider License #FDP-98765' },
        { fieldKey: 'corporateRegistration', demoValue: 'Current and valid' },
        { fieldKey: 'authorizedSigners', demoValue: 'John Smith (CEO), Jane Doe (CFO)' },
        { fieldKey: 'governmentOwnership', demoValue: 'No' },
        { fieldKey: 'contactEmail', demoValue: 'contact@democorp.com' },
        { fieldKey: 'marketCapitalization', demoValue: '$25,000,000' },
        { fieldKey: 'lifetimeCustomerValue', demoValue: '$4,500' },
        { fieldKey: 'annualRecurringRevenue', demoValue: '$8,500,000' },
        { fieldKey: 'revenueGrowthRate', demoValue: '18%' },
        { fieldKey: 'investigationsIncidents', demoValue: 'None in the past 5 years' },
        { fieldKey: 'financialStatements', demoValue: 'Audited annually by Big 4 accounting firm' },
        { fieldKey: 'operationalPolicies', demoValue: 'Comprehensive policies with annual review cycle' },
        { fieldKey: 'dataVolume', demoValue: 'Approximately 5TB of customer data processed monthly' },
        { fieldKey: 'dataTypes', demoValue: 'Financial transactions, PII, account information' },
        { fieldKey: 'sanctionsCheck', demoValue: 'Regular screening against OFAC and other global sanctions lists' },
        { fieldKey: 'dueDiligence', demoValue: 'Enhanced due diligence for high-risk transactions' },
        { fieldKey: 'regulatoryActions', demoValue: 'No regulatory actions or material findings in past 3 years' },
        { fieldKey: 'directorsAndOfficers', demoValue: 'Board of 5 directors with majority independent members' },
        { fieldKey: 'monthlyRecurringRevenue', demoValue: '$750,000' },
        { fieldKey: 'controlEnvironment', demoValue: 'Strong controls with quarterly assessments and documented procedures' }
      ],
      'company_kyb': [
        { fieldKey: 'legalEntityName', demoValue: 'Demo Corporation' },
        { fieldKey: 'registrationNumber', demoValue: '12-3456789' },
        { fieldKey: 'incorporationDate', demoValue: '2020-01-15' },
        { fieldKey: 'businessType', demoValue: 'Limited Liability Company (LLC)' },
        { fieldKey: 'jurisdiction', demoValue: 'Delaware, United States' },
        { fieldKey: 'registeredAddress', demoValue: '123 Market Street, Wilmington, DE 19801' },
        { fieldKey: 'companyPhone', demoValue: '(302) 555-1234' },
        { fieldKey: 'priorNames', demoValue: 'None' },
        { fieldKey: 'goodStanding', demoValue: 'Yes' },
        { fieldKey: 'externalAudit', demoValue: 'No' },
        { fieldKey: 'ultimateBeneficialOwners', demoValue: 'John Smith (65%), Jane Doe (35%)' },
        { fieldKey: 'licenses', demoValue: 'Money Transmitter License #MT-12345, Financial Data Provider License #FDP-98765' },
        { fieldKey: 'corporateRegistration', demoValue: 'Current and valid' },
        { fieldKey: 'authorizedSigners', demoValue: 'John Smith (CEO), Jane Doe (CFO)' },
        { fieldKey: 'governmentOwnership', demoValue: 'No' },
        { fieldKey: 'contactEmail', demoValue: 'contact@democorp.com' },
        { fieldKey: 'marketCapitalization', demoValue: '$25,000,000' },
        { fieldKey: 'lifetimeCustomerValue', demoValue: '$4,500' },
        { fieldKey: 'annualRecurringRevenue', demoValue: '$8,500,000' },
        { fieldKey: 'revenueGrowthRate', demoValue: '18%' },
        { fieldKey: 'investigationsIncidents', demoValue: 'None in the past 5 years' },
        { fieldKey: 'financialStatements', demoValue: 'Audited annually by Big 4 accounting firm' },
        { fieldKey: 'operationalPolicies', demoValue: 'Comprehensive policies with annual review cycle' },
        { fieldKey: 'dataVolume', demoValue: 'Approximately 5TB of customer data processed monthly' },
        { fieldKey: 'dataTypes', demoValue: 'Financial transactions, PII, account information' },
        { fieldKey: 'sanctionsCheck', demoValue: 'Regular screening against OFAC and other global sanctions lists' },
        { fieldKey: 'dueDiligence', demoValue: 'Enhanced due diligence for high-risk transactions' },
        { fieldKey: 'regulatoryActions', demoValue: 'No regulatory actions or material findings in past 3 years' },
        { fieldKey: 'directorsAndOfficers', demoValue: 'Board of 5 directors with majority independent members' },
        { fieldKey: 'monthlyRecurringRevenue', demoValue: '$750,000' },
        { fieldKey: 'controlEnvironment', demoValue: 'Strong controls with quarterly assessments and documented procedures' }
      ],
      'ky3p': [
        { fieldKey: 'securityCertifications', demoValue: 'ISO 27001, SOC 2 Type II' },
        { fieldKey: 'dataEncryption', demoValue: 'AES-256 for data at rest, TLS 1.3 for data in transit' },
        { fieldKey: 'incidentResponse', demoValue: 'Formal incident response team with 24/7 coverage' },
        { fieldKey: 'accessControl', demoValue: 'Role-based access control with MFA for all privileged access' },
        { fieldKey: 'vulnerabilityManagement', demoValue: 'Weekly automated scans, quarterly penetration testing' },
        { fieldKey: 'bcpDrp', demoValue: 'Comprehensive plans with annual testing and RTO of 4 hours' },
        { fieldKey: 'securityFramework', demoValue: 'NIST Cybersecurity Framework' }
      ],
      'security_assessment': [
        { fieldKey: 'securityCertifications', demoValue: 'ISO 27001, SOC 2 Type II' },
        { fieldKey: 'dataEncryption', demoValue: 'AES-256 for data at rest, TLS 1.3 for data in transit' },
        { fieldKey: 'incidentResponse', demoValue: 'Formal incident response team with 24/7 coverage' },
        { fieldKey: 'accessControl', demoValue: 'Role-based access control with MFA for all privileged access' },
        { fieldKey: 'vulnerabilityManagement', demoValue: 'Weekly automated scans, quarterly penetration testing' },
        { fieldKey: 'bcpDrp', demoValue: 'Comprehensive plans with annual testing and RTO of 4 hours' },
        { fieldKey: 'securityFramework', demoValue: 'NIST Cybersecurity Framework' }
      ],
      'open_banking': [
        { fieldKey: 'apiStandards', demoValue: 'Fully compliant with FDX API 5.0 standards' },
        { fieldKey: 'apiSecurity', demoValue: 'OAuth 2.0 with mTLS for all API endpoints' },
        { fieldKey: 'customerConsent', demoValue: 'Granular consent management with transparent data usage policies' },
        { fieldKey: 'openBankingCertifications', demoValue: 'FDX Certified, Open Banking Implementation Entity (OBIE) verified' }
      ],
      'open_banking_survey': [
        { fieldKey: 'apiStandards', demoValue: 'Fully compliant with FDX API 5.0 standards' },
        { fieldKey: 'apiSecurity', demoValue: 'OAuth 2.0 with mTLS for all API endpoints' },
        { fieldKey: 'customerConsent', demoValue: 'Granular consent management with transparent data usage policies' },
        { fieldKey: 'openBankingCertifications', demoValue: 'FDX Certified, Open Banking Implementation Entity (OBIE) verified' }
      ]
    };
    
    // Normalize form type key for lookup
    let normalizedType = formType.toLowerCase();
    
    // Get appropriate field list based on form type
    let fields: Array<{ fieldKey: string, demoValue: any }> = [];
    
    if (normalizedType === 'kyb' || normalizedType === 'company_kyb') {
      fields = demoFieldsByType['kyb'];
    } else if (normalizedType === 'ky3p' || normalizedType === 'security_assessment' || normalizedType === 'security') {
      fields = demoFieldsByType['ky3p'];
    } else if (normalizedType === 'open_banking' || normalizedType === 'open_banking_survey') {
      fields = demoFieldsByType['open_banking'];
    } else {
      return {
        success: false,
        fields: [],
        message: `Unsupported form type: ${formType}`
      };
    }
    
    return {
      success: true,
      fields
    };
  } catch (error) {
    logger.error('Error getting demo field values:', error);
    return {
      success: false,
      fields: [],
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}