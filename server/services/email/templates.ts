import { z } from "zod";

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const invitationTemplateSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Valid recipient email is required"),
  senderName: z.string().min(1, "Sender name is required"),
  senderCompany: z.string().min(1, "Sender company is required"),
  targetCompany: z.string().min(1, "Target company is required"),
  inviteUrl: z.string().url("Valid invite URL is required"),
  code: z.string().optional()
});

export type InvitationTemplateData = z.infer<typeof invitationTemplateSchema>;

export const emailTemplateSchema = z.object({
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});

// Shared template sections
const getFooter = (year: number) => `
<div style="color: #666; font-size: 0.9em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
  <p>© ${year} Invela | Privacy Policy | Terms of Service | Support Center</p>
</div>`;

const getSteps = () => `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h2 style="color: #333; margin-top: 0;">Getting Started:</h2>
  <ol style="margin: 0; padding-left: 20px;">
    <li>Click the button below to Create Your Account</li>
    <li>Finish updating your Company's Profile</li>
    <li>Upload the requested files to our secure system</li>
    <li>Acquire an Invela Accreditation & Risk Score for your company</li>
  </ol>
</div>`;

const getButton = (inviteUrl: string) => `
<a href="${inviteUrl}" 
   style="display: inline-block; background: #4965EC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
  Create Your Account
</a>`;

const templates = {
  user_invite: (data: InvitationTemplateData): EmailTemplate => {
    const result = invitationTemplateSchema.safeParse(data);
    if (!result.success) {
      console.error('[Template:user_invite] Invalid template data:', result.error);
      throw new Error(`Invalid template data: ${JSON.stringify(result.error.errors)}`);
    }

    const { recipientName, senderName, senderCompany, targetCompany, inviteUrl, code } = result.data;
    const year = new Date().getFullYear();

    return {
      subject: `Invitation to join ${targetCompany}`,
      text: `
Hello ${recipientName},

You've been invited to join ${targetCompany} by ${senderName} from ${senderCompany}.

Getting Started:
1. Click the button below to Create Your Account
2. Finish updating your Company's Profile
3. Upload the requested files to our secure system
4. Acquire an Invela Accreditation & Risk Score for your company

${code ? `Your Invitation Code: ${code}` : ''}

Click here to get started: ${inviteUrl}

© ${year} Invela | Privacy Policy | Terms of Service | Support Center
`.trim(),
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Join ${targetCompany} on Invela</title>
  </head>
  <body style="font-family: sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333; margin-bottom: 20px;">Welcome to ${targetCompany}</h1>

    <p>Hello ${recipientName},</p>
    <p>You've been invited to join ${targetCompany} by ${senderName} from ${senderCompany}.</p>

    ${getSteps()}

    ${code ? `
    <div style="background: #eef; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-family: monospace; font-size: 1.2em;">Your Invitation Code: ${code}</p>
    </div>
    ` : ''}

    ${getButton(inviteUrl)}
    ${getFooter(year)}
  </body>
</html>
`.trim()
    };
  },

  fintech_invite: (data: InvitationTemplateData): EmailTemplate => {
    const result = invitationTemplateSchema.safeParse(data);
    if (!result.success) {
      console.error('[Template:fintech_invite] Invalid template data:', result.error);
      throw new Error(`Invalid template data: ${JSON.stringify(result.error.errors)}`);
    }

    const { recipientName, senderName, senderCompany, targetCompany, inviteUrl, code } = result.data;
    const year = new Date().getFullYear();

    return {
      subject: `Welcome to ${targetCompany}`,
      text: `
Hello ${recipientName},

You have been invited by ${senderName} from ${senderCompany} to join ${targetCompany} on the Invela platform.

Getting Started:
1. Click the button below to Create Your Account
2. Finish updating your Company's Profile
3. Upload the requested files to our secure system
4. Acquire an Invela Accreditation & Risk Score for your company

${code ? `Your Invitation Code: ${code}` : ''}

Click here to get started: ${inviteUrl}

© ${year} Invela | Privacy Policy | Terms of Service | Support Center
`.trim(),
      html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to ${targetCompany}</title>
  </head>
  <body style="font-family: sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333; margin-bottom: 20px;">Welcome to ${targetCompany}</h1>

    <p>Hello ${recipientName},</p>
    <p>You have been invited by ${senderName} from ${senderCompany} to join ${targetCompany} on the Invela platform.</p>

    ${getSteps()}

    ${code ? `
    <div style="background: #eef; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-family: monospace; font-size: 1.2em;">Your Invitation Code: ${code}</p>
    </div>
    ` : ''}

    ${getButton(inviteUrl)}
    ${getFooter(year)}
  </body>
</html>
`.trim()
    };
  }
};

export type TemplateNames = keyof typeof templates;

export function getEmailTemplate(templateName: TemplateNames, data: InvitationTemplateData): EmailTemplate {
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