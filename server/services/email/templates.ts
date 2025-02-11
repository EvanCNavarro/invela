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

const templates = {
  user_invite: (data: TemplateData): EmailTemplate => ({
    subject: `Invitation to join Invela`,
    text: `Hello ${data.recipientName}. You've been sent an invitation to join Invela, from ${data.senderName} of ${data.senderCompany}.

Getting Started:
1. Click the button below to Create Your Account.
   — or manually enter your unique Invitation Code: ${data.code}
2. Finish updating your Profile.
3. Access your company's dashboard and resources.

Click here to get started: ${data.inviteUrl}

Your Invitation Code: ${data.code}

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
        font-size: 24px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 24px 0;
      }
      .greeting {
        font-size: 16px;
        font-weight: 500;
        color: #374151;
        margin: 0 0 16px 0;
        line-height: 1.4;
      }
      .invitation {
        font-size: 16px;
        font-weight: 500;
        color: #374151;
        margin: 0 0 24px 0;
        line-height: 1.4;
      }
      .getting-started {
        background-color: #f9fafb;
        border-radius: 8px;
        padding: 24px;
        margin-bottom: 24px;
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
      .invitation-code {
        font-family: monospace;
        background-color: #f3f4f6;
        padding: 12px;
        border-radius: 4px;
        margin: 16px 0;
        text-align: center;
        font-size: 18px;
        font-weight: 600;
        letter-spacing: 1px;
      }
      .code-label {
        display: block;
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 4px;
      }
      .button {
        background-color: #4965EC;
        color: #ffffff !important;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
        font-weight: 500;
        font-size: 14px;
        text-align: center;
        margin-top: 16px;
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
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="company-name">Invela</h1>
      <p class="invitation">Hello ${data.recipientName}. You've been sent an invitation to join Invela, from ${data.senderName} of ${data.senderCompany}.</p>

      <div class="getting-started">
        <h3 class="section-title">Getting Started:</h3>
        <ol>
          <li>Click the button below to Create Your Account.</li>
          <li>Finish updating your Profile.</li>
          <li>Access your company's dashboard and resources.</li>
        </ol>
      </div>

      <div class="invitation-code">
        <span class="code-label">Your Invitation Code</span>
        ${data.code}
      </div>

      <a href="${data.inviteUrl}" class="button">Create Your Account</a>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Invela <span>•</span> Privacy Policy <span>•</span> Terms of Service <span>•</span> Support Center</p>
      </div>
    </div>
  </body>
</html>
`.trim(),
  }),
  fintech_invite: (data: TemplateData): EmailTemplate => ({
    subject: `You've been invited to join ${data.senderCompany}`,
    text: `
      Hello ${data.recipientName}, you've been invited to join ${data.senderCompany} by ${data.senderName}.

      Getting Started:
      1. Click the button below to Create Your Account.
      2. Finish updating your Company's Profile.
      3. Upload the requested files to our secure system.
      4. Acquire an Invela Accreditation & Risk Score for your company.

      Your Invitation Code: ${data.code}

      Click here to get started: ${data.inviteUrl}

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
              font-size: 24px;
              font-weight: 600;
              color: #111827;
              margin: 0 0 24px 0;
            }
            .title {
              font-size: 16px;
              font-weight: 500;
              color: #374151;
              margin: 0 0 24px 0;
              line-height: 1.4;
            }
            .getting-started {
              background-color: #f9fafb;
              border-radius: 8px;
              padding: 24px;
              margin-bottom: 24px;
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
              padding-bottom: 12px;
            }
            .button {
              background-color: #4965EC;
              color: #ffffff !important;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-weight: 500;
              font-size: 14px;
              text-align: center;
              margin-top: 16px;
            }
            .invitation-code {
              margin: 20px 0;
              font-family: monospace;
              background-color: #f3f4f6;
              padding: 12px;
              border-radius: 4px;
              text-align: center;
              font-size: 18px;
              font-weight: 600;
              letter-spacing: 1px;
            }
            .code-label {
              display: block;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 4px;
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
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="company-name">${data.senderCompany}</h1>
            <h2 class="title">Hello ${data.recipientName}, you've been invited to join ${data.senderCompany} by ${data.senderName}.</h2>

            <div class="getting-started">
              <h3 class="section-title">Getting Started:</h3>
              <ol>
                <li>Click the button below to Create Your Account.</li>
                <li>Finish updating your Company's Profile.</li>
                <li>Upload the requested files to our secure system.</li>
                <li>Acquire an Invela Accreditation & Risk Score for your company.</li>
              </ol>
            </div>

            <div class="invitation-code">
              <span class="code-label">Your Invitation Code</span>
              ${data.code}
            </div>

            <a href="${data.inviteUrl}" class="button">Create Your Account</a>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Invela <span>•</span> Privacy Policy <span>•</span> Terms of Service <span>•</span> Support Center</p>
            </div>
          </div>
        </body>
      </html>
    `.trim(),
  }),
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