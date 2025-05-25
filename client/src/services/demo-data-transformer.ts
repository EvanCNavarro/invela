/**
 * ========================================
 * Demo Data Transformer Service
 * ========================================
 * 
 * Transforms user persona selections and customization choices into 
 * proper API payloads for company creation, user setup, and authentication.
 * Implements persona-based logic and feature flags for authentic demo experiences.
 * 
 * Key Features:
 * - Persona-based payload generation (4 distinct user types)
 * - Dynamic field inclusion based on persona requirements
 * - Risk profile and company size handling for advanced personas
 * - Email generation and validation logic
 * - Comprehensive logging for debugging and monitoring
 * 
 * Dependencies:
 * - TypeScript interfaces for type safety
 * - Persona configuration constants
 * - Logger utility for debugging
 * 
 * @module services/demo-data-transformer
 * @version 1.0.0
 * @since 2025-05-25
 */

// ========================================
// IMPORTS
// ========================================

import { logger } from '@/lib/logger';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * User selections from demo Steps 1 & 2
 * Complete input data structure for transformation
 */
export interface DemoSelections {
  // Step 1: Persona Selection
  persona: 'new-data-recipient' | 'accredited-data-recipient' | 'data-provider' | 'invela-admin';
  
  // Step 2: Customization Options
  companyName: string;
  companyNameControl: 'random' | 'custom';
  userFullName: string;
  userFullNameControl: 'random' | 'custom';
  userEmail: string;
  emailInviteEnabled: boolean;
  isDemoCompany: boolean;
  
  // Persona-specific fields
  riskProfile?: number;  // Only for accredited-data-recipient
  riskProfileControl?: 'random' | 'custom';
  companySize?: 'small' | 'medium' | 'large';  // Only for accredited-data-recipient
}

/**
 * Company creation API payload structure
 * Matches server/demo-api.ts expected format
 */
export interface CompanyCreationPayload {
  name: string;
  type: 'demo' | 'live';
  persona: string;
  riskProfile?: number;
  companySize?: string;
  metadata: {
    createdViaDemo: boolean;
    persona: string;
    setupTimestamp: string;
    isDemoAccount?: boolean;
    features: PersonaFeatures;
  };
}

/**
 * User creation API payload structure
 * Handles role assignment and permissions
 */
export interface UserCreationPayload {
  fullName: string;
  email: string;
  role: string;
  permissions: string;
  companyId: string;
  metadata: {
    createdViaDemo: boolean;
    tempPassword: string;
    setupTimestamp: string;
    persona: string;
  };
}

/**
 * Authentication setup payload structure
 * Configures login credentials and security
 */
export interface AuthSetupPayload {
  userId: string;
  email: string;
  generateCredentials: boolean;
  securityLevel: 'standard' | 'enhanced' | 'admin';
  metadata: {
    persona: string;
    setupTimestamp: string;
  };
}

/**
 * Email invitation payload structure
 * Sends welcome emails with persona-specific content
 */
export interface EmailInvitationPayload {
  userEmail: string;
  userName: string;
  companyName: string;
  loginCredentials: {
    email: string;
    tempPassword: string;
    loginUrl: string;
  };
  emailTemplate: string;
  metadata: {
    persona: string;
    setupTimestamp: string;
  };
}

/**
 * Persona-specific feature configuration
 * Determines what capabilities each persona gets
 */
export interface PersonaFeatures {
  needsRiskProfile: boolean;
  needsCompanySize: boolean;
  allowsDemoData: boolean;
  isAdminLevel: boolean;
  requiresEnhancedSecurity: boolean;
  defaultRole: string;
  permissionLevel: string;
  emailTemplate: string;
}

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

/**
 * Persona feature matrix
 * Defines capabilities and requirements for each user type
 */
const PERSONA_FEATURES: Record<string, PersonaFeatures> = {
  'new-data-recipient': {
    needsRiskProfile: false,
    needsCompanySize: false,
    allowsDemoData: true,
    isAdminLevel: false,
    requiresEnhancedSecurity: false,
    defaultRole: 'user',
    permissionLevel: 'basic',
    emailTemplate: 'new_user_welcome'
  },
  'accredited-data-recipient': {
    needsRiskProfile: true,
    needsCompanySize: true,
    allowsDemoData: false,
    isAdminLevel: false,
    requiresEnhancedSecurity: false,
    defaultRole: 'accredited_user',
    permissionLevel: 'enhanced',
    emailTemplate: 'accredited_user_welcome'
  },
  'data-provider': {
    needsRiskProfile: false,
    needsCompanySize: false,
    allowsDemoData: false,
    isAdminLevel: false,
    requiresEnhancedSecurity: true,
    defaultRole: 'provider',
    permissionLevel: 'provider',
    emailTemplate: 'provider_welcome'
  },
  'invela-admin': {
    needsRiskProfile: false,
    needsCompanySize: false,
    allowsDemoData: false,
    isAdminLevel: true,
    requiresEnhancedSecurity: true,
    defaultRole: 'admin',
    permissionLevel: 'admin',
    emailTemplate: 'admin_welcome'
  }
};

/**
 * Default temporary password for demo accounts
 * In production, this should use secure random generation
 */
const DEFAULT_TEMP_PASSWORD = 'demo123';

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generates email address from user name and company name
 * Creates realistic, formatted email addresses for demo accounts
 * 
 * @param fullName - User's full name
 * @param companyName - Company name for domain
 * @returns Formatted email address
 */
function generateEmailAddress(fullName: string, companyName: string): string {
  logger.info('[DemoDataTransformer] Generating email address', { fullName, companyName });
  
  // Parse name parts
  const nameParts = fullName.toLowerCase().split(' ');
  const firstName = nameParts[0] || 'user';
  const lastName = nameParts[1] || nameParts[0];
  
  // Clean and format company name for domain
  const domainName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .substring(0, 20); // Limit length
  
  const email = `${firstName.charAt(0)}${lastName}@${domainName}.com`;
  
  logger.info('[DemoDataTransformer] Generated email address', { email });
  return email;
}

/**
 * Gets persona-specific features configuration
 * 
 * @param persona - Selected persona type
 * @returns Feature configuration object
 */
function getPersonaFeatures(persona: string): PersonaFeatures {
  const features = PERSONA_FEATURES[persona];
  
  if (!features) {
    logger.warn('[DemoDataTransformer] Unknown persona, using default features', { persona });
    return PERSONA_FEATURES['new-data-recipient'];
  }
  
  logger.info('[DemoDataTransformer] Retrieved persona features', { persona, features });
  return features;
}

/**
 * Determines security level based on persona
 * 
 * @param persona - Selected persona type
 * @returns Security level configuration
 */
function getSecurityLevel(persona: string): 'standard' | 'enhanced' | 'admin' {
  const features = getPersonaFeatures(persona);
  
  if (features.isAdminLevel) return 'admin';
  if (features.requiresEnhancedSecurity) return 'enhanced';
  return 'standard';
}

// ========================================
// MAIN TRANSFORMATION FUNCTIONS
// ========================================

/**
 * Transforms user selections into company creation payload
 * Handles persona-specific company configuration and feature flags
 * 
 * @param selections - User selections from demo flow
 * @returns Company creation API payload
 */
export function transformToCompanyPayload(selections: DemoSelections): CompanyCreationPayload {
  logger.info('[DemoDataTransformer] Transforming company payload', { 
    persona: selections.persona,
    companyName: selections.companyName 
  });
  
  const features = getPersonaFeatures(selections.persona);
  const timestamp = new Date().toISOString();
  
  const payload: CompanyCreationPayload = {
    name: selections.companyName,
    type: selections.isDemoCompany && features.allowsDemoData ? 'demo' : 'live',
    persona: selections.persona,
    metadata: {
      createdViaDemo: true,
      persona: selections.persona,
      setupTimestamp: timestamp,
      features
    }
  };
  
  // Add persona-specific fields
  if (features.needsRiskProfile && selections.riskProfile !== undefined) {
    payload.riskProfile = selections.riskProfile;
    logger.info('[DemoDataTransformer] Added risk profile to payload', { 
      riskProfile: selections.riskProfile 
    });
  }
  
  if (features.needsCompanySize && selections.companySize) {
    payload.companySize = selections.companySize;
    logger.info('[DemoDataTransformer] Added company size to payload', { 
      companySize: selections.companySize 
    });
  }
  
  if (payload.type === 'demo') {
    payload.metadata.isDemoAccount = true;
    logger.info('[DemoDataTransformer] Configured as demo account');
  }
  
  logger.info('[DemoDataTransformer] Company payload transformation complete', { payload });
  return payload;
}

/**
 * Transforms user selections into user creation payload
 * Handles role assignment and permissions based on persona
 * 
 * @param selections - User selections from demo flow
 * @param companyId - ID from company creation step
 * @returns User creation API payload
 */
export function transformToUserPayload(
  selections: DemoSelections, 
  companyId: string
): UserCreationPayload {
  logger.info('[DemoDataTransformer] Transforming user payload', { 
    persona: selections.persona,
    fullName: selections.userFullName,
    companyId 
  });
  
  const features = getPersonaFeatures(selections.persona);
  const timestamp = new Date().toISOString();
  
  // Generate email if not provided
  const email = selections.userEmail || generateEmailAddress(
    selections.userFullName, 
    selections.companyName
  );
  
  const payload: UserCreationPayload = {
    fullName: selections.userFullName,
    email,
    role: features.defaultRole,
    permissions: features.permissionLevel,
    companyId,
    metadata: {
      createdViaDemo: true,
      tempPassword: DEFAULT_TEMP_PASSWORD,
      setupTimestamp: timestamp,
      persona: selections.persona
    }
  };
  
  logger.info('[DemoDataTransformer] User payload transformation complete', { 
    role: payload.role,
    permissions: payload.permissions,
    email: payload.email 
  });
  
  return payload;
}

/**
 * Transforms user selections into authentication setup payload
 * Configures security level and login credentials
 * 
 * @param selections - User selections from demo flow
 * @param userId - ID from user creation step
 * @returns Authentication setup API payload
 */
export function transformToAuthPayload(
  selections: DemoSelections, 
  userId: string
): AuthSetupPayload {
  logger.info('[DemoDataTransformer] Transforming auth payload', { 
    persona: selections.persona,
    userId 
  });
  
  const securityLevel = getSecurityLevel(selections.persona);
  const timestamp = new Date().toISOString();
  
  // Generate email if not provided
  const email = selections.userEmail || generateEmailAddress(
    selections.userFullName, 
    selections.companyName
  );
  
  const payload: AuthSetupPayload = {
    userId,
    email,
    generateCredentials: true,
    securityLevel,
    metadata: {
      persona: selections.persona,
      setupTimestamp: timestamp
    }
  };
  
  logger.info('[DemoDataTransformer] Auth payload transformation complete', { 
    securityLevel,
    email: payload.email 
  });
  
  return payload;
}

/**
 * Transforms user selections into email invitation payload
 * Creates persona-specific welcome email configuration
 * 
 * @param selections - User selections from demo flow
 * @param credentials - Login credentials from auth setup
 * @returns Email invitation API payload
 */
export function transformToEmailPayload(
  selections: DemoSelections,
  credentials: { email: string; tempPassword: string; loginUrl: string }
): EmailInvitationPayload {
  logger.info('[DemoDataTransformer] Transforming email payload', { 
    persona: selections.persona,
    userEmail: credentials.email 
  });
  
  const features = getPersonaFeatures(selections.persona);
  const timestamp = new Date().toISOString();
  
  const payload: EmailInvitationPayload = {
    userEmail: credentials.email,
    userName: selections.userFullName,
    companyName: selections.companyName,
    loginCredentials: credentials,
    emailTemplate: features.emailTemplate,
    metadata: {
      persona: selections.persona,
      setupTimestamp: timestamp
    }
  };
  
  logger.info('[DemoDataTransformer] Email payload transformation complete', { 
    emailTemplate: payload.emailTemplate,
    userEmail: payload.userEmail 
  });
  
  return payload;
}

/**
 * Validates demo selections before transformation
 * Ensures all required fields are present for the selected persona
 * 
 * @param selections - User selections to validate
 * @returns Validation result with errors if any
 */
export function validateDemoSelections(selections: DemoSelections): {
  isValid: boolean;
  errors: string[];
} {
  logger.info('[DemoDataTransformer] Validating demo selections', { 
    persona: selections.persona 
  });
  
  const errors: string[] = [];
  const features = getPersonaFeatures(selections.persona);
  
  // Required field validations
  if (!selections.companyName?.trim()) {
    errors.push('Company name is required');
  }
  
  if (!selections.userFullName?.trim()) {
    errors.push('User full name is required');
  }
  
  // Persona-specific validations
  if (features.needsRiskProfile && selections.riskProfile === undefined) {
    errors.push('Risk profile is required for accredited data recipients');
  }
  
  if (features.needsCompanySize && !selections.companySize) {
    errors.push('Company size is required for accredited data recipients');
  }
  
  if (selections.riskProfile !== undefined) {
    if (selections.riskProfile < 1 || selections.riskProfile > 100) {
      errors.push('Risk profile must be between 1 and 100');
    }
  }
  
  const isValid = errors.length === 0;
  
  logger.info('[DemoDataTransformer] Validation complete', { 
    isValid,
    errorCount: errors.length 
  });
  
  if (!isValid) {
    logger.warn('[DemoDataTransformer] Validation failed', { errors });
  }
  
  return { isValid, errors };
}

// ========================================
// EXPORTED UTILITIES
// ========================================

/**
 * Gets the complete transformation pipeline for a persona
 * Returns all payload transformers needed for the selected persona
 * 
 * @param persona - Selected persona type
 * @returns Object with all required transformation functions
 */
export function getPersonaTransformationPipeline(persona: string) {
  const features = getPersonaFeatures(persona);
  
  return {
    features,
    transformCompany: transformToCompanyPayload,
    transformUser: transformToUserPayload,
    transformAuth: transformToAuthPayload,
    transformEmail: transformToEmailPayload,
    validate: validateDemoSelections
  };
}

/**
 * Default export for convenient importing
 */
export default {
  transformToCompanyPayload,
  transformToUserPayload,
  transformToAuthPayload,
  transformToEmailPayload,
  validateDemoSelections,
  getPersonaTransformationPipeline
};