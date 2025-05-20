"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = exports.sendEmailSchema = exports.emailSchema = void 0;
const nodemailer = __importStar(require("nodemailer"));
const zod_1 = require("zod");
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const templates_1 = require("./templates");
const resolveMx = (0, util_1.promisify)(dns_1.default.resolveMx);
const disposableDomains = new Set([
    'tempmail.com',
    'throwawaymail.com',
    '10minutemail.com',
    'guerrillamail.com',
]);
const roleBasedPrefixes = new Set([
    'admin',
    'info',
    'support',
    'sales',
    'contact',
    'help',
    'no-reply',
    'noreply',
]);
// Template data schema
const templateDataSchema = zod_1.z.object({
    recipientEmail: zod_1.z.string().email(),
    recipientName: zod_1.z.string(),
    senderName: zod_1.z.string(),
    senderCompany: zod_1.z.string(),
    targetCompany: zod_1.z.string(),
    inviteUrl: zod_1.z.string().url(),
    code: zod_1.z.string().optional(),
    inviteType: zod_1.z.enum(['user', 'fintech']).optional()
});
exports.emailSchema = zod_1.z.string().email("Invalid email address");
exports.sendEmailSchema = zod_1.z.object({
    to: exports.emailSchema,
    from: exports.emailSchema,
    template: zod_1.z.enum(['user_invite', 'fintech_invite']),
    templateData: templateDataSchema,
});
class EmailService {
    constructor() {
        console.log('[EmailService] Initializing email service');
        if (!process.env.GMAIL_APP_PASSWORD || !process.env.GMAIL_USER) {
            throw new Error("Gmail credentials must be set in environment variables");
        }
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });
        this.defaultFromEmail = process.env.GMAIL_USER;
        console.log('[EmailService] Email service initialized successfully');
    }
    transformTemplateData(data) {
        console.log('[EmailService] Starting template data transformation');
        console.log('[EmailService] Input template data:', JSON.stringify(data, null, 2));
        // Validate required fields before transformation
        const requiredFields = ['recipientEmail', 'recipientName', 'senderName', 'senderCompany', 'targetCompany'];
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
            console.error('[EmailService] Missing required fields:', missingFields);
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        // Build invitation URL without duplicating code parameter
        const url = new URL(data.inviteUrl);
        url.searchParams.set('code', data.code || '');
        const inviteUrl = url.toString();
        console.log('[EmailService] Built invite URL:', inviteUrl);
        // Return data with exact parameter names required by template
        const transformedData = {
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail,
            senderName: data.senderName,
            senderCompany: data.senderCompany,
            targetCompany: data.targetCompany,
            inviteUrl,
            code: data.code,
            inviteType: data.inviteType || 'user' // Default to 'user' if not provided
        };
        console.log('[EmailService] Transformed template data:', JSON.stringify(transformedData, null, 2));
        return transformedData;
    }
    async validateEmail(email) {
        try {
            console.log('[EmailService] Starting email validation for:', email);
            const result = exports.emailSchema.safeParse(email);
            if (!result.success) {
                console.log('[EmailService] Basic format validation failed:', result.error);
                return { isValid: false, reason: "Invalid email format" };
            }
            const [localPart, domain] = email.split('@');
            if (!domain || !localPart) {
                console.log('[EmailService] Email parsing failed - invalid format');
                return { isValid: false, reason: "Invalid email format" };
            }
            if (disposableDomains.has(domain.toLowerCase())) {
                console.log('[EmailService] Disposable email domain detected:', domain);
                return { isValid: false, reason: "Disposable email addresses are not allowed" };
            }
            if (roleBasedPrefixes.has(localPart.toLowerCase())) {
                console.log('[EmailService] Role-based email detected:', localPart);
                return { isValid: false, reason: "Role-based email addresses are not allowed" };
            }
            try {
                console.log('[EmailService] Checking MX records for domain:', domain);
                const mxRecords = await resolveMx(domain);
                if (!mxRecords || mxRecords.length === 0) {
                    console.log('[EmailService] No MX records found for domain:', domain);
                    return { isValid: false, reason: "This email doesn't exist. Enter a valid email." };
                }
                console.log('[EmailService] MX records found for domain:', domain);
            }
            catch (error) {
                console.error('[EmailService] MX record check failed:', error);
                console.log('[EmailService] Continuing despite MX check failure');
            }
            console.log('[EmailService] Email validation successful for:', email);
            return { isValid: true };
        }
        catch (error) {
            console.error('[EmailService] Email validation error:', error);
            return { isValid: false, reason: "Email validation failed" };
        }
    }
    async sendTemplateEmail(params) {
        console.log('[EmailService] Starting to send template email');
        console.log('[EmailService] Template type:', params.template);
        console.log('[EmailService] Recipient:', params.to);
        console.log('[EmailService] Template data (raw):', JSON.stringify(params.templateData, null, 2));
        try {
            // Validate email addresses
            const toValidation = await this.validateEmail(params.to);
            if (!toValidation.isValid) {
                console.error('[EmailService] Recipient email validation failed:', toValidation.reason);
                return {
                    success: false,
                    error: toValidation.reason || 'Invalid recipient email address'
                };
            }
            // Add inviteType based on template name if not already provided
            const templateDataWithType = {
                ...params.templateData,
                inviteType: params.templateData.inviteType ||
                    (params.template === 'fintech_invite' ? 'fintech' : 'user')
            };
            // Transform and validate template data
            console.log('[EmailService] Transforming template data');
            const transformedData = this.transformTemplateData(templateDataWithType);
            // Get email template
            console.log('[EmailService] Getting email template:', params.template);
            const template = (0, templates_1.getEmailTemplate)(params.template, transformedData);
            console.log('[EmailService] Template generated successfully');
            // Send email using nodemailer
            console.log('[EmailService] Preparing to send email with configuration:', {
                from: params.from || this.defaultFromEmail,
                to: params.to,
                subject: template.subject,
                textLength: template.text.length,
                htmlLength: template.html.length
            });
            await this.transporter.sendMail({
                from: params.from || this.defaultFromEmail,
                to: params.to,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
            console.log('[EmailService] Email sent successfully to:', params.to);
            return { success: true };
        }
        catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            console.error('[EmailService] Error details:', {
                name: error instanceof Error ? error.name : 'Unknown error',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace available'
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send email'
            };
        }
    }
    async verifyConnection() {
        console.log('[EmailService] Verifying email service connection...');
        try {
            await this.transporter.verify();
            console.log('[EmailService] Email service connection verified successfully');
            return true;
        }
        catch (error) {
            console.error('[EmailService] Failed to verify email connection:', error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
