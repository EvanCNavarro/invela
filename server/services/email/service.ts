import * as nodemailer from 'nodemailer';
import { z } from 'zod';
import dns from 'dns';
import { promisify } from 'util';
import type { EmailTemplate, TemplateNames } from './templates';
import { getEmailTemplate } from './templates';
import { abstractEmailValidator } from './abstract-api';

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
  template: z.string(),
  templateData: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  details?: {
    autocorrect?: string;
    deliverability?: 'DELIVERABLE' | 'UNDELIVERABLE' | 'UNKNOWN';
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFromEmail: string;

  constructor() {
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
  }

  private async validateEmail(email: string): Promise<ValidationResult> {
    try {
      // Step 1: Basic format validation
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        return { isValid: false, reason: "Invalid email format" };
      }

      // Step 2: AbstractAPI validation
      const abstractValidation = await abstractEmailValidator.validateEmail(email);
      if (!abstractValidation.isValid) {
        return { 
          isValid: false, 
          reason: abstractValidation.reason
        };
      }

      // Step 3: If AbstractAPI succeeded but suggested corrections
      if (abstractValidation.details?.autocorrect) {
        return {
          isValid: false,
          reason: `Did you mean ${abstractValidation.details.autocorrect}?`
        };
      }

      // Only perform additional checks if AbstractAPI validation failed or returned uncertain results
      if (!abstractValidation.details || abstractValidation.details.deliverability === 'UNKNOWN') {
        // Step 4: Parse email parts
        const [localPart, domain] = email.split('@');
        if (!domain || !localPart) {
          return { isValid: false, reason: "Invalid email format" };
        }

        // Step 5: Check for disposable email domains
        if (disposableDomains.has(domain.toLowerCase())) {
          return { isValid: false, reason: "Disposable email addresses are not allowed" };
        }

        // Step 6: Check for role-based emails
        if (roleBasedPrefixes.has(localPart.toLowerCase())) {
          return { isValid: false, reason: "Role-based email addresses are not allowed" };
        }

        // Step 7: Check MX records as fallback
        try {
          const mxRecords = await resolveMx(domain);
          if (!mxRecords || mxRecords.length === 0) {
            return { isValid: false, reason: "This email doesn't exist. Enter a valid email." };
          }
        } catch (error) {
          console.error('MX record check failed:', error);
          return { isValid: false, reason: "This email doesn't exist. Enter a valid email." };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Email validation error:', error);
      return { isValid: false, reason: "Email validation failed" };
    }
  }

  async sendTemplateEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate email addresses
      const toValidation = await this.validateEmail(params.to);
      if (!toValidation.isValid) {
        return { 
          success: false, 
          error: toValidation.reason || 'Invalid recipient email address'
        };
      }

      const fromValidation = await this.validateEmail(params.from || this.defaultFromEmail);
      if (!fromValidation.isValid) {
        return { 
          success: false, 
          error: fromValidation.reason || 'Invalid sender email address'
        };
      }

      // Get email template
      const template = getEmailTemplate(
        params.template as TemplateNames,
        params.templateData
      );

      // Send email using nodemailer
      await this.transporter.sendMail({
        from: params.from || this.defaultFromEmail,
        to: params.to,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }

  // Method to verify connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Failed to verify email connection:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();