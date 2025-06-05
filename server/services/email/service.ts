import * as nodemailer from 'nodemailer';
import { z } from 'zod';
import dns from 'dns';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import type { EmailTemplate, TemplateNames } from './templates';
import { getEmailTemplate } from './templates';
import { logger } from '../../utils/logger';

const resolveMx = promisify(dns.resolveMx);

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
const templateDataSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  senderName: z.string(),
  senderCompany: z.string(),
  targetCompany: z.string(),
  inviteUrl: z.string().url(),
  code: z.string().optional()
});

type TemplateData = z.infer<typeof templateDataSchema>;

export const emailSchema = z.string().email("Invalid email address");

export const sendEmailSchema = z.object({
  to: emailSchema,
  from: emailSchema,
  template: z.enum(['user_invite', 'fintech_invite', 'demo_invite']),
  templateData: templateDataSchema,
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFromEmail: string;

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

  private transformTemplateData(data: TemplateData) {
    console.log('[EmailService] Starting template data transformation');
    console.log('[EmailService] Input template data:', JSON.stringify(data, null, 2));

    // Validate required fields before transformation
    const requiredFields = ['recipientEmail', 'recipientName', 'senderName', 'senderCompany', 'targetCompany'];
    const missingFields = requiredFields.filter(field => !data[field as keyof TemplateData]);

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
      code: data.code
    };

    console.log('[EmailService] Transformed template data:', JSON.stringify(transformedData, null, 2));
    return transformedData;
  }

  private async validateEmail(email: string): Promise<ValidationResult> {
    try {
      console.log('[EmailService] Starting email validation for:', email);

      const result = emailSchema.safeParse(email);
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
      } catch (error) {
        console.error('[EmailService] MX record check failed:', error);
        console.log('[EmailService] Continuing despite MX check failure');
      }

      console.log('[EmailService] Email validation successful for:', email);
      return { isValid: true };
    } catch (error) {
      console.error('[EmailService] Email validation error:', error);
      return { isValid: false, reason: "Email validation failed" };
    }
  }

  async sendTemplateEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
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

      // Transform and validate template data
      console.log('[EmailService] Transforming template data');
      const transformedData = this.transformTemplateData(params.templateData);

      // Get email template
      console.log('[EmailService] Getting email template:', params.template);
      const template = getEmailTemplate(params.template as TemplateNames, transformedData);
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
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      console.error('[EmailService] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    console.log('[EmailService] Verifying email service connection...');
    try {
      await this.transporter.verify();
      console.log('[EmailService] Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to verify email connection:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();