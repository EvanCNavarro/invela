/**
 * Registration Routes
 * 
 * This module handles the routes for user registration with invitation codes.
 */
import { Express } from 'express';
import { db } from '@db';
import { users, invitations, companies } from '@db/schema';
import { eq, and } from 'drizzle-orm';

export function registerRegistrationRoutes(app: Express) {
  // Register endpoint for new users
  app.post("/api/register", async (req, res) => {
    console.log("[Registration] Processing registration request");
    
    try {
      // Extract registration data
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;
      
      // First, validate the invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.code, invitationCode),
            eq(invitations.email, email),
            eq(invitations.status, 'pending')
          )
        )
        .limit(1);
      
      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: "Invalid invitation code or email"
        });
      }
      
      // Check if user already exists
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
        
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists"
        });
      }
      
      // Get company details
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, invitation.company_id))
        .limit(1);
        
      if (!company) {
        return res.status(400).json({
          success: false,
          message: "Invalid company associated with the invitation"
        });
      }
      
      // Import crypto for password hashing
      const crypto = await import('crypto');
      
      // Hash the password
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const hashedPassword = `${hash}.${salt}`;
      
      // Create the user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email,
          password: hashedPassword,
          full_name: fullName,
          first_name: firstName || '',
          last_name: lastName || '',
          company_id: company.id,
          role: 'User', // Default role
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
        
      // Mark invitation as used
      await db
        .update(invitations)
        .set({
          status: 'used',
          used_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(invitations.id, invitation.id));
      
      // Log in the user
      req.login(newUser, (err) => {
        if (err) {
          console.error("[Registration] Login error:", err);
          return res.status(201).json({ 
            success: true, 
            message: "Registration successful, but automatic login failed. Please log in manually.", 
            userId: newUser.id,
            companyId: company.id,
            sessionCreated: false
          });
        }
        
        // Return success with user data
        return res.status(200).json({ 
          success: true, 
          message: "Registration and login successful", 
          userId: newUser.id,
          companyId: company.id,
          sessionCreated: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.full_name,
            companyId: newUser.company_id,
            role: newUser.role
          }
        });
      });
    } catch (error) {
      console.error("[Registration] Error:", error);
      return res.status(500).json({ 
        success: false,
        message: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });
  
  // Route to validate an invitation code without registering
  app.post("/api/validate-invitation", async (req, res) => {
    const { email, invitationCode } = req.body;
    
    if (!email || !invitationCode) {
      return res.status(400).json({
        success: false,
        message: "Email and invitation code are required"
      });
    }
    
    try {
      console.log(`[Validate Invitation] Checking code ${invitationCode} for email ${email}`);
      
      // Find the invitation using drizzle's query builder
      const pendingInvitations = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.code, invitationCode),
            eq(invitations.email, email),
            eq(invitations.status, 'pending')
          )
        );
      
      if (pendingInvitations.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid invitation code or email"
        });
      }
      
      const invitation = pendingInvitations[0];
      console.log(`[Validate Invitation] Found invitation for company ID: ${invitation.company_id}`);
      
      // Get company details
      const companyDetails = await db
        .select()
        .from(companies)
        .where(eq(companies.id, invitation.company_id));
      
      const company = companyDetails.length > 0 ? companyDetails[0] : null;
      
      // Check if user already exists
      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      return res.status(200).json({
        success: true,
        invitation: {
          code: invitation.code,
          email: invitation.email,
          expiresAt: invitation.expires_at
        },
        company: company ? {
          id: company.id,
          name: company.name
        } : null,
        userExists: existingUsers.length > 0
      });
    } catch (error) {
      console.error("[Validate Invitation] Error:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to validate invitation: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}