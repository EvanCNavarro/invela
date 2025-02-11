import { z } from "zod";

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// Define a strict schema for invitation template data
const invitationTemplateSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  senderName: z.string().min(1, "Sender name is required"),
  company: z.string().min(1, "Company name is required"),
  code: z.string().min(1, "Invitation code is required"),
  inviteUrl: z.string().url("Valid invite URL is required")
});

export type InvitationTemplateData = z.infer<typeof invitationTemplateSchema>;
export type TemplateData = InvitationTemplateData;

export const emailTemplateSchema = z.object({
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});

const templates = {
  user_invite: (data: InvitationTemplateData): EmailTemplate => {
    // Validate the template data
    const result = invitationTemplateSchema.safeParse(data);
    if (!result.success) {
      console.error('[Template:user_invite] Invalid template data:', result.error);
      throw new Error(`Invalid template data: ${result.error.message}`);
    }

    const { recipientName, senderName, company, code, inviteUrl } = result.data;
    console.log('[Template:user_invite] Generating template with data:', { 
      recipientName, senderName, company, code, inviteUrl 
    });

    return {
      subject: `Invitation to join ${company}`,
      text: `
Hello ${recipientName}, you've been invited to join ${company} by ${senderName}.

Getting Started:
1. Click the button below to Create Your Account.
2. Finish updating your Company's Profile.
3. Upload the requested files to our secure system.
4. Acquire an Invela Accreditation & Risk Score for your company.

Your Invitation Code: ${code}

Click here to get started: ${inviteUrl}

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
      <h1 class="company-name">${company}</h1>
      <h2 class="title">Hello ${recipientName}, you've been invited to join ${company} by ${senderName}.</h2>

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
        ${code}
      </div>

      <a href="${inviteUrl}" class="button">Create Your Account</a>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Invela <span>•</span> Privacy Policy <span>•</span> Terms of Service <span>•</span> Support Center</p>
      </div>
    </div>
  </body>
</html>
`.trim(),
    };
  },
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
  console.log('[EmailTemplate] Getting template:', templateName);
  console.log('[EmailTemplate] Template data:', JSON.stringify(data, null, 2));

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  try {
    const emailTemplate = template(data);
    const validationResult = emailTemplateSchema.safeParse(emailTemplate);

    if (!validationResult.success) {
      console.error('[EmailTemplate] Validation error:', validationResult.error);
      throw new Error(`Invalid email template: ${validationResult.error.message}`);
    }

    return emailTemplate;
  } catch (error) {
    console.error('[EmailTemplate] Error generating template:', error);
    throw error;
  }
}