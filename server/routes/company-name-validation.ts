/**
 * ========================================
 * Company Name Validation API Routes
 * ========================================
 * 
 * Real-time company name validation and suggestion endpoints for demo forms.
 * Provides instant feedback during user input to prevent Step 3 failures.
 * 
 * Key Features:
 * - Real-time uniqueness checking
 * - Professional name suggestions when conflicts detected
 * - Integration with advanced name generation system
 * - Visual feedback support for frontend forms
 * 
 * Endpoints:
 * - POST /api/company-name/check - Validate name uniqueness
 * - POST /api/company-name/suggest - Get alternative suggestions
 * 
 * @module CompanyNameValidation
 * @version 1.0.0
 * @since 2025-05-26
 */

// ========================================
// IMPORTS
// ========================================

import { Router, Request, Response } from 'express';
import { 
  checkCompanyNameUniqueness, 
  generateAdvancedCompanyName,
  resolveUniqueCompanyName 
} from '../utils/company-name-utils';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Company name validation request payload
 */
interface NameValidationRequest {
  companyName: string;
  persona?: string;
  context?: 'demo' | 'production';
}

/**
 * Company name validation response
 */
interface NameValidationResponse {
  isUnique: boolean;
  originalName: string;
  suggestions?: string[];
  feedback: {
    message: string;
    type: 'success' | 'warning' | 'error';
    icon: 'check' | 'warning' | 'x';
  };
  timestamp: string;
}

/**
 * Name suggestion request payload
 */
interface NameSuggestionRequest {
  baseName: string;
  count?: number;
  persona?: string;
  excludeNames?: string[];
}

/**
 * Name suggestion response
 */
interface NameSuggestionResponse {
  suggestions: string[];
  baseName: string;
  generationStrategy: string;
  timestamp: string;
}

// ========================================
// ROUTER INITIALIZATION
// ========================================

const router = Router();

// ========================================
// VALIDATION ENDPOINTS
// ========================================

/**
 * POST /api/company-name/check
 * Real-time company name uniqueness validation
 * 
 * Provides instant feedback for form fields with professional messaging
 * and actionable suggestions when conflicts are detected.
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { companyName, persona = 'default', context = 'demo' }: NameValidationRequest = req.body;

    // Validate input parameters
    if (!companyName || companyName.trim().length === 0) {
      return res.status(400).json({
        error: 'Company name is required',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('[CompanyNameValidation] Processing uniqueness check', {
      companyName,
      persona,
      context,
      timestamp: new Date().toISOString(),
    });

    // Perform uniqueness check
    const uniquenessResult = await checkCompanyNameUniqueness(companyName.trim());

    // Generate response based on uniqueness result
    const response: NameValidationResponse = {
      isUnique: uniquenessResult.isUnique,
      originalName: companyName,
      timestamp: new Date().toISOString(),
      feedback: uniquenessResult.isUnique 
        ? {
            message: 'Company name is available',
            type: 'success',
            icon: 'check',
          }
        : {
            message: 'Company name is already taken',
            type: 'warning',
            icon: 'warning',
          },
    };

    // Generate suggestions if name is not unique
    if (!uniquenessResult.isUnique) {
      try {
        const suggestions = await generateNameSuggestions(companyName, { count: 3, persona });
        response.suggestions = suggestions;
        response.feedback.message = `Company name is already taken. Try: ${suggestions[0]}`;
      } catch (suggestionError) {
        console.warn('[CompanyNameValidation] Failed to generate suggestions', {
          companyName,
          error: suggestionError,
        });
        response.feedback.message = 'Company name is already taken. Please try a different name.';
      }
    }

    console.log('[CompanyNameValidation] Uniqueness check completed', {
      companyName,
      isUnique: response.isUnique,
      hasSuggestions: !!response.suggestions,
      processingTime: Date.now() - Date.parse(response.timestamp),
    });

    res.json(response);

  } catch (error) {
    console.error('[CompanyNameValidation] Validation check failed', {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Failed to validate company name',
      code: 'VALIDATION_FAILED',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/company-name/suggest
 * Generate professional company name alternatives
 * 
 * Provides multiple high-quality suggestions using advanced name generation
 * algorithms tailored to the specified persona and context.
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { 
      baseName, 
      count = 5, 
      persona = 'default', 
      excludeNames = [] 
    }: NameSuggestionRequest = req.body;

    // Validate input parameters
    if (!baseName || baseName.trim().length === 0) {
      return res.status(400).json({
        error: 'Base name is required for suggestions',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('[CompanyNameValidation] Generating name suggestions', {
      baseName,
      count,
      persona,
      excludeCount: excludeNames.length,
      timestamp: new Date().toISOString(),
    });

    // Generate multiple unique suggestions
    const suggestions = await generateNameSuggestions(baseName, {
      count: Math.min(count, 10), // Cap at 10 suggestions
      persona,
      excludeNames,
    });

    const response: NameSuggestionResponse = {
      suggestions,
      baseName,
      generationStrategy: 'advanced_combinatorial',
      timestamp: new Date().toISOString(),
    };

    console.log('[CompanyNameValidation] Name suggestions generated successfully', {
      baseName,
      suggestionCount: suggestions.length,
      suggestions: suggestions.slice(0, 3), // Log first 3 for debugging
    });

    res.json(response);

  } catch (error) {
    console.error('[CompanyNameValidation] Suggestion generation failed', {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Failed to generate name suggestions',
      code: 'SUGGESTION_FAILED',
      timestamp: new Date().toISOString(),
    });
  }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generates multiple unique company name suggestions
 * Uses advanced name generation system with deduplication
 * 
 * @param baseName - Original company name for context
 * @param options - Generation configuration options
 * @returns Promise that resolves with array of unique suggestions
 */
async function generateNameSuggestions(
  baseName: string,
  options: {
    count?: number;
    persona?: string;
    excludeNames?: string[];
  } = {}
): Promise<string[]> {
  const { count = 5, excludeNames = [] } = options;
  const suggestions: string[] = [];
  const excludeSet = new Set(excludeNames.map(name => name.toLowerCase()));

  console.log('[CompanyNameValidation] Starting suggestion generation', {
    baseName,
    targetCount: count,
    excludeCount: excludeNames.length,
  });

  // Generate suggestions using different strategies
  for (let attempt = 1; attempt <= count * 2 && suggestions.length < count; attempt++) {
    try {
      const suggestion = await generateAdvancedCompanyName(baseName, attempt);
      
      // Check if suggestion is unique and not excluded
      if (!excludeSet.has(suggestion.toLowerCase()) && 
          !suggestions.some(existing => existing.toLowerCase() === suggestion.toLowerCase())) {
        
        // Verify uniqueness in database
        const uniquenessCheck = await checkCompanyNameUniqueness(suggestion);
        if (uniquenessCheck.isUnique) {
          suggestions.push(suggestion);
          console.log('[CompanyNameValidation] Added unique suggestion', {
            suggestion,
            attempt,
            totalSuggestions: suggestions.length,
          });
        }
      }
    } catch (error) {
      console.warn('[CompanyNameValidation] Failed to generate suggestion', {
        baseName,
        attempt,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  // Fallback: if we don't have enough suggestions, add simple variants
  if (suggestions.length < count) {
    const fallbackSuggestions = [
      `${baseName} Solutions`,
      `${baseName} Partners`,
      `${baseName} Group`,
      `Advanced ${baseName}`,
      `${baseName} Systems`
    ];

    for (const fallback of fallbackSuggestions) {
      if (suggestions.length >= count) break;
      
      if (!suggestions.some(existing => existing.toLowerCase() === fallback.toLowerCase())) {
        const uniquenessCheck = await checkCompanyNameUniqueness(fallback);
        if (uniquenessCheck.isUnique) {
          suggestions.push(fallback);
        }
      }
    }
  }

  console.log('[CompanyNameValidation] Suggestion generation completed', {
    baseName,
    finalCount: suggestions.length,
    targetCount: count,
  });

  return suggestions;
}

// ========================================
// EXPORT ROUTER
// ========================================

export default router;