/**
 * Form Type Mapper
 * 
 * This utility provides a standardized way to map form types between
 * different parts of the system, ensuring consistent form type names
 * regardless of where they're used.
 */

/**
 * Map client-side form types to database/schema task types
 * 
 * This function ensures that form types used in API calls are correctly
 * mapped to the expected enum values in the database schema.
 * 
 * @param clientFormType The form type as used in client/API (e.g., 'ky3p', 'kyb', 'open_banking')
 * @returns The corresponding database schema type (e.g., 'sp_ky3p_assessment', 'company_kyb', 'open_banking')
 */
export function mapClientFormTypeToSchemaType(clientFormType: string): string {
  // Normalize form type to lowercase
  const normalizedType = clientFormType.toLowerCase().trim();
  
  // Map client-side form types to schema types
  const typeMap: Record<string, string> = {
    'kyb': 'company_kyb',
    'ky3p': 'sp_ky3p_assessment',
    'open_banking': 'open_banking_survey',  // Fixed incorrect mapping
    'card': 'company_card',
  };
  
  // Return the mapped type or the original if no mapping exists
  return typeMap[normalizedType] || normalizedType;
}

/**
 * Map schema/database task types to client-side form types
 * 
 * This function does the reverse mapping, converting database schema task types
 * to the simplified form types used in the client.
 * 
 * @param schemaTaskType The task type as stored in the database (e.g., 'sp_ky3p_assessment')
 * @returns The corresponding client-side form type (e.g., 'ky3p')
 */
export function mapSchemaTypeToClientFormType(schemaTaskType: string): string {
  // Normalize form type to lowercase
  const normalizedType = schemaTaskType.toLowerCase().trim();
  
  // Map schema types to client-side form types
  const typeMap: Record<string, string> = {
    'company_kyb': 'kyb',
    'sp_ky3p_assessment': 'ky3p',
    'open_banking_survey': 'open_banking',  // Fixed incorrect mapping
    'company_card': 'card',
  };
  
  // Return the mapped type or the original if no mapping exists
  return typeMap[normalizedType] || normalizedType;
}