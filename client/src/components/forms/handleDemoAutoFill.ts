import { FormServiceInterface } from '@/services/formService';
import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { standardizedBulkUpdate } from './standardized-ky3p-update';

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
 * 
 * For KY3P forms, it now uses the standardized approach with string-based field keys
 * that matches KYB's implementation.
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

  // Define the toast ID outside the try block so it's accessible in the catch block too
  const toastId = 'demo-autofill-loading';
  
  try {
    logger.info(`Starting demo auto-fill for task ${taskId}`);
    
    // Show initial loading toast
    toast({
      id: toastId,
      title: 'Demo Auto-Fill',
      description: 'Loading demo data...',
      variant: 'default',
    });

    // Special handling for KY3P forms using the standardized approach with POST method
    const normalizedType = taskType.toLowerCase();
    if (normalizedType === 'ky3p' || normalizedType === 'sp_ky3p_assessment' || 
        normalizedType === 'security_assessment' || normalizedType === 'security') {
      
      logger.info(`Using standardized KY3P demo auto-fill for task type: ${taskType}`);
      
      // Use the new standardized bulk update approach which uses POST
      const success = await standardizedBulkUpdate(taskId, {});
      
      if (success) {
        // If the update was successful, force reload the form data from the database
        if (formService) {
          logger.info('Forcing reload of form data from database after demo auto-fill');
          
          // First clear any cached data in the form service
          formService.clearCache?.();
          
          try {
            // For KY3P forms, make a direct API call to get fresh data 
            // This bypasses any caching issues in the form service
            logger.info('Making direct API call to get fresh KY3P form data');
            
            // Use the progress endpoint which converts responses to field_key format
            const response = await fetch(`/api/ky3p/progress/${taskId}`, {
              credentials: 'include'
            });
            
            if (!response.ok) {
              throw new Error(`Failed to get fresh KY3P data: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.formData) {
              logger.info('Fresh KY3P form data loaded with direct API call', { 
                fieldCount: Object.keys(result.formData || {}).length,
                sampleKeys: Object.keys(result.formData || {}).slice(0, 3)
              });
              
              // This is the key step - directly updating the form with fresh data
              resetForm(result.formData);
              
              // Force re-render at this point
              setForceRerender((prev: boolean) => !prev);
              
              // Also try regular form service methods as a backup
              if (formService.loadResponses) {
                // This might not work for KY3P, but let's try anyway
                formService.loadResponses().catch(e => 
                  logger.warn('Secondary loadResponses failed, but we already have data:', e)
                );
              }
              
              // Success - no need to continue to fallback options
              logger.info('Direct KY3P data refresh successful');
            } else {
              throw new Error('KY3P progress API returned no form data');
            }
          } catch (directApiError) {
            logger.error('Direct API call for KY3P form data failed:', directApiError);
            
            // Fall back to standard methods
            // Reload responses directly from the database
            if (formService.loadResponses) {
              logger.info('Falling back to loadResponses() after direct API call failed');
              try {
                const freshData = await formService.loadResponses();
                logger.info('Fresh form data loaded from database via loadResponses()', { 
                  fieldCount: Object.keys(freshData || {}).length,
                  sampleKeys: Object.keys(freshData || {}).slice(0, 3)
                });
                resetForm(freshData);
              } catch (loadError) {
                logger.error('Error loading responses after demo auto-fill:', loadError);
              }
            } else {
              // Last resort fallback to getFormData()
              logger.info('All other methods failed, using getFormData');
              const refreshedData = await formService.getFormData();
              logger.info('Form data refreshed via getFormData', { 
                fieldCount: Object.keys(refreshedData || {}).length 
              });
              resetForm(refreshedData);
            }
          }
        }
        
        // Force a re-render
        setForceRerender((prev: boolean) => !prev);
        
        // Update progress if needed
        if (onProgress) {
          await refreshStatus();
        }
        
        // Show success message
        toast({
          id: toastId,
          title: 'Demo Auto-Fill Complete',
          description: 'Successfully filled the form with demo data.',
          variant: 'success',
        });
        
        return;
      } else {
        // If the standardized approach failed, show an error
        toast({
          id: toastId,
          title: 'Demo Auto-Fill Failed',
          description: 'Could not auto-fill the form using the standardized approach.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    // For other form types (KYB, Open Banking), continue with the original implementation
    
    // Get all field definitions with demo values from local data
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
      // Perform updates without any loading toast
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