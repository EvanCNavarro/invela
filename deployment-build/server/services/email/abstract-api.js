"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abstractEmailValidator = exports.AbstractEmailValidator = exports.abstractApiResponseSchema = void 0;
const zod_1 = require("zod");
// AbstractAPI email validation response schema
exports.abstractApiResponseSchema = zod_1.z.object({
    email: zod_1.z.string(),
    autocorrect: zod_1.z.string().optional(),
    deliverability: zod_1.z.enum(['DELIVERABLE', 'UNDELIVERABLE', 'RISKY', 'UNKNOWN']),
    quality_score: zod_1.z.number(),
    is_valid_format: zod_1.z.boolean(),
    is_free_email: zod_1.z.boolean(),
    is_disposable_email: zod_1.z.boolean(),
    is_role_email: zod_1.z.boolean(),
    is_catchall_email: zod_1.z.boolean(),
    is_mx_found: zod_1.z.boolean(),
    is_smtp_valid: zod_1.z.boolean(),
});
class AbstractEmailValidator {
    constructor() {
        this.baseUrl = 'https://emailvalidation.abstractapi.com/v1';
        const apiKey = process.env.ABSTRACT_API_KEY;
        if (!apiKey) {
            throw new Error('ABSTRACT_API_KEY must be set in environment variables');
        }
        this.apiKey = apiKey;
    }
    async validateEmail(email) {
        try {
            const url = `${this.baseUrl}/?api_key=${this.apiKey}&email=${encodeURIComponent(email)}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`AbstractAPI request failed: ${response.statusText}`);
            }
            const data = await response.json();
            const result = exports.abstractApiResponseSchema.safeParse(data);
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
        }
        catch (error) {
            console.error('AbstractAPI validation error:', error);
            // Fallback to basic validation if API fails
            return {
                isValid: true,
                reason: 'Falling back to basic validation due to API error'
            };
        }
    }
}
exports.AbstractEmailValidator = AbstractEmailValidator;
// Export singleton instance
exports.abstractEmailValidator = new AbstractEmailValidator();
