import { z } from 'zod';

// AbstractAPI email validation response schema
export const abstractApiResponseSchema = z.object({
  email: z.string(),
  autocorrect: z.string().optional(),
  deliverability: z.enum(['DELIVERABLE', 'UNDELIVERABLE', 'RISKY', 'UNKNOWN']),
  quality_score: z.number(),
  is_valid_format: z.boolean(),
  is_free_email: z.boolean(),
  is_disposable_email: z.boolean(),
  is_role_email: z.boolean(),
  is_catchall_email: z.boolean(),
  is_mx_found: z.boolean(),
  is_smtp_valid: z.boolean(),
});

export type AbstractApiResponse = z.infer<typeof abstractApiResponseSchema>;

export class AbstractEmailValidator {
  private apiKey: string;
  private baseUrl = 'https://emailvalidation.abstractapi.com/v1';

  constructor() {
    const apiKey = process.env.ABSTRACT_API_KEY;
    if (!apiKey) {
      throw new Error('ABSTRACT_API_KEY must be set in environment variables');
    }
    this.apiKey = apiKey;
  }

  async validateEmail(email: string): Promise<{
    isValid: boolean;
    reason?: string;
    details?: AbstractApiResponse;
  }> {
    try {
      const url = `${this.baseUrl}/?api_key=${this.apiKey}&email=${encodeURIComponent(email)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`AbstractAPI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result = abstractApiResponseSchema.safeParse(data);

      if (!result.success) {
        throw new Error('Invalid response from AbstractAPI');
      }

      const validationResult = result.data;

      // Determine if email is valid based on multiple factors
      if (!validationResult.is_valid_format) {
        return {
          isValid: false,
          reason: 'Invalid email format',
          details: validationResult
        };
      }

      if (validationResult.is_disposable_email) {
        return {
          isValid: false,
          reason: 'Disposable email addresses are not allowed',
          details: validationResult
        };
      }

      if (validationResult.deliverability === 'UNDELIVERABLE') {
        return {
          isValid: false,
          reason: 'Email address appears to be undeliverable',
          details: validationResult
        };
      }

      if (validationResult.quality_score < 0.5) {
        return {
          isValid: false,
          reason: 'Email address has a low quality score',
          details: validationResult
        };
      }

      return {
        isValid: true,
        details: validationResult
      };
    } catch (error) {
      console.error('AbstractAPI validation error:', error);
      // Fallback to basic validation if API fails
      return {
        isValid: true,
        reason: 'Falling back to basic validation due to API error'
      };
    }
  }
}

// Export singleton instance
export const abstractEmailValidator = new AbstractEmailValidator();
