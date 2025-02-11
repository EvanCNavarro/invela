import * as nodemailer from 'nodemailer';
import { z } from 'zod';
import dns from 'dns';
import { promisify } from 'util';
import type { EmailTemplate, TemplateNames } from './templates';
import { getEmailTemplate } from './templates';

const resolveMx = promisify(dns.resolveMx);

// Common disposable email domains
const disposableDomains = new Set([
  'tempmail.com',
  'throwawaymail.com',
  '10minutemail.com',
  'guerrillamail.com',
  // Add more as needed
]);

// Common role-based email prefixes
const roleBasedPrefixes = new Set([
  'admin',
  'info',
  'support',
  'sales',
  'contact',
  'help',
  'no-reply',
  'noreply',
  // Add more as needed
]);

// Validation schemas
export const emailSchema = z.string().email("Invalid email address");

export const sendEmailSchema = z.object({
  to: emailSchema,
  from: emailSchema,
  template: z.enum(['user_invite']), // Explicitly define allowed template names
  templateData: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

class EmailService {
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

  private async validateEmail(email: string): Promise<ValidationResult> {
    try {
      console.log('[EmailService] Starting email validation for:', email);

      // Step 1: Basic format validation
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        console.log('[EmailService] Basic format validation failed');
        return { isValid: false, reason: "Invalid email format" };
      }

      // Step 2: Parse email parts
      const [localPart, domain] = email.split('@');
      if (!domain || !localPart) {
        console.log('[EmailService] Email parsing failed - invalid format');
        return { isValid: false, reason: "Invalid email format" };
      }

      // Step 3: Check for disposable email domains
      if (disposableDomains.has(domain.toLowerCase())) {
        console.log('[EmailService] Disposable email domain detected:', domain);
        return { isValid: false, reason: "Disposable email addresses are not allowed" };
      }

      // Step 4: Check for role-based emails
      if (roleBasedPrefixes.has(localPart.toLowerCase())) {
        console.log('[EmailService] Role-based email detected:', localPart);
        return { isValid: false, reason: "Role-based email addresses are not allowed" };
      }

      // Step 5: Check MX records
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
        // Don't fail on MX check errors, as some valid domains might have temporary DNS issues
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
    console.log('[EmailService] Starting to send template email to:', params.to);
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

      const fromValidation = await this.validateEmail(params.from || this.defaultFromEmail);
      if (!fromValidation.isValid) {
        console.error('[EmailService] Sender email validation failed:', fromValidation.reason);
        return {
          success: false,
          error: fromValidation.reason || 'Invalid sender email address'
        };
      }

      // Get email template
      console.log('[EmailService] Getting email template:', params.template);
      const template = getEmailTemplate(
        params.template as TemplateNames,
        params.templateData
      );

      // Send email using nodemailer
      console.log('[EmailService] Attempting to send email...');
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  // Method to verify connection
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

// Export singleton instance
export const emailService = new EmailService();