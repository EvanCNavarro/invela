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
  lengthPreference?: 'long' | 'short' | 'mixed';
  /** 
   * Persona type for specialized name generation
   * Used to apply persona-specific naming rules (e.g., banking suffixes for data-provider)
   */
  persona?: string;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * Blacklisted words that should never appear in company names
 * Categorized by issue type for clarity and maintenance
 */
const COMPANY_NAME_BLACKLIST = [
  // Illegal/Criminal Activities
  'anonymous', 'mixer', 'blackmarket', 'black-market', 'heist', 'dark', 'darkpool', 'exit', 'scam', 'silkroad', 'silk-road', 'underground',
  
  // Gambling/Addiction
  'gambling', 'casino', 'addiction', 'degenerate', 'degeneratefi', 'degenfi',
  
  // Scams/Fraud
  'sharks', 'ponzi', 'scheme', 'mlm', 'moonshot', 'rugpull', 'rug-pull', 'scamcoin',
  
  // High Risk/Negative
  'shelter', 'leverage', 'max', 'risky', 'volatility', 'volatile',
  
  // Meme/Unprofessional
  'meme', 'memecoin', 'memetoken', 'farm', 'yield-farm', 'gamefi', 'game-fi', 'flash', 'flashloan', 'flash-loan'
] as const;

// ========================================
// ADVANCED NAME GENERATION POOLS
// ========================================

/**
 * Comprehensive company name component pools for generating unique, professional names.
 * Architecture: PREFIX + CORE + SUFFIX combinations providing 10,000+ unique possibilities.
 * 
 * Design Philosophy:
 * - Maintain enterprise credibility and professional appearance
 * - Support persona-specific generation (FinTech, Banking, etc.)
 * - Enable contextual combinations that make business sense
 * - Provide fallback compatibility with existing generation logic
 */

/**
 * Industry-focused prefix pool (50+ options)
 * Conveys scale, quality, innovation, and market position
 */
const ADVANCED_NAME_PREFIXES = [
  // Premium Scale & Authority
  'Apex', 'Summit', 'Pinnacle', 'Zenith', 'Crown', 'Elite', 'Premier',
  'Sovereign', 'Paramount', 'Supreme', 'Platinum', 'Diamond', 'Sterling',
  
  // Innovation & Technology
  'Quantum', 'Digital', 'Smart', 'Intelligent', 'Advanced', 'NextGen',
  'Future', 'Progressive', 'Dynamic', 'Adaptive', 'Neural', 'Cyber',
  
  // Geographic & Network Scale
  'Global', 'International', 'Continental', 'Metropolitan', 'Regional',
  'Central', 'National', 'United', 'Allied', 'Network', 'Consortium',
  
  // Trust & Quality Indicators
  'Meridian', 'Cornerstone', 'Foundation', 'Keystone', 'Benchmark',
  'Optimal', 'Precision', 'Integrity', 'Verified', 'Certified', 'Standard',
  
  // Modern Business Connectivity
  'Nexus', 'Catalyst', 'Synergy', 'Momentum', 'Velocity', 'Bridge',
  'Connect', 'Link', 'Flow', 'Stream', 'Wave', 'Edge', 'Core'
] as const;

/**
 * Core business domain pool (60+ options)
 * Represents primary business focus, industry vertical, and service domain
 */
const ADVANCED_NAME_CORES = [
  // Financial Services & Investment
  'Capital', 'Wealth', 'Asset', 'Investment', 'Finance', 'Funding',
  'Credit', 'Banking', 'Treasury', 'Portfolio', 'Equity', 'Securities',
  'Trust', 'Reserve', 'Exchange', 'Market', 'Trading', 'Broker',
  
  // Technology & Data Intelligence
  'Data', 'Analytics', 'Intelligence', 'Insights', 'Systems', 'Platform',
  'Technology', 'Cloud', 'Security', 'Protection', 'Shield', 'Guard',
  'Network', 'Infrastructure', 'Architecture', 'Framework', 'Engine',
  
  // Professional & Advisory Services
  'Advisory', 'Consulting', 'Strategy', 'Management', 'Operations',
  'Performance', 'Excellence', 'Quality', 'Standards', 'Compliance',
  'Governance', 'Risk', 'Audit', 'Assessment', 'Evaluation',
  
  // Innovation & Development
  'Solutions', 'Innovation', 'Research', 'Development', 'Engineering',
  'Design', 'Creation', 'Build', 'Forge', 'Lab', 'Studio', 'Works'
] as const;

/**
 * Professional suffix pool (40+ options)
 * Provides business structure classification and industry context
 */
const ADVANCED_NAME_SUFFIXES = [
  // Traditional Corporate Structures
  'Corporation', 'Enterprises', 'Holdings', 'Industries', 'International',
  'Worldwide', 'Global', 'Consolidated', 'Integrated', 'United',
  
  // Professional Service Organizations
  'Partners', 'Associates', 'Advisors', 'Consultants', 'Specialists',
  'Professionals', 'Experts', 'Authorities', 'Leaders', 'Champions',
  
  // Modern Business Collectives
  'Group', 'Collective', 'Alliance', 'Network', 'Consortium',
  'Federation', 'Union', 'Council', 'Institute', 'Foundation',
  
  // Technology & Innovation Focus
  'Systems', 'Technologies', 'Solutions', 'Platforms', 'Labs',
  'Studios', 'Works', 'Hub', 'Center', 'Core', 'Base', 'Edge'
] as const;

/**
 * Legacy professional suffixes for backward compatibility
 * Maintained for existing generation logic and gradual migration
 */
const PROFESSIONAL_SUFFIXES = [
  'Solutions', 'Systems', 'Technologies', 'Enterprises', 'Group',
  'Partners', 'Holdings', 'Capital', 'Ventures', 'Services',
  'Consulting', 'Corporation', 'Industries', 'International', 'Global'
] as const;

/**
 * Legacy professional modifiers for backward compatibility
 * Maintained for existing generation logic and gradual migration
 */
const PROFESSIONAL_MODIFIERS = [
  'Advanced', 'Premier', 'Elite', 'Strategic', 'Dynamic',
  'Innovative', 'Integrated', 'Digital', 'NextGen', 'Pro'
] as const;

/**
 * Banking-specific suffix pool for Data Provider persona
 * Ensures all banking institutions have appropriate industry-standard suffixes
 */
const BANKING_SUFFIXES = [
  'Bank',
  'Credit Union'
] as const;

/** Default configuration for name generation */
const DEFAULT_GENERATION_OPTIONS: Required<Omit<NameGenerationOptions, 'persona'>> & Pick<NameGenerationOptions, 'persona'> = {
  maxAttempts: 5,
  suffixStyle: 'professional',
  preserveOriginal: true,
  isDemoContext: true,
  lengthPreference: 'mixed',
  persona: 'default',
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Checks if a company name contains any blacklisted words
 * Performs case-insensitive matching to catch variations
 * 
 * @param companyName - The company name to validate
 * @returns True if the name is clean, false if it contains blacklisted words
 */
function isCompanyNameClean(companyName: string): boolean {
  const normalizedName = companyName.toLowerCase().replace(/[\s-_]/g, '');
  
  for (const blacklistedWord of COMPANY_NAME_BLACKLIST) {
    const normalizedBlacklistWord = blacklistedWord.toLowerCase().replace(/[\s-_]/g, '');
    if (normalizedName.includes(normalizedBlacklistWord)) {
      logCompanyNameOperation('warn', 'Blacklisted word detected in company name', {
        companyName,
        blacklistedWord,
        normalizedName,
        normalizedBlacklistWord,
      });
      return false;
    }
  }
  
  return true;
}

// ========================================
// ADVANCED NAME GENERATION FUNCTIONS
// ========================================

/**
 * Generates a short portmanteau company name by fusing two components
 * Creates brand-style names like "Firefox" or "LimeWire"
 * 
 * @returns A short, fused company name
 */
function generateShortPortmanteauName(): string {
  const patterns = [
    // Pattern A: PREFIX + CORE fusion (e.g., "StreamPay")
    () => {
      const prefix = ADVANCED_NAME_PREFIXES[Math.floor(Math.random() * ADVANCED_NAME_PREFIXES.length)];
      const core = ADVANCED_NAME_CORES[Math.floor(Math.random() * ADVANCED_NAME_CORES.length)];
      return `${prefix}${core}`;
    },
    // Pattern B: CORE + SUFFIX fusion (e.g., "CapitalCore")
    () => {
      const core = ADVANCED_NAME_CORES[Math.floor(Math.random() * ADVANCED_NAME_CORES.length)];
      const suffix = ADVANCED_NAME_SUFFIXES[Math.floor(Math.random() * ADVANCED_NAME_SUFFIXES.length)];
      return `${core}${suffix}`;
    }
  ];
  
  const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
  return selectedPattern();
}

/**
 * Generates banking-specific company names with appropriate suffixes
 * Ensures Data Provider personas receive industry-standard banking names
 * 
 * @param baseName - Original company name for context (unused for banking)
 * @param attempt - Generation attempt number for strategy variation
 * @param options - Configuration options including length preference
 * @returns Promise that resolves with a banking company name
 */
async function generateBankingCompanyName(
  baseName: string,
  attempt: number,
  options: NameGenerationOptions
): Promise<string> {
  logCompanyNameOperation('info', 'Generating banking-specific company name', {
    baseName,
    attempt,
    strategy: 'banking',
    lengthPreference: options.lengthPreference,
  });

  // Determine short vs long name generation (50/50 mix like existing system)
  const useShortName = options.lengthPreference === 'short' || 
                      (options.lengthPreference === 'mixed' && Math.random() < 0.5);

  // Select banking suffix randomly
  const bankingSuffix = BANKING_SUFFIXES[Math.floor(Math.random() * BANKING_SUFFIXES.length)];

  let generatedName: string;
  let attempts = 0;
  const maxValidationAttempts = 10;

  do {
    if (useShortName) {
      // Short format: Single core word + banking suffix
      const core = ADVANCED_NAME_CORES[Math.floor(Math.random() * ADVANCED_NAME_CORES.length)];
      generatedName = `${core} ${bankingSuffix}`;
    } else {
      // Long format: Prefix + banking suffix
      const prefix = ADVANCED_NAME_PREFIXES[Math.floor(Math.random() * ADVANCED_NAME_PREFIXES.length)];
      generatedName = `${prefix} ${bankingSuffix}`;
    }

    attempts++;

    // Apply existing quality controls
    if (isCompanyNameClean(generatedName)) {
      logCompanyNameOperation('info', 'Generated clean banking company name', {
        baseName,
        generatedName,
        nameFormat: useShortName ? 'short' : 'long',
        bankingSuffix,
        validationAttempts: attempts,
      });
      return generatedName;
    }
  } while (attempts < maxValidationAttempts);

  // Fallback if clean name generation fails
  logCompanyNameOperation('warn', 'Could not generate clean banking name, using fallback', {
    baseName,
    attempts,
  });

  // Simple fallback: Use first prefix + "Bank"
  const fallbackPrefix = ADVANCED_NAME_PREFIXES[0];
  const fallbackName = `${fallbackPrefix} Bank`;

  logCompanyNameOperation('info', 'Generated fallback banking name', {
    baseName,
    fallbackName,
  });

  return fallbackName;
}

/**
 * Generates sophisticated company names using combinatorial approach
 * Leverages expanded name pools for maximum variety and professional appearance
 * 
 * @param baseName - Original company name for context and fallback
 * @param attempt - Generation attempt number for strategy variation
 * @param options - Configuration options including length preference and persona
 * @returns Promise that resolves with a professionally crafted company name
 */
export async function generateAdvancedCompanyName(
  baseName: string,
  attempt: number,
  options: NameGenerationOptions = {}
): Promise<string> {
  const config = { ...DEFAULT_GENERATION_OPTIONS, ...options };
  
  logCompanyNameOperation('info', 'Generating advanced company name', {
    baseName,
    attempt,
    strategy: 'combinatorial',
    lengthPreference: config.lengthPreference,
    persona: config.persona,
  });

  // Early return for banking persona - Data Provider gets specialized banking names
  if (config.persona === 'data-provider') {
    logCompanyNameOperation('info', 'Routing to banking-specific generation for data-provider persona', {
      baseName,
      attempt,
      persona: config.persona,
    });
    return generateBankingCompanyName(baseName, attempt, config);
  }

  // Determine if we should generate short or long name
  let useShortName = false;
  if (config.lengthPreference === 'short') {
    useShortName = true;
  } else if (config.lengthPreference === 'mixed') {
    useShortName = Math.random() < 0.5; // 50% chance for short names
  }

  // Strategy 1: Short portmanteau names (new)
  if (attempt === 1 && useShortName) {
    let generatedName: string;
    let attempts = 0;
    const maxValidationAttempts = 10;
    
    do {
      generatedName = generateShortPortmanteauName();
      attempts++;
      
      if (isCompanyNameClean(generatedName)) {
        logCompanyNameOperation('info', 'Generated clean short portmanteau name', {
          baseName,
          generatedName,
          nameLength: 'short',
          validationAttempts: attempts,
        });
        return generatedName;
      }
    } while (attempts < maxValidationAttempts);
    
    logCompanyNameOperation('warn', 'Could not generate clean short name, falling back to long', {
      baseName,
      attempts,
    });
  }

  // Strategy 2: Full combinatorial generation (PREFIX + CORE + SUFFIX)
  if ((attempt === 1 && !useShortName) || attempt === 2) {
    let generatedName: string;
    let attempts = 0;
    const maxValidationAttempts = 10;
    
    do {
      const prefix = ADVANCED_NAME_PREFIXES[Math.floor(Math.random() * ADVANCED_NAME_PREFIXES.length)];
      const core = ADVANCED_NAME_CORES[Math.floor(Math.random() * ADVANCED_NAME_CORES.length)];
      const suffix = ADVANCED_NAME_SUFFIXES[Math.floor(Math.random() * ADVANCED_NAME_SUFFIXES.length)];
      
      generatedName = `${prefix} ${core} ${suffix}`;
      attempts++;
      
      if (isCompanyNameClean(generatedName)) {
        logCompanyNameOperation('info', 'Generated clean full combinatorial name', {
          baseName,
          generatedName,
          components: { prefix, core, suffix },
          validationAttempts: attempts,
        });
        return generatedName;
      }
    } while (attempts < maxValidationAttempts);
    
    // If we can't generate a clean name, fall back to next strategy
    logCompanyNameOperation('warn', 'Could not generate clean name with strategy 1, falling back', {
      baseName,
      attempts,
    });
  }

  // Strategy 2: Preserve original core with professional prefix/suffix
  if (attempt === 2) {
    const originalCore = extractCoreFromName(baseName);
    const prefix = ADVANCED_NAME_PREFIXES[Math.floor(Math.random() * ADVANCED_NAME_PREFIXES.length)];
    
    const hybridName = `${prefix} ${originalCore}`;
    
    logCompanyNameOperation('info', 'Generated hybrid name preserving original core', {
      baseName,
      hybridName,
      originalCore,
      prefix,
    });
    
    return hybridName;
  }

  // Strategy 3: Core + Suffix combination
  if (attempt === 3) {
    const core = ADVANCED_NAME_CORES[Math.floor(Math.random() * ADVANCED_NAME_CORES.length)];
    const suffix = ADVANCED_NAME_SUFFIXES[Math.floor(Math.random() * ADVANCED_NAME_SUFFIXES.length)];
    
    const coreSuffixName = `${core} ${suffix}`;
    
    logCompanyNameOperation('info', 'Generated core+suffix combination', {
      baseName,
      coreSuffixName,
      components: { core, suffix },
    });
    
    return coreSuffixName;
  }

  // Strategy 4: Prefix + Original name
  if (attempt === 4) {
    const prefix = ADVANCED_NAME_PREFIXES[Math.floor(Math.random() * ADVANCED_NAME_PREFIXES.length)];
    const cleanedBase = cleanCompanyName(baseName);
    
    const prefixedName = `${prefix} ${cleanedBase}`;
    
    logCompanyNameOperation('info', 'Generated prefixed original name', {
      baseName,
      prefixedName,
      cleanedBase,
      prefix,
    });
    
    return prefixedName;
  }

  // Strategy 5: Fallback to legacy approach with professional modifier
  const modifier = PROFESSIONAL_MODIFIERS[Math.floor(Math.random() * PROFESSIONAL_MODIFIERS.length)];
  const fallbackName = `${modifier} ${baseName}`;
  
  logCompanyNameOperation('info', 'Generated fallback name with professional modifier', {
    baseName,
    fallbackName,
    modifier,
    attempt,
  });
  
  return fallbackName;
}

/**
 * Extracts the core business concept from an existing company name
 * Removes common business suffixes and modifiers to isolate the essential concept
 * 
 * @param companyName - The original company name
 * @returns The extracted core concept
 */
function extractCoreFromName(companyName: string): string {
  // Remove common business terms to isolate the core concept
  const cleaned = companyName
    .replace(/\b(Advanced|Premier|Elite|Strategic|Global|Digital|Professional|Innovative|Dynamic|Smart|Intelligent)\b/gi, '')
    .replace(/\b(Solutions|Systems|Technologies|Corporation|Enterprises|Holdings|Partners|Group|Services|Consulting|International|Global|Inc|LLC|Corp)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If cleaning removed everything, return original
  return cleaned || companyName;
}

/**
 * Cleans company name by removing redundant business terms
 * Prepares name for combination with new professional components
 * 
 * @param companyName - The company name to clean
 * @returns Cleaned version suitable for combination
 */
function cleanCompanyName(companyName: string): string {
  return companyName
    .replace(/\b(Solutions|Systems|Technologies|Corp|Inc|LLC)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // Generate variations using advanced combinatorial approach
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    let candidateName: string;

    if (config.suffixStyle === 'professional') {
      // Use advanced name generation for professional variations
      candidateName = await generateAdvancedCompanyName(baseName, attempt);
    } else if (config.suffixStyle === 'numeric') {
      candidateName = `${baseName} ${attempt}`;
    } else {
      // Hybrid approach - mix advanced and simple generation
      if (attempt % 2 === 1) {
        candidateName = await generateAdvancedCompanyName(baseName, attempt);
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