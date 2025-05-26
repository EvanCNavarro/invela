/**
 * ========================================
 * Company Name Uniqueness Management Utilities
 * ========================================
 * 
 * Comprehensive system for ensuring company name uniqueness in demo creation.
 * Handles duplicate detection, intelligent name generation, and professional
 * suffix management for maintaining high-quality demo experiences.
 * 
 * Key Features:
 * - Pre-creation duplicate checking
 * - Professional suffix generation
 * - Comprehensive logging for debugging
 * - Enterprise-grade error handling
 * 
 * @module company-name-utils
 * @version 1.0.0
 * @since 2025-05-26
 */

// ========================================
// IMPORTS
// ========================================

import { db } from '@db';
import { companies } from '@db/schema';
import { eq, sql } from 'drizzle-orm';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Company name uniqueness check result
 * Provides detailed feedback about name availability and suggestions
 */
interface CompanyNameCheckResult {
  isUnique: boolean;
  originalName: string;
  suggestedName?: string;
  conflictDetails?: {
    existingCompanyId: number;
    existingCompanyName: string;
    isDemo: boolean;
  };
  timestamp: string;
}

/**
 * Company name generation options
 * Allows customization of name generation behavior
 */
interface NameGenerationOptions {
  maxAttempts?: number;
  suffixStyle?: 'professional' | 'numeric' | 'hybrid';
  preserveOriginal?: boolean;
  isDemoContext?: boolean;
}

// ========================================
// CONSTANTS
// ========================================

/** Professional business suffixes for maintaining enterprise credibility */
const PROFESSIONAL_SUFFIXES = [
  'Solutions',
  'Systems', 
  'Technologies',
  'Enterprises',
  'Group',
  'Partners',
  'Holdings',
  'Capital',
  'Ventures',
  'Services',
  'Consulting',
  'Corporation',
  'Industries',
  'International',
  'Global'
] as const;

/** Geographic/descriptive modifiers for professional variation */
const PROFESSIONAL_MODIFIERS = [
  'Advanced',
  'Premier', 
  'Elite',
  'Strategic',
  'Dynamic',
  'Innovative',
  'Integrated',
  'Digital',
  'NextGen',
  'Pro'
] as const;

/** Default configuration for name generation */
const DEFAULT_GENERATION_OPTIONS: Required<NameGenerationOptions> = {
  maxAttempts: 5,
  suffixStyle: 'professional',
  preserveOriginal: true,
  isDemoContext: true,
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Enhanced logging utility for company name operations
 * Provides consistent, trackable log messages with structured data
 * 
 * @param level - Log level (info, warn, error)
 * @param operation - The operation being performed
 * @param data - Additional structured data for debugging
 */
function logCompanyNameOperation(
  level: 'info' | 'warn' | 'error',
  operation: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    module: 'CompanyNameUtils',
    operation,
    ...data,
  };

  const logMessage = `[CompanyNameUtils] ${operation}`;
  
  switch (level) {
    case 'info':
      console.log(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    case 'error':
      console.error(logMessage, logData);
      break;
  }
}

/**
 * Checks if a company name already exists in the database
 * Performs case-insensitive comparison to match database constraint
 * 
 * @param companyName - The company name to check
 * @returns Promise that resolves with detailed uniqueness information
 */
export async function checkCompanyNameUniqueness(
  companyName: string
): Promise<CompanyNameCheckResult> {
  const startTime = Date.now();
  
  logCompanyNameOperation('info', 'Starting company name uniqueness check', {
    companyName,
    nameLength: companyName.length,
  });

  try {
    // Query database for existing company with same name (case-insensitive)
    const existingCompany = await db.query.companies.findFirst({
      where: sql`LOWER(${companies.name}) = LOWER(${companyName})`,
      columns: {
        id: true,
        name: true,
        is_demo: true,
      },
    });

    const duration = Date.now() - startTime;
    const result: CompanyNameCheckResult = {
      isUnique: !existingCompany,
      originalName: companyName,
      timestamp: new Date().toISOString(),
    };

    if (existingCompany) {
      result.conflictDetails = {
        existingCompanyId: existingCompany.id,
        existingCompanyName: existingCompany.name,
        isDemo: existingCompany.is_demo || false,
      };

      logCompanyNameOperation('warn', 'Company name conflict detected', {
        companyName,
        conflictWith: existingCompany.name,
        conflictId: existingCompany.id,
        isExistingDemo: existingCompany.is_demo,
        duration,
      });
    } else {
      logCompanyNameOperation('info', 'Company name is unique and available', {
        companyName,
        duration,
      });
    }

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    
    logCompanyNameOperation('error', 'Failed to check company name uniqueness', {
      companyName,
      error: errorMessage,
      duration,
    });

    // Return pessimistic result on error
    return {
      isUnique: false,
      originalName: companyName,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Generates a professional, unique variation of a company name
 * Uses intelligent suffix and modifier combinations to maintain enterprise credibility
 * 
 * @param baseName - The original company name to modify
 * @param options - Configuration options for name generation
 * @returns Promise that resolves with a unique company name
 */
export async function generateUniqueCompanyName(
  baseName: string,
  options: NameGenerationOptions = {}
): Promise<string> {
  const config = { ...DEFAULT_GENERATION_OPTIONS, ...options };
  const startTime = Date.now();
  
  logCompanyNameOperation('info', 'Starting unique company name generation', {
    baseName,
    options: config,
  });

  // First, check if the original name is unique
  const originalCheck = await checkCompanyNameUniqueness(baseName);
  if (originalCheck.isUnique && config.preserveOriginal) {
    logCompanyNameOperation('info', 'Original name is unique, no modification needed', {
      baseName,
      duration: Date.now() - startTime,
    });
    return baseName;
  }

  // Generate variations using professional approaches
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    let candidateName: string;

    if (config.suffixStyle === 'professional') {
      if (attempt <= 2) {
        // First attempts: Add professional modifier + original name
        const modifier = PROFESSIONAL_MODIFIERS[Math.floor(Math.random() * PROFESSIONAL_MODIFIERS.length)];
        candidateName = `${modifier} ${baseName}`;
      } else {
        // Later attempts: Replace/add professional suffix
        const suffix = PROFESSIONAL_SUFFIXES[Math.floor(Math.random() * PROFESSIONAL_SUFFIXES.length)];
        // Remove common business words from original name first
        const cleanedBase = baseName.replace(/\b(Solutions|Systems|Technologies|Corp|Inc|LLC)\b/gi, '').trim();
        candidateName = `${cleanedBase} ${suffix}`;
      }
    } else if (config.suffixStyle === 'numeric') {
      candidateName = `${baseName} ${attempt}`;
    } else {
      // Hybrid approach
      if (attempt % 2 === 1) {
        const modifier = PROFESSIONAL_MODIFIERS[Math.floor(Math.random() * PROFESSIONAL_MODIFIERS.length)];
        candidateName = `${modifier} ${baseName}`;
      } else {
        candidateName = `${baseName} ${Math.floor(attempt / 2)}`;
      }
    }

    logCompanyNameOperation('info', `Testing candidate name (attempt ${attempt})`, {
      baseName,
      candidateName,
      attempt,
      maxAttempts: config.maxAttempts,
    });

    // Check if this variation is unique
    const uniquenessCheck = await checkCompanyNameUniqueness(candidateName);
    if (uniquenessCheck.isUnique) {
      const duration = Date.now() - startTime;
      logCompanyNameOperation('info', 'Successfully generated unique company name', {
        baseName,
        finalName: candidateName,
        attemptsRequired: attempt,
        duration,
      });
      return candidateName;
    }
  }

  // Fallback: Use timestamp-based suffix for guaranteed uniqueness
  const timestamp = Date.now();
  const fallbackName = `${baseName} ${timestamp}`;
  
  logCompanyNameOperation('warn', 'Using timestamp fallback for company name uniqueness', {
    baseName,
    fallbackName,
    maxAttemptsExceeded: config.maxAttempts,
    duration: Date.now() - startTime,
  });

  return fallbackName;
}

/**
 * Comprehensive company name resolution for demo creation
 * Combines uniqueness checking and intelligent name generation
 * 
 * @param requestedName - The company name requested by the user
 * @param options - Configuration options for name resolution
 * @returns Promise that resolves with unique name and metadata
 */
export async function resolveUniqueCompanyName(
  requestedName: string,
  options: NameGenerationOptions = {}
): Promise<{
  finalName: string;
  wasModified: boolean;
  originalName: string;
  metadata: {
    uniquenessCheck: CompanyNameCheckResult;
    generationAttempts?: number;
    resolutionStrategy: 'original' | 'professional_variation' | 'timestamp_fallback';
    processingTime: number;
  };
}> {
  const startTime = Date.now();
  
  logCompanyNameOperation('info', 'Starting comprehensive company name resolution', {
    requestedName,
    options,
  });

  // Step 1: Check original name uniqueness
  const uniquenessCheck = await checkCompanyNameUniqueness(requestedName);
  
  if (uniquenessCheck.isUnique) {
    const processingTime = Date.now() - startTime;
    return {
      finalName: requestedName,
      wasModified: false,
      originalName: requestedName,
      metadata: {
        uniquenessCheck,
        resolutionStrategy: 'original',
        processingTime,
      },
    };
  }

  // Step 2: Generate unique variation
  const finalName = await generateUniqueCompanyName(requestedName, options);
  const processingTime = Date.now() - startTime;
  
  // Determine strategy used
  const resolutionStrategy = finalName.includes(Date.now().toString()) 
    ? 'timestamp_fallback' 
    : 'professional_variation';

  logCompanyNameOperation('info', 'Company name resolution completed', {
    requestedName,
    finalName,
    wasModified: true,
    resolutionStrategy,
    processingTime,
  });

  return {
    finalName,
    wasModified: true,
    originalName: requestedName,
    metadata: {
      uniquenessCheck,
      resolutionStrategy,
      processingTime,
    },
  };
}