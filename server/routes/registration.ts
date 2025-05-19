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
      console.log('[Registration] Processing registration request with data:', JSON.stringify(req.body, null, 2));
      
      // Extract and validate registration data
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;
      
      console.log('[Registration] Request body:', JSON.stringify(req.body, null, 2));
      
      if (!email || !password || !fullName || !invitationCode) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: email, password, fullName, and invitationCode are required"
        });
      }
      
      // First, validate the invitation
      const invitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.code, invitationCode),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        ),
      });
      
      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: "Invalid invitation code or email"
        });
      }
      
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
        
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists"
        });
      }
      
      // Get company details
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, invitation.company_id),
      });
        
      if (!company) {
        return res.status(400).json({
          success: false,
          message: "Invalid company associated with the invitation"
        });
      }
      
      console.log(`[Registration] Found company with ID ${company.id} and name ${company.name}`);
      
      // Hash the password using bcrypt - this is what our auth system expects
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log(`[Registration] Creating new user with email: ${email} and company ID: ${company.id}`);
      
      // Create the user with field names that match the database schema exactly
      const userValues = {
        email: email,
        password: hashedPassword,
        full_name: fullName,
        first_name: firstName || null,
        last_name: lastName || null,
        company_id: company.id,
        onboarding_user_completed: false
      };
      
      console.log('[Registration] User values:', JSON.stringify({
        ...userValues, 
        password: '[REDACTED]'
      }, null, 2));
      
      try {
        // Create the user directly in the database
        const userResult = await db
          .insert(users)
          .values(userValues)
          .returning();
        
        if (!userResult || userResult.length === 0) {
          return res.status(500).json({
            success: false,
            message: "User creation failed: No user was returned"
          });
        }
          
        const newUser = userResult[0];
        console.log(`[Registration] Successfully created user with ID: ${newUser.id}`);
        
        try {
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
                companyId: newUser.company_id
              }
            });
          });
        } catch (updateError) {
          console.error("[Registration] Error updating invitation:", updateError);
          // Even if updating the invitation fails, the user was created
          return res.status(201).json({
            success: true,
            message: "Registration successful, but invitation update failed. Please log in.",
            userId: newUser.id
          });
        }
      } catch (dbError) {
        console.error("[Registration] Database error creating user:", dbError);
        return res.status(500).json({
          success: false,
          message: "Error creating user: " + (dbError instanceof Error ? dbError.message : 'Unknown database error')
        });
      }
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
      console.log(`[Validate Invitation] Checking invitation code: ${invitationCode} for email: ${email}`);
      
      // Use simple SQL query to avoid potential Drizzle ORM binding issues
      const result = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.code, invitationCode),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        ),
      });
      
      if (!result) {
        console.log('[Validate Invitation] No matching invitation found');
        return res.status(400).json({
          success: false,
          message: "Invalid invitation code or email"
        });
      }
      
      console.log(`[Validate Invitation] Found invitation for company ID: ${result.company_id}`);
      
      // Get company details
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, result.company_id),
      });
      
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      
      return res.status(200).json({
        success: true,
        invitation: {
          code: result.code,
          email: result.email,
          expiresAt: result.expires_at
        },
        company: company ? {
          id: company.id,
          name: company.name
        } : null,
        userExists: !!existingUser
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