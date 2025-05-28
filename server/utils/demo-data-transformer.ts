/**
 * ========================================
 * Demo Data Transformation Utilities
 * ========================================
 * 
 * Comprehensive data transformation and validation utilities for the demo system.
 * Handles persona mapping, payload transformation, and data consistency between
 * frontend and backend demo processes.
 * 
 * Key Features:
 * - Persona value normalization (frontend ↔ backend mapping)
 * - Company category mapping based on personas
 * - Network size validation and transformation
 * - Comprehensive logging for debugging and monitoring
 * 
 * Dependencies:
 * - None (pure transformation utilities)
 * 
 * @module DemoDataTransformer
 * @version 1.0.0
 * @since 2025-05-28
 */

// ========================================
// TYPES & INTERFACES
// ========================================

interface PersonaMapping {
  frontendValue: string;
  backendValue: string;
  category: 'Bank' | 'FinTech';
  defaultNetworkSize?: number;
}

interface DemoCompanyPayload {
  name: string;
  persona: string;
  networkSize?: number;
}

interface TransformedCompanyData {
  name: string;
  persona: string;
  category: 'Bank' | 'FinTech';
  networkSize: number;
  shouldCreateNetwork: boolean;
}

interface DemoUserPayload {
  fullName: string;
  email: string;
  companyId: string | number;
  role?: string;
  persona: string;
}

interface TransformedUserData {
  fullName: string;
  email: string;
  companyId: number;
  role: string;
  persona: string;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Mapping between frontend persona values and backend expectations
 * Ensures consistent data transformation across the demo system
 */
const PERSONA_MAPPINGS: Record<string, PersonaMapping> = {
  'data-provider': {
    frontendValue: 'data-provider',
    backendValue: 'Data Provider',
    category: 'Bank',
    defaultNetworkSize: 5
  },
  'new-data-recipient': {
    frontendValue: 'new-data-recipient',
    backendValue: 'New Data Recipient',
    category: 'FinTech',
    defaultNetworkSize: 0
  },
  'accredited-data-recipient': {
    frontendValue: 'accredited-data-recipient',
    backendValue: 'Accredited Data Recipient',
    category: 'FinTech',
    defaultNetworkSize: 0
  },
  'invela-admin': {
    frontendValue: 'invela-admin',
    backendValue: 'Invela Admin',
    category: 'FinTech',
    defaultNetworkSize: 0
  }
};

const DEFAULT_NETWORK_SIZE = 5;
const MAX_NETWORK_SIZE = 15;
const MIN_NETWORK_SIZE = 0;

// ========================================
// UTILITY LOGGER
// ========================================

/**
 * Specialized logging utility for demo data transformation
 * Provides structured logging with clear transformation tracking
 */
class DemoTransformLogger {
  private static logPrefix = '[DemoTransformer]';

  /**
   * Log persona transformation with before/after values
   */
  static logPersonaTransformation(original: string, transformed: string, category: string): void {
    console.log(`${this.logPrefix} 🔄 Persona transformation:`, {
      original,
      transformed,
      category,
      mappingFound: !!PERSONA_MAPPINGS[original],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log company data transformation with comprehensive details
   */
  static logCompanyTransformation(
    input: DemoCompanyPayload,
    output: TransformedCompanyData
  ): void {
    console.log(`${this.logPrefix} 🏢 Company data transformation:`, {
      input: {
        name: input.name,
        persona: input.persona,
        networkSize: input.networkSize
      },
      output: {
        name: output.name,
        persona: output.persona,
        category: output.category,
        networkSize: output.networkSize,
        shouldCreateNetwork: output.shouldCreateNetwork
      },
      transformationSuccess: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log user data transformation with validation results
   */
  static logUserTransformation(
    input: DemoUserPayload,
    output: TransformedUserData
  ): void {
    console.log(`${this.logPrefix} 👤 User data transformation:`, {
      input: {
        fullName: input.fullName,
        email: input.email,
        companyId: input.companyId,
        companyIdType: typeof input.companyId,
        persona: input.persona
      },
      output: {
        fullName: output.fullName,
        email: output.email,
        companyId: output.companyId,
        companyIdType: typeof output.companyId,
        role: output.role,
        persona: output.persona
      },
      companyIdTransformed: input.companyId !== output.companyId,
      transformationSuccess: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log transformation errors with detailed context
   */
  static logTransformationError(
    type: 'persona' | 'company' | 'user',
    input: unknown,
    error: string
  ): void {
    console.error(`${this.logPrefix} ❌ ${type} transformation failed:`, {
      type,
      input,
      error,
      availablePersonas: Object.keys(PERSONA_MAPPINGS),
      timestamp: new Date().toISOString()
    });
  }
}

// ========================================
// PERSONA TRANSFORMATION FUNCTIONS
// ========================================

/**
 * Transform frontend persona value to backend-expected format
 * 
 * @param frontendPersona - The persona value from the frontend form
 * @returns The normalized persona value expected by the backend
 * 
 * @example
 * transformPersonaValue('data-provider') // Returns 'Data Provider'
 */
export function transformPersonaValue(frontendPersona: string): string {
  const mapping = PERSONA_MAPPINGS[frontendPersona];
  
  if (!mapping) {
    DemoTransformLogger.logTransformationError('persona', frontendPersona, 
      `Unknown persona: ${frontendPersona}`);
    throw new Error(`Invalid persona value: ${frontendPersona}`);
  }

  DemoTransformLogger.logPersonaTransformation(
    frontendPersona,
    mapping.backendValue,
    mapping.category
  );

  return mapping.backendValue;
}

/**
 * Get company category based on persona
 * 
 * @param persona - The persona value (frontend or backend format)
 * @returns The company category ('Bank' or 'FinTech')
 */
export function getPersonaCategory(persona: string): 'Bank' | 'FinTech' {
  // Check if it's a frontend persona value
  const frontendMapping = PERSONA_MAPPINGS[persona];
  if (frontendMapping) {
    return frontendMapping.category;
  }

  // Check if it's a backend persona value
  const backendMapping = Object.values(PERSONA_MAPPINGS)
    .find(mapping => mapping.backendValue === persona);
  
  if (backendMapping) {
    return backendMapping.category;
  }

  // Default fallback for unknown personas
  DemoTransformLogger.logTransformationError('persona', persona, 
    'Unknown persona, defaulting to FinTech category');
  return 'FinTech';
}

/**
 * Validate and normalize network size value
 * 
 * @param networkSize - The network size from the frontend
 * @param persona - The persona to determine default values
 * @returns Validated network size within acceptable bounds
 */
export function validateNetworkSize(
  networkSize: number | undefined,
  persona: string
): number {
  // Get default network size for persona
  const mapping = PERSONA_MAPPINGS[persona];
  const defaultSize = mapping?.defaultNetworkSize ?? DEFAULT_NETWORK_SIZE;

  // Use provided value or default
  const requestedSize = networkSize ?? defaultSize;

  // Ensure within bounds
  const validatedSize = Math.max(
    MIN_NETWORK_SIZE,
    Math.min(MAX_NETWORK_SIZE, requestedSize)
  );

  console.log(`${DemoTransformLogger['logPrefix']} 🔢 Network size validation:`, {
    requested: networkSize,
    persona,
    defaultForPersona: defaultSize,
    validated: validatedSize,
    wasAdjusted: requestedSize !== validatedSize
  });

  return validatedSize;
}

// ========================================
// COMPANY DATA TRANSFORMATION
// ========================================

/**
 * Transform company creation payload from frontend to backend format
 * 
 * @param payload - Raw payload from frontend demo form
 * @returns Transformed data ready for backend processing
 * 
 * @example
 * const transformed = transformCompanyData({
 *   name: 'Metro Bank',
 *   persona: 'data-provider',
 *   networkSize: 7
 * });
 */
export function transformCompanyData(payload: DemoCompanyPayload): TransformedCompanyData {
  try {
    // Transform persona value
    const transformedPersona = transformPersonaValue(payload.persona);
    
    // Get category based on persona
    const category = getPersonaCategory(payload.persona);
    
    // Validate network size
    const networkSize = validateNetworkSize(payload.networkSize, payload.persona);
    
    // Determine if network creation is needed
    const shouldCreateNetwork = category === 'Bank' && networkSize > 0;

    const transformedData: TransformedCompanyData = {
      name: payload.name,
      persona: transformedPersona,
      category,
      networkSize,
      shouldCreateNetwork
    };

    DemoTransformLogger.logCompanyTransformation(payload, transformedData);
    
    return transformedData;
  } catch (error: any) {
    DemoTransformLogger.logTransformationError('company', payload, error.message);
    throw error;
  }
}

// ========================================
// USER DATA TRANSFORMATION
// ========================================

/**
 * Transform user creation payload from frontend to backend format
 * 
 * @param payload - Raw payload from frontend demo form
 * @param actualCompanyId - The real company ID from company creation step
 * @returns Transformed data ready for backend processing
 */
export function transformUserData(
  payload: DemoUserPayload,
  actualCompanyId: number
): TransformedUserData {
  try {
    // Handle company ID transformation
    let companyId: number;
    
    if (typeof payload.companyId === 'string' && payload.companyId === 'COMPANY_ID_FROM_STEP_1') {
      // Replace placeholder with actual ID
      companyId = actualCompanyId;
    } else if (typeof payload.companyId === 'number') {
      companyId = payload.companyId;
    } else if (typeof payload.companyId === 'string' && !isNaN(Number(payload.companyId))) {
      companyId = Number(payload.companyId);
    } else {
      throw new Error(`Invalid companyId format: ${payload.companyId}`);
    }

    // Transform persona if needed
    const transformedPersona = payload.persona.includes('-') 
      ? transformPersonaValue(payload.persona)
      : payload.persona;

    // Determine role based on persona
    const role = getPersonaCategory(payload.persona) === 'Bank' ? 'provider' : 'recipient';

    const transformedData: TransformedUserData = {
      fullName: payload.fullName,
      email: payload.email,
      companyId,
      role: payload.role || role,
      persona: transformedPersona
    };

    DemoTransformLogger.logUserTransformation(payload, transformedData);
    
    return transformedData;
  } catch (error: any) {
    DemoTransformLogger.logTransformationError('user', payload, error.message);
    throw error;
  }
}

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate that a persona value is supported
 * 
 * @param persona - The persona value to validate
 * @returns True if persona is valid, false otherwise
 */
export function isValidPersona(persona: string): boolean {
  return persona in PERSONA_MAPPINGS || 
    Object.values(PERSONA_MAPPINGS).some(mapping => mapping.backendValue === persona);
}

/**
 * Get all available persona options for frontend display
 * 
 * @returns Array of persona mapping objects for frontend use
 */
export function getAvailablePersonas(): PersonaMapping[] {
  return Object.values(PERSONA_MAPPINGS);
}

/**
 * Debug utility to log current transformation state
 * Used for troubleshooting demo flow issues
 */
export function debugTransformationState(): void {
  console.log(`${DemoTransformLogger['logPrefix']} 🐛 Debug transformation state:`, {
    availablePersonas: Object.keys(PERSONA_MAPPINGS),
    personaMappings: PERSONA_MAPPINGS,
    networkSizeLimits: {
      min: MIN_NETWORK_SIZE,
      max: MAX_NETWORK_SIZE,
      default: DEFAULT_NETWORK_SIZE
    },
    timestamp: new Date().toISOString()
  });
}