/**
 * Form Service Factory
 * 
 * This factory function creates and returns the appropriate form service
 * for the given form type. It ensures that the correct form service
 * implementation is used for each form type, with the enhanced KY3P
 * form service being used for KY3P forms.
 */

import { FormServiceInterface } from '@/services/formService';
import { kybService } from '@/services/kybService';
import { ky3pFormService } from '@/services/ky3p-form-service-final';
import { EnhancedKY3PFormService } from './enhanced-ky3p-form-service';
import { openBankingFormService } from '@/services/open-banking-form-service';
import getLogger from '@/utils/logger';

const logger = getLogger('FormServiceFactory');

type FormType = 'kyb' | 'ky3p' | 'open_banking' | string;

/**
 * Create a form service instance for the specified form type
 * 
 * @param formType The type of form ('kyb', 'ky3p', 'open_banking')
 * @returns FormServiceInterface instance or null if type not supported
 */
export function createFormService(formType: FormType): FormServiceInterface | null {
  logger.info(`Creating form service for type: ${formType}`);
  
  switch (formType.toLowerCase()) {
    case 'kyb':
      logger.info('Using KYBFormService');
      return kybService;
      
    case 'ky3p':
      logger.info('Using EnhancedKY3PFormService (standardized implementation)');
      return new EnhancedKY3PFormService();
      
    case 'open_banking':
    case 'open_banking_survey':
      logger.info('Using OpenBankingFormService');
      return openBankingFormService;
      
    default:
      logger.warn(`Unsupported form type: ${formType}`);
      return null;
  }
}
