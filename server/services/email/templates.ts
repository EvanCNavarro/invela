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

      Click here to get started: ${data.inviteUrl}

      © ${new Date().getFullYear()} Invela | Privacy Policy | Terms of Service | Support Center
    `.trim(),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 40px 20px;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 40px;
            }
            .logo {
              display: flex;
              align-items: center;
              margin-bottom: 40px;
              color: #111;
            }
            .logo img {
              height: 32px;
              margin-right: 16px;
            }
            h1 {
              font-size: 24px;
              font-weight: 600;
              color: #111;
              margin: 0 0 24px 0;
            }
            .subtitle {
              color: #666;
              margin-bottom: 32px;
            }
            .section-title {
              font-weight: 600;
              font-size: 16px;
              margin: 0 0 16px 0;
            }
            ol {
              padding-left: 24px;
              margin: 0 0 32px 0;
            }
            li {
              margin-bottom: 12px;
              color: #444;
            }
            .button {
              background-color: #4965EC;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-weight: 500;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
              text-align: center;
            }
            .footer a {
              color: #666;
              text-decoration: none;
              margin: 0 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="data:image/svg+xml;base64,..." alt="Invela" />
              <span>Invela</span>
            </div>

            <h1>You've been invited to join Invela, by ${data.senderName || 'a representative'} from ${data.companyName || 'our platform'}.</h1>

            <div>
              <h2 class="section-title">Getting Started:</h2>
              <ol>
                <li>Click the button below to Create Your Account.</li>
                <li>Finish updated your Company's Profile.</li>
                <li>Upload the requested files to our secure system.</li>
                <li>Acquire an Invela Accreditation & Risk Score for your company.</li>
              </ol>

              <a href="${data.inviteUrl}" class="button">Create Your Account</a>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Invela</p>
              <div>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/support">Support Center</a>
              </div>
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