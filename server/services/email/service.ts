import * as nodemailer from 'nodemailer';
import { z } from 'zod';
import type { EmailTemplate, TemplateNames } from './templates';
import { getEmailTemplate } from './templates';

// Validation schemas
export const emailSchema = z.string().email("Invalid email address");

export const sendEmailSchema = z.object({
  to: emailSchema,
  from: emailSchema,
  template: z.string(),
  templateData: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

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

  private async validateEmail(email: string): Promise<boolean> {
    try {
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        return false;
      }

      // Basic DNS validation
      const [localPart, domain] = email.split('@');
      if (!domain || !localPart) {
        return false;
      }

      // Additional validation could be added here
      return true;
    } catch (error) {
      console.error('Email validation error:', error);
      return false;
    }
  }

  async sendTemplateEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate email addresses
      const isValidToEmail = await this.validateEmail(params.to);
      const isValidFromEmail = await this.validateEmail(params.from || this.defaultFromEmail);

      if (!isValidToEmail || !isValidFromEmail) {
        return { 
          success: false, 
          error: 'Invalid email address' 
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