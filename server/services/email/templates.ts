import { z } from "zod";

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface TemplateData {
  [key: string]: string | number | boolean | null;
}

export const emailTemplateSchema = z.object({
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});

// Email template definitions
const templates = {
  fintech_invite: (data: TemplateData): EmailTemplate => ({
    subject: 'Invitation to Join Invela Platform',
    text: `
      Dear${data.recipientName ? ` ${data.recipientName}` : ' Financial Technology Partner'},

      You have been invited to join Invela, our secure document management and risk assessment platform, by ${data.senderName || 'a representative'} from ${data.companyName || 'our platform'}.

      Invela offers:
      • Secure document management and sharing
      • Advanced risk assessment tools
      • Real-time status tracking
      • Comprehensive analytics dashboard

      To get started:
      1. Click the following link to create your account: ${data.inviteUrl}
      2. Complete your organization profile
      3. Access our full suite of FinTech tools and services

      This invitation is valid for 7 days. If you have any questions, please contact our support team.

      Best regards,
      The Invela Team
    `.trim(),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4965EC; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 20px; }
            .content { background-color: #F4F6FA; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { background-color: #4965EC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
            .features { background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 20px; color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Welcome to Invela</h2>
          </div>
          <div class="content">
            <p>Dear${data.recipientName ? ` ${data.recipientName}` : ' Financial Technology Partner'},</p>

            <p>You have been invited to join Invela, our secure document management and risk assessment platform, by ${data.senderName || 'a representative'} from ${data.companyName || 'our platform'}.</p>

            <div class="features">
              <h3>What Invela Offers:</h3>
              <ul>
                <li>Secure document management and sharing</li>
                <li>Advanced risk assessment tools</li>
                <li>Real-time status tracking</li>
                <li>Comprehensive analytics dashboard</li>
              </ul>
            </div>

            <p><strong>Getting Started:</strong></p>
            <ol>
              <li>Click the button below to create your account</li>
              <li>Complete your organization profile</li>
              <li>Access our full suite of FinTech tools and services</li>
            </ol>

            <a href="${data.inviteUrl}" class="button">Create Your Account</a>

            <p><em>Note: This invitation is valid for 7 days.</em></p>

            <div class="footer">
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>The Invela Team</p>
            </div>
          </div>
        </body>
      </html>
    `.trim(),
  }),

  // Add more email templates here as needed
};

export type TemplateNames = keyof typeof templates;

export function getEmailTemplate(templateName: TemplateNames, data: TemplateData): EmailTemplate {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  const emailTemplate = template(data);
  const result = emailTemplateSchema.safeParse(emailTemplate);

  if (!result.success) {
    throw new Error(`Invalid email template: ${result.error.message}`);
  }

  return emailTemplate;
}