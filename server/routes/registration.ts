/**
 * Registration Routes
 * 
 * This module handles the routes for user registration with invitation codes.
 */
import { Express } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export function registerRegistrationRoutes(app: Express) {
  // Register endpoint for new users
  app.post("/api/register", async (req, res) => {
    console.log("[Registration] Processing registration request");
    
    try {
      // Import the registration service
      const { registerUser } = await import('../services/registration');
      
      // Extract registration data
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;
      
      // Call the registration service
      const result = await registerUser({
        email,
        password,
        fullName,
        firstName: firstName || '',
        lastName: lastName || '',
        invitationCode
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: result.message 
        });
      }
      
      // If registration was successful, attempt to log the user in
      if (result.user) {
        req.login(result.user, (err) => {
          if (err) {
            console.error("[Registration] Login error:", err);
            return res.status(201).json({ 
              success: true, 
              message: "Registration successful, but automatic login failed. Please log in manually.", 
              userId: result.userId,
              companyId: result.companyId,
              sessionCreated: false
            });
          }
          
          // Return success with user data
          return res.status(200).json({ 
            success: true, 
            message: "Registration and login successful", 
            userId: result.userId,
            companyId: result.companyId,
            sessionCreated: true,
            user: {
              id: result.user.id,
              email: result.user.email,
              fullName: result.user.full_name,
              companyId: result.user.company_id,
              role: result.user.role
            }
          });
        });
      } else {
        // This shouldn't happen because successful registration returns a user
        return res.status(201).json({ 
          success: true, 
          message: "Registration successful, but user data is missing. Please log in manually.", 
          userId: result.userId,
          companyId: result.companyId,
          sessionCreated: false
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
      // Import required Pg Pool to create direct connection
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Create a client
      const client = await pool.connect();
      
      try {
        // Check invitation validity
        const invitationQuery = await client.query(
          `SELECT * FROM invitations 
           WHERE code = $1 AND email = $2 AND status = 'pending'`,
          [invitationCode, email]
        );
        
        if (invitationQuery.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid invitation code or email"
          });
        }
        
        const invitation = invitationQuery.rows[0];
        
        // Get company details
        const companyQuery = await client.query(
          `SELECT id, name FROM companies WHERE id = $1`,
          [invitation.company_id]
        );
        
        // Check if user already exists
        const userQuery = await client.query(
          `SELECT id FROM users WHERE email = $1`,
          [email]
        );
        
        return res.status(200).json({
          success: true,
          invitation: {
            code: invitation.code,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expires_at
          },
          company: companyQuery.rows.length > 0 ? {
            id: companyQuery.rows[0].id,
            name: companyQuery.rows[0].name
          } : null,
          userExists: userQuery.rows.length > 0
        });
      } finally {
        // Release client
        client.release();
      }
    } catch (error) {
      console.error("[Validate Invitation] Error:", error);
      return res.status(500).json({
        success: false,
        message: `Failed to validate invitation: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}