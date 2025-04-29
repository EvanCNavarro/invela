/**
 * Form Service Factory
 * 
 * This factory selects the appropriate form service based on the task type,
 * providing a uniform interface for working with different form types.
 */

import { QueryClient } from '@tanstack/react-query';
import { FormServiceInterface } from './formService';
import { EnhancedKybFormService, enhancedKybService } from './enhanced-kyb-service';
import { OpenBankingFormService, openBankingFormService } from './open-banking-form-service';
import { StandardizedKY3PFormService } from './standardized-ky3p-form-service';

/**
 * Get the appropriate form service for a given task type
 */
export function getFormService(taskType: string, queryClient: QueryClient): FormServiceInterface | null {
  switch (taskType.toLowerCase()) {
    case 'kyb':
    case 'company_kyb':
      return enhancedKybService;

    case 'ky3p':
    case 'sp_ky3p_assessment':
    case 'security':
    case 'security_assessment':
      return new StandardizedKY3PFormService(queryClient);

    case 'open_banking':
    case 'open_banking_survey':
      return openBankingFormService;

    default:
      console.warn(`Unknown task type: ${taskType}`);
      return null;
  }
}
