/**
 * Form Type Mapper
 * 
 * This utility provides mapping functions between client-side form types
 * and server-side schema types. It helps standardize type identifiers
 * across the system.
 */

export type ClientFormType = 'kyb' | 'ky3p' | 'open_banking' | 'card';
export type SchemaFormType = 'company_kyb' | 'kyb' | 'ky3p' | 'sp_ky3p_assessment' | 'open_banking' | 'open_banking_survey' | 'card';

/**
 * Map a client-side form type to its corresponding schema type
 * 
 * @param clientType The client-side form type (e.g., 'kyb', 'ky3p')
 * @returns The corresponding schema type for database operations
 */
export function mapClientFormTypeToSchemaType(clientType?: string): SchemaFormType {
  if (!clientType) {
    throw new Error('Form type is required');
  }
  
  const normalizedType = clientType.toLowerCase();
  
  switch (normalizedType) {
    case 'kyb':
      return 'company_kyb';
    case 'ky3p':
      return 'sp_ky3p_assessment';
    case 'open_banking':
    case 'ob':
      return 'open_banking_survey';
    case 'card':
      return 'card';
    default:
      if (isValidSchemaType(normalizedType)) {
        return normalizedType as SchemaFormType;
      }
      throw new Error(`Unknown form type: ${clientType}`);
  }
}

/**
 * Check if a given type is a valid schema type
 */
function isValidSchemaType(type: string): boolean {
  const validTypes: SchemaFormType[] = [
    'company_kyb', 
    'kyb', 
    'ky3p', 
    'sp_ky3p_assessment', 
    'open_banking', 
    'open_banking_survey', 
    'card'
  ];
  
  return validTypes.includes(type as SchemaFormType);
}

/**
 * Map a schema type to its client-side form type
 * 
 * @param schemaType The schema type from the database
 * @returns The corresponding client-side form type
 */
export function mapSchemaTypeToClientFormType(schemaType?: string): ClientFormType {
  if (!schemaType) {
    throw new Error('Schema type is required');
  }
  
  const normalizedType = schemaType.toLowerCase();
  
  switch (normalizedType) {
    case 'company_kyb':
    case 'kyb':
      return 'kyb';
    case 'ky3p':
    case 'sp_ky3p_assessment':
      return 'ky3p';
    case 'open_banking':
    case 'open_banking_survey':
      return 'open_banking';
    case 'card':
      return 'card';
    default:
      throw new Error(`Unknown schema type: ${schemaType}`);
  }
}