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
    subject: 'Invitation to Join Fintech Platform',
    text: `
      Hello${data.recipientName ? ` ${data.recipientName}` : ''},
      
      You have been invited to join our Fintech platform by ${data.senderName || 'a team member'} from ${data.companyName || 'our platform'}.
      
      Click the following link to get started:
      ${data.inviteUrl}
      
      Best regards,
      The Team
    `.trim(),
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to Our Fintech Platform</h2>
          <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
          <p>You have been invited to join our Fintech platform by ${data.senderName || 'a team member'} from ${data.companyName || 'our platform'}.</p>
          <p>
            <a href="${data.inviteUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Get Started
            </a>
          </p>
          <p>Best regards,<br>The Team</p>
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
