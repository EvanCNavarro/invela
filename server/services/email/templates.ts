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
    subject: "You've been invited to join Invela",
    text: `
      You've been invited to join Invela, by ${data.senderName || 'a representative'} from ${data.companyName || 'our platform'}.

      Getting Started:
      1. Click the button below to Create Your Account.
      2. Finish updated your Company's Profile.
      3. Upload the requested files to our secure system.
      4. Acquire an Invela Accreditation & Risk Score for your company.

      Click here to get started: ${data.inviteUrl}/register?email=${encodeURIComponent(data.recipientEmail || '')}

      © ${new Date().getFullYear()} Invela | Privacy Policy | Terms of Service | Support Center
    `.trim(),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              line-height: 1.5;
              color: #111827;
              margin: 0;
              padding: 32px 16px;
              background-color: #f3f4f6;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .container {
              max-width: 580px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .company-name {
              font-size: 20px;
              font-weight: 600;
              color: #111827;
              margin: 0 0 24px 0;
            }
            .title {
              font-size: 16px;
              font-weight: 500;
              color: #374151;
              margin: 0 0 32px 0;
              line-height: 1.4;
            }
            .getting-started {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 24px;
              margin-bottom: 32px;
            }
            .section-title {
              font-weight: 600;
              font-size: 16px;
              margin: 0 0 16px 0;
              color: #111827;
            }
            ol {
              padding-left: 24px;
              margin: 0;
            }
            li {
              margin-bottom: 12px;
              color: #374151;
            }
            li:last-child {
              margin-bottom: 0;
            }
            .button {
              background-color: #4965EC;
              color: #ffffff;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-weight: 500;
              font-size: 14px;
              text-align: center;
              transition: background-color 0.2s;
              margin: 32px 0;
            }
            .button:hover {
              background-color: #3b51c4;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
              text-align: left;
            }
            .footer span {
              margin: 0 6px;
              color: #9ca3af;
            }
            @media (max-width: 480px) {
              .container {
                padding: 24px;
              }
              .getting-started {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="company-name">Invela</h1>
            <h2 class="title">You've been invited to join Invela, by ${data.senderName || 'a representative'} from ${data.companyName || 'our platform'}.</h2>

            <div class="getting-started">
              <h3 class="section-title">Getting Started:</h3>
              <ol>
                <li>Click the button below to Create Your Account.</li>
                <li>Finish updated your Company's Profile.</li>
                <li>Upload the requested files to our secure system.</li>
                <li>Acquire an Invela Accreditation & Risk Score for your company.</li>
              </ol>
            </div>

            <a href="${data.inviteUrl}/register?email=${encodeURIComponent(data.recipientEmail || '')}" class="button">Create Your Account</a>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Invela <span>•</span> Privacy Policy <span>•</span> Terms of Service <span>•</span> Support Center</p>
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