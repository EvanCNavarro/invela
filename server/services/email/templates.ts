import { z } from "zod";

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// Unified schema for user, fintech, and demo invitations
const invitationTemplateSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Valid recipient email is required"),
  senderName: z.string().min(1, "Sender name is required"),
  senderCompany: z.string().min(1, "Sender company is required"),
  targetCompany: z.string().min(1, "Target company is required"),
  inviteUrl: z.string().url("Valid invite URL is required"),
  code: z.string().optional(),
  inviteType: z.enum(["user", "fintech", "demo"]).default("user"),
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

const getSteps = (inviteType: "user" | "fintech" | "demo") => `
<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h2 style="color: #333; margin-top: 0;">Getting Started:</h2>
  <ol style="margin: 0; padding-left: 20px;">
    ${inviteType === "demo" 
      ? `<li>Click the button below to access your demo environment</li>
         <li>Explore the complete platform functionality with pre-populated data</li>
         <li>Experience the dashboard, risk assessments, and reporting features</li>
         <li>See how Invela can streamline your risk management process</li>`
      : `<li>Click the button below to Create Your Account</li>
         ${inviteType === "fintech" ? "<li>Complete your Company Profile setup</li>" : "<li>Finish updating your Profile</li>"}
         <li>Upload the requested files to our secure system</li>
         <li>Acquire an Invela Accreditation & Risk Score${inviteType === "fintech" ? " for your company" : ""}</li>`
    }
  </ol>
</div>`;

const getButton = (inviteUrl: string, inviteType: "user" | "fintech" | "demo") => `
<a href="${inviteUrl}" 
   style="display: inline-block; background: #4965EC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
  ${inviteType === "demo" ? "Access Your Demo" : "Create Your Account"}
</a>`;

// Unified invitation template
function invitationTemplate(data: InvitationTemplateData): EmailTemplate {
  console.log(
    "[Template:invitation] Received template data:",
    JSON.stringify(data, null, 2),
  );

  const result = invitationTemplateSchema.safeParse(data);
  if (!result.success) {
    console.error("[Template:invitation] Invalid template data:", result.error);
    throw new Error(
      `Invalid template data: ${JSON.stringify(result.error.errors)}`,
    );
  }

  const {
    recipientName,
    senderName,
    senderCompany,
    targetCompany,
    inviteUrl,
    code,
    inviteType,
  } = result.data;
  const year = new Date().getFullYear();

  const subject = "Invitation to join Invela";

  const intro =
    inviteType === "fintech"
      ? `You have been invited by ${senderName}, from ${senderCompany}, to join the Invela platform, on behalf of your company, ${targetCompany}.`
      : inviteType === "demo"
      ? `Welcome to your personalized Invela demo experience! ${senderName} has prepared a complete demonstration of our platform for ${targetCompany}.`
      : `You've been invited to join ${targetCompany}, by ${senderName} from ${senderCompany}.`;

  return {
    subject,
    text: `
Hello ${recipientName},

${intro}

Getting Started:
${inviteType === "demo" 
  ? `1. Click the button below to access your demo environment
2. Explore the complete platform functionality with pre-populated data  
3. Experience the dashboard, risk assessments, and reporting features
4. See how Invela can streamline your risk management process`
  : `1. Click the button below to Create Your Account
2. ${inviteType === "fintech" ? "Complete your Company Profile setup" : "Finish updating your Profile"}
3. Upload the requested files to our secure system
4. Acquire an Invela Accreditation & Risk Score${inviteType === "fintech" ? " for your company" : ""}`
}

${code ? `Your Invitation Code: ${code}` : ""}

Click here to get started: ${inviteUrl}

© ${year} Invela | Privacy Policy | Terms of Service | Support Center
`.trim(),
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
  </head>
  <body style="font-family: sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333; margin-bottom: 20px;">Welcome to Invela</h1>

    <p>Hello ${recipientName},</p>
    <p>${intro}</p>

    ${getSteps(inviteType)}

    ${
      code
        ? `
    <div style="background: #eef; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-family: monospace; font-size: 1.2em;">Your Invitation Code: ${code}</p>
    </div>
    `
        : ""
    }

    ${getButton(inviteUrl, inviteType)}
    ${getFooter(year)}
  </body>
</html>
`.trim(),
  };
}

const templates = {
  user_invite: invitationTemplate,
  fintech_invite: invitationTemplate,
  demo_invite: invitationTemplate,
};

export type TemplateNames = keyof typeof templates;

export function getEmailTemplate(
  templateName: TemplateNames,
  data: InvitationTemplateData,
): EmailTemplate {
  console.log("[EmailTemplate] Getting template:", templateName);
  console.log("[EmailTemplate] Template data:", JSON.stringify(data, null, 2));

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }

  try {
    // Set the invite type based on the template name
    const templateData = {
      ...data,
      inviteType: templateName === "fintech_invite" ? "fintech" as const : 
                  templateName === "demo_invite" ? "demo" as const : 
                  "user" as const,
    };

    const emailTemplate = template(templateData);
    const validationResult = emailTemplateSchema.safeParse(emailTemplate);

    if (!validationResult.success) {
      console.error(
        "[EmailTemplate] Validation error:",
        validationResult.error,
      );
      throw new Error(
        `Invalid email template: ${validationResult.error.message}`,
      );
    }

    return emailTemplate;
  } catch (error) {
    console.error("[EmailTemplate] Error generating template:", error);
    throw error;
  }
}
