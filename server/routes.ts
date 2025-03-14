import { Express } from 'express';
import { eq, and, gt, sql, or, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { users, companies, files, companyLogos, relationships, tasks, invitations, TaskStatus } from '@db/schema';
import { emailService } from './services/email';
import { requireAuth } from './middleware/auth';
import { logoUpload } from './middleware/upload';
import { broadcastTaskUpdate } from './services/websocket';
import crypto from 'crypto';
import companySearchRouter from "./routes/company-search";
import { createCompany } from "./services/company";
import kybRouter from './routes/kyb';
import cardRouter from './routes/card';
import filesRouter from './routes/files';
import accessRouter from './routes/access';

export function registerRoutes(app: Express): Express {
  app.use(companySearchRouter);
  app.use(kybRouter);
  app.use(cardRouter);
  app.use(filesRouter);
  app.use(accessRouter);

  // Companies endpoints
  app.get("/api/companies", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        console.log('[Companies] No authenticated user found');
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      console.log('[Companies] Fetching companies for user:', {
        userId: req.user.id,
        company_id: req.user.company_id
      });

      // Get all companies that either:
      // 1. The user's own company
      // 2. Companies that have a relationship with the user's company
      const networkCompanies = await db.select({
        id: companies.id,
        name: sql<string>`COALESCE(${companies.name}, '')`,
        category: sql<string>`COALESCE(${companies.category}, '')`,
        description: sql<string>`COALESCE(${companies.description}, '')`,
        logo_id: companies.logo_id,
        accreditation_status: sql<string>`COALESCE(${companies.accreditation_status}, '')`,
        risk_score: companies.risk_score,
        onboarding_company_completed: sql<boolean>`COALESCE(${companies.onboarding_company_completed}, false)`,
        website_url: sql<string>`COALESCE(${companies.website_url}, '')`,
        legal_structure: sql<string>`COALESCE(${companies.legal_structure}, '')`,
        hq_address: sql<string>`COALESCE(${companies.hq_address}, '')`,
        employee_count: sql<string>`COALESCE(${companies.employee_count}, '')`,
        products_services: sql<string[]>`COALESCE(${companies.products_services}, '{}')::text[]`,
        incorporation_year: sql<string>`COALESCE(${companies.incorporation_year}, '')`,
        investors_info: sql<string>`COALESCE(${companies.investors_info}, '')`,
        funding_stage: sql<string>`COALESCE(${companies.funding_stage}, '')`,
        key_partners: sql<string[]>`COALESCE(${companies.key_partners}, '{}')::text[]`,
        leadership_team: sql<string>`COALESCE(${companies.leadership_team}, '')`,
        has_relationship: sql<boolean>`
          CASE 
            WHEN ${companies.id} = ${req.user!.company_id} THEN true
            WHEN EXISTS (
              SELECT 1 FROM ${relationships} r 
              WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user!.company_id})
              OR (r.company_id = ${req.user!.company_id} AND r.related_company_id = ${companies.id})
            ) THEN true
            ELSE false
          END
        `
      })
        .from(companies)
        .where(
          or(
            eq(companies.id, req.user!.company_id),
            sql`EXISTS (
            SELECT 1 FROM ${relationships} r 
            WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user!.company_id})
            OR (r.company_id = ${req.user!.company_id} AND r.related_company_id = ${companies.id})
          )`
          )
        )
        .orderBy(companies.name);

      console.log('[Companies] Query successful, found companies:', {
        count: networkCompanies.length,
        companies: networkCompanies.map(c => ({
          id: c.id,
          name: c.name,
          hasLogo: !!c.logo_id,
          hasRelationship: c.has_relationship
        }))
      });

      // Transform the data to match frontend expectations
      const transformedCompanies = networkCompanies.map(company => ({
        ...company,
        websiteUrl: company.website_url || 'N/A',
        legalStructure: company.legal_structure || 'N/A',
        hqAddress: company.hq_address || 'N/A',
        numEmployees: company.employee_count || 'N/A',
        productsServices: company.products_services || [],
        incorporationYear: company.incorporation_year || 'N/A',
        investors: company.investors_info || 'No investor information available',
        fundingStage: company.funding_stage || null,
        keyClientsPartners: company.key_partners || [],
        foundersAndLeadership: company.leadership_team || 'No leadership information available',
        riskScore: company.risk_score
      }));

      res.json(transformedCompanies);
    } catch (error) {
      console.error("[Companies] Error details:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Check if it's a database error
      if (error instanceof Error && error.message.includes('relation')) {
        return res.status(500).json({
          message: "Database configuration error",
          code: "DB_ERROR"
        });
      }

      res.status(500).json({
        message: "Error fetching companies",
        code: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/companies/current", requireAuth, async (req, res) => {
    try {
      console.log('[Current Company] Fetching company for user:', {
        userId: req.user!.id,
        companyId: req.user!.company_id
      });

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.company_id));

      if (!company) {
        console.error('[Current Company] Company not found:', req.user!.company_id);
        return res.status(404).json({ message: "Company not found" });
      }

      console.log('[Current Company] Found company:', {
        id: company.id,
        name: company.name,
        onboardingCompleted: company.onboarding_company_completed
      });

      res.json(company);
    } catch (error) {
      console.error("[Current Company] Error fetching company:", error);
      res.status(500).json({ message: "Error fetching company details" });
    }
  });

  // Get company by ID
  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      if (isNaN(companyId)) {
        return res.status(400).json({
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }

      // Get company details along with relationship check
      const [company] = await db.select()
        .from(companies)
        .where(
          and(
            eq(companies.id, companyId),
            or(
              eq(companies.id, req.user!.company_id),
              sql`EXISTS (
                SELECT 1 FROM ${relationships} r 
                WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user!.company_id})
                OR (r.company_id = ${req.user!.company_id} AND r.related_company_id = ${companies.id})
              )`
            )
          )
        );

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      // Transform response to match frontend expectations
      const transformedCompany = {
        ...company,
        websiteUrl: company.website_url,
        numEmployees: company.employee_count,
        incorporationYear: company.incorporation_year ? parseInt(company.incorporation_year) : null,
        riskScore: company.risk_score
      };

      res.json(transformedCompany);
    } catch (error) {
      console.error("[Companies] Error fetching company:", error);
      res.status(500).json({
        message: "Error fetching company details",
        code: "INTERNAL_ERROR"
      });
    }
  });


  // Tasks endpoints
  app.get("/api/tasks/card/:companyName", requireAuth, async (req, res) => {
    try {
      const { companyName } = req.params;

      // Find the company by name
      const company = await db.query.companies.findFirst({
        where: eq(companies.name, companyName)
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Find card task for this company
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.company_id, company.id),
          eq(tasks.task_type, 'company_card')
        )
      });

      if (!task) {
        return res.status(404).json({ error: 'Card task not found for this company' });
      }

      return res.json(task);
    } catch (error) {
      console.error('Error fetching card task:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      console.log('[Tasks] ====== Starting task fetch =====');
      console.log('[Tasks] User details:', {
        id: req.user!.id,
        company_id: req.user!.company_id,
        email: req.user!.email
      });

      // First, let's check if there are any company-wide KYB tasks
      const kybTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.company_id, req.user!.company_id),
          eq(tasks.task_type, 'company_kyb'),
          eq(tasks.task_scope, 'company')
        ));

      console.log('[Tasks] KYB tasks found:', {
        count: kybTasks.length,
        tasks: kybTasks.map(t => ({
          id: t.id,
          company_id: t.company_id,
          task_scope: t.task_scope,
          task_type: t.task_type,
          assigned_to: t.assigned_to,
          status: t.status
        }))
      });

      // Get all tasks that are either:
      // 1. Assigned to the user
      // 2. Created by the user
      // 3. Company tasks (company_id matches user's company and no specific assignee)
      // 4. KYB tasks for the user's company
      // 5. User onboarding tasks for the user's email
      const query = or(
        eq(tasks.assigned_to, req.user!.id),
        eq(tasks.created_by, req.user!.id),
        and(
          eq(tasks.company_id, req.user!.company_id),
          isNull(tasks.assigned_to),
          eq(tasks.task_scope, 'company')
        ),
        and(
          eq(tasks.task_type, 'user_onboarding'),
          sql`LOWER(${tasks.user_email}) = LOWER(${req.user!.email})`
        )
      );

      console.log('[Tasks] Query conditions:', {
        conditions: {
          condition1: `tasks.assigned_to = ${req.user!.id}`,
          condition2: `tasks.created_by = ${req.user!.id}`,
          condition3: `tasks.company_id = ${req.user!.company_id} AND tasks.assigned_to IS NULL AND tasks.task_scope = 'company'`,
          condition4: `tasks.task_type = 'user_onboarding' AND LOWER(tasks.user_email) = LOWER('${req.user!.email}')`
        }
      });

      const userTasks = await db.select()
        .from(tasks)
        .where(query)
        .orderBy(sql`created_at DESC`);

      console.log('[Tasks] Tasks found:', {
        count: userTasks.length,
        tasks: userTasks.map(task => ({
          id: task.id,
          title: task.title,
          assigned_to: task.assigned_to,
          company_id: task.company_id,
          task_scope: task.task_scope,
          task_type: task.task_type,
          status: task.status
        }))
      });

      res.json(userTasks);
    } catch (error) {
      console.error("[Tasks] Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        position: error.position,
        hint: error.hint
      });
      console.error("[Tasks] Full error:", error);
      res.status(500).json({
        message: "Error fetching tasks",
        detail: error.message
      });
    }
  });

  // Relationships endpoints
  app.get("/api/relationships", requireAuth, async (req, res) => {
    try {
      console.log('[Relationships] Fetching network for company:', req.user!.company_id);

      // Get all relationships where the current company is either the creator or related company
      const networkRelationships = await db.select({
        id: relationships.id,
        companyId: relationships.company_id,
        relatedCompanyId: relationships.related_company_id,
        relationshipType: relationships.relationship_type,
        status: relationships.status,
        metadata: relationships.metadata,
        createdAt: relationships.created_at,
        // Join with companies to get related company details
        relatedCompany: {
          id: companies.id,
          name: companies.name,
          category: companies.category,
          logoId: companies.logo_id,
          accreditationStatus: companies.accreditation_status,
          riskScore: companies.risk_score
        }
      })
        .from(relationships)
        .innerJoin(
          companies,
          eq(
            companies.id,
            sql`CASE 
          WHEN ${relationships.company_id} = ${req.user!.company_id} THEN ${relationships.related_company_id}
          ELSE ${relationships.company_id}
        END`
          )
        )
        .where(
          or(
            eq(relationships.company_id, req.user!.company_id),
            eq(relationships.related_company_id, req.user!.company_id)
          )
        )
        .orderBy(companies.name);

      console.log('[Relationships] Found network members:', {
        count: networkRelationships.length,
        relationships: networkRelationships.map(r => ({
          id: r.id,
          companyName: r.relatedCompany.name,
          status: r.status,
          type: r.relationshipType
        }))
      });

      res.json(networkRelationships);
    } catch (error) {
      console.error("[Relationships] Error fetching relationships:", error);
      res.status(500).json({ message: "Error fetching relationships" });
    }
  });

  // Account setup endpoint
  app.post("/api/account/setup", async (req, res) => {
    try {
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;

      console.log('[Account Setup] Processing setup request for:', email);

      // Validate invitation code
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, invitationCode.toUpperCase()),
          eq(invitations.status, 'pending'),
          sql`LOWER(${invitations.email}) = LOWER(${email})`,
          gt(invitations.expires_at, new Date())
        ));

      if (!invitation) {
        console.log('[Account Setup] Invalid invitation:', invitationCode);
        return res.status(400).json({
          message: "Invalid invitation code or email mismatch"
        });
      }

      // Find existing user with case-insensitive email match
      const [existingUser] = await db.select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!existingUser) {
        console.log('[Account Setup] User not found for email:', email);
        return res.status(400).json({ message: "User account not found" });
      }

      // Update the existing user with new information
      const [updatedUser] = await db.update(users)
        .set({
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          password: await bcrypt.hash(password, 10),
          onboarding_user_completed: false, // Ensure this stays false for new user registration
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      console.log('[Account Setup] Updated user:', {
        id: updatedUser.id,
        email: updatedUser.email,
        onboarding_completed: updatedUser.onboarding_user_completed
      });

      // Update the related task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.user_email, email.toLowerCase()),
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        ));

      if (task) {
        const [updatedTask] = await db.update(tasks)
          .set({
            status: TaskStatus.COMPLETED,
            progress: 100, // Set directly to 100 for completed status
            assigned_to: updatedUser.id,
            metadata: {
              ...task.metadata,
              registeredAt: new Date().toISOString(),
              statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
            }
          })
          .where(eq(tasks.id, task.id))
          .returning();

        console.log('[Account Setup] Updated task status:', {
          taskId: updatedTask.id,
          status: updatedTask.status,
          progress: updatedTask.progress
        });

        broadcastTaskUpdate(updatedTask);
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          used_at: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      // Log the user in
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("[Account Setup] Login error:", err);
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json(updatedUser);
      });

    } catch (error) {
      console.error("[Account Setup] Account setup error:", error);
      res.status(500).json({ message: "Error updating user information" });
    }
  });

  // Add new endpoint after account setup endpoint
  app.post("/api/user/complete-onboarding", requireAuth, async (req, res) => {
    try {
      console.log('[User Onboarding] Completing onboarding for user:', req.user!.id);

      const [updatedUser] = await db.update(users)
        .set({
          onboarding_user_completed: true,
          updated_at: new Date()
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      console.log('[User Onboarding] Updated user onboarding status:', {
        id: updatedUser.id,
        onboarding_completed: updatedUser.onboarding_user_completed
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("[User Onboarding] Error updating onboarding status:", error);
      res.status(500).json({ message: "Error updating onboarding status" });
    }
  });

  // File upload endpoint
  app.post("/api/files/upload", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const storedPath = req.file.filename;

      // Check if file already exists
      const existingFile = await db.select()
        .from(files)
        .where(and(
          eq(files.name, req.file.originalname),
          eq(files.user_id, req.user!.id)
        ));

      if (existingFile.length > 0) {
        try {
          // Update existing file record
          const [updatedFile] = await db.update(files)
            .set({
              size: req.file.size,
              type: req.file.mimetype,
              path: storedPath,
              version: existingFile[0].version + 1
            })
            .where(eq(files.id, existingFile[0].id))
            .returning();

          console.log('Debug - Updated existing file record:', updatedFile);
          return res.status(200).json(updatedFile);
        } catch (error) {
          console.error('Error updating existing file:', error);
          // Clean up uploaded file on error
          const newFilePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
          if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
          }
          throw error;
        }
      }

      // Create new file record
      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: storedPath,
        status: 'uploaded',
        user_id: req.user!.id,
        company_id: req.user!.company_id,
        download_count: 0,
        version: 1.0,
      };

      const [file] = await db.insert(files)
        .values(fileData)
        .returning();

      console.log('Debug - Created new file record:', file);
      res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Error uploading file" });

      // Clean up uploaded file on error
      if (req.file) {
        const filePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });


  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.user_id, req.user!.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Remove the file from storage
      const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update file status to deleted
      await db.update(files)
        .set({ status: 'deleted' })
        .where(eq(files.id, file.id));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Error deleting file" });
    }
  });

  // Add file restore endpoint
  app.post("/api/files/:id/restore", requireAuth, async (req, res) => {
    try {
      // Find the file
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.user_id, req.user!.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.status !== 'deleted') {
        return res.status(400).json({ message: "File is not in deleted state" });
      }

      // Update file status to restored
      const [updatedFile] = await db.update(files)
        .set({ status: 'restored' })
        .where(eq(files.id, file.id))
        .returning();

      res.json(updatedFile);
    } catch (error) {
      console.error("Error restoring file:", error);
      res.status(500).json({ message: "Error restoring file" });
    }
  });

  // Update company logo upload endpoint
  app.post("/api/companies/:id/logo", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        console.log('Debug - No logo filein request');
        return res.status(400).json({ message: "No logo uploaded" });
      }

      console.log('Debug - Received logo upload:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const companyId = parseInt(req.params.id);
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        console.log('Debug - Company not found:', companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // If company already has a logo, delete the old file
      if (company.logo_id) {
        const [oldLogo] = await db.select()
          .from(companyLogos)
          .where(eq(companyLogos.id, company.logo_id));

        if (oldLogo) {
          const oldFilePath = path.resolve('/home/runner/workspace/uploads/logos', oldLogo.file_path);
          console.log('Debug - Attempting to delete old logo:', oldFilePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log('Debug - Successfully deleted old logo');
          } else {
            console.log('Debug - Old logo file not found on disk');
          }
        }
      }

      // Create logo record
      const [logo] = await db.insert(companyLogos)
        .values({
          company_id: companyId,
          file_name: req.file.originalname,
          file_path: req.file.filename,
          file_type: req.file.mimetype,
        })
        .returning();

      console.log('Debug - Created new logo record:', logo);

      // Update company with logo reference
      await db.update(companies)
        .set({ logo_id: logo.id })
        .where(eq(companies.id, companyId));

      // Verify file exists in the correct location
      const uploadedFilePath = path.resolve('/home/runner/workspace/uploads/logos', req.file.filename);
      console.log('Debug - Verifying uploaded file exists:', uploadedFilePath);
      if (!fs.existsSync(uploadedFilePath)) {
        console.error('Debug - Logo file not found after upload!');
        throw new Error('Logo file not found after upload');
      }

      res.json(logo);
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Error uploading company logo" });
    }
  });

  // Update the company logo endpoint to properly handle logo_id correctly
  app.get("/api/companies/:id/logo", requireAuth, async (req, res) => {
    try {
      console.log(`[Company Logo] Fetching logo for company ID: ${req.params.id}`);

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(req.params.id)));

      if (!company) {
        console.log(`[Company Logo] Company not found: ${req.params.id}`);
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      if (!company.logo_id) {
        console.log(`[Company Logo] No logo assigned for company: ${company.name} (${company.id})`);
        return res.status(404).json({
          message: "No logo assigned to company",
          code: "LOGO_NOT_ASSIGNED"
        });
      }

      // Get logo record and log it for debugging
      const [logo] = await db.select()
        .from(companyLogos)
        .where(eq(companyLogos.id, company.logo_id));

      console.log(`[Company Logo] Found logo record:`, logo);

      if (!logo) {
        console.log(`[Company Logo] Logo record not found for company ${company.name} (${company.id}), logo_id: ${company.logo_id}`);
        return res.status(404).json({
          message: "Logo record not found",
          code: "LOGO_RECORD_NOT_FOUND"
        });
      }

      if (!logo.file_path) {
        console.log(`[Company Logo] Logo file path is missing for company ${company.name}`);
        return res.status(404).json({
          message: "Logo file path is missing",
          code: "LOGO_PATH_MISSING"
        });
      }

      // Resolve correct file path
      const filePath = path.resolve('/home/runner/workspace/uploads/logos', logo.file_path);
      console.log(`[Company Logo] Attempting to serve logo from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.error(`Logo file missing for company ${company.name} (${company.id}): ${filePath}`);
        return res.status(404).json({
          message: "Logo file not found on disk",
          code: "LOGO_FILE_MISSING"
        });
      }

      try {
        // Validate SVG content
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<?xml') && !content.includes('<svg')) {
          console.error(`[Company Logo] Invalid SVG content for company ${company.name}:`, content.slice(0, 100));
          return res.status(400).json({
            message: "Invalid SVG file",
            code: "INVALID_SVG_CONTENT"
          });
        }

        // Set proper headers
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        console.log(`[Company Logo] Successfully served logo for company ${company.name} (${company.id})`);
      } catch (readError) {
        console.error(`[Company Logo] Error reading SVG file for company ${company.name}:`, readError);
        return res.status(500).json({
          message: "Error reading logo file",
          code: "LOGO_READ_ERROR"
        });
      }
    } catch (error) {
      console.error(`[Company Logo] Error serving company logo for ID ${req.params.id}:`, error);
      res.status(500).json({
        message: "Error serving company logo",
        code: "LOGO_SERVER_ERROR"
      });
    }
  });

  // Add this endpoint before the fintech invite endpoint
  app.post("/api/fintech/check-company", requireAuth, async (req, res) => {
    try {
      const { company_name } = req.body;

      if (!company_name) {
        return res.status(400).json({
          message: "Company name is required"        });
      }

      // Check for existing company with same name
      const [existingCompany] = await db.select()
        .from(companies)
        .where(sql`LOWER(${companies.name}) = LOWER(${company_name})`);

      if (existingCompany) {
        return res.status(409).json({
          message: "A company with this name already exists",
          existingCompany: {
            id: existingCompany.id,
            name: existingCompany.name,
            category: existingCompany.category
          }
        });
      }

      res.status(200).json({ exists: false });

    } catch (error) {
      console.error("Error checking company existence:", error);
      res.status(500).json({
        message: "Error checking company existence"
      });
    }
  });

  // Fix fintech invite endpoint task creation
  app.post("/api/fintech/invite", requireAuth, async (req, res) => {
    console.log('[FinTech Invite] Starting invitation process');console.log('[FinTech Invite] Request body:', req.body);

    try {
      const { email, company_name, full_name, sender_name } = req.body;

      // Input validation
      const invalidFields = [];
      if (!email) invalidFields.push('email');
      if (!company_name) invalidFields.push('company name');
      if (!full_name) invalidFields.push('full name');
      if (!sender_name) invalidFields.push('sender name');

      if (invalidFields.length > 0) {
        const errorMessage = invalidFields.length === 1
          ? `${invalidFields[0]} is required`
          : `${invalidFields.slice(0, -1).join(', ')}${invalidFields.length > 2 ? ',' : ''} and ${invalidFields.slice(-1)[0]} are required`;

        console.log('[FinTech Invite] Validation failed:', {
          receivedData: req.body,
          invalidFields,
          errorMessage
        });

        return res.status(400).json({
          message: errorMessage,
          invalidFields
        });
      }

      // Check for existing company before starting transaction
      const existingCompany = await db.query.companies.findFirst({
        where: sql`LOWER(${companies.name}) = LOWER(${company_name})`
      });

      if (existingCompany) {
        console.log('[FinTech Invite] Company already exists:', existingCompany.name);
        return res.status(409).json({
          message: "A company with this name already exists",
          existingCompany: {
            id: existingCompany.id,
            name: existingCompany.name,
            category: existingCompany.category
          }
        });
      }

      // Single transaction for all database operations
      const result = await db.transaction(async (tx) => {
        // Get sender's company details
        const [userCompany] = await tx.select()
          .from(companies)
          .where(eq(companies.id, req.user!.company_id));

        if (!userCompany) {
          throw new Error("Your company information not found");
        }

        console.log('[FinTech Invite] Found sender company:', {
          id: userCompany.id,
          name: userCompany.name
        });

        // Create new company
        const [newCompany] = await tx.insert(companies)
          .values({
            name: company_name.trim(),
            description: `FinTech partner company ${company_name}`,
            category: 'FinTech',
            status: 'active',
            accreditation_status: 'PENDING',
            onboarding_company_completed: false,
            available_tabs: ['task-center'], // Only task-center initially
            metadata: {
              invited_by: req.user!.id,
              invited_at: new Date().toISOString(),
              invited_from: userCompany.name,
              created_via: 'fintech_invite'
            }
          })
          .returning();

        if (!newCompany) {
          throw new Error("Failed to create company");
        }

        console.log('[FinTech Invite] Created new company:', {
          id: newCompany.id,
          name: newCompany.name,
          category: newCompany.category,
          available_tabs: newCompany.available_tabs
        });

        // Create user account
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const [newUser] = await tx.insert(users)
          .values({
            email: email.toLowerCase(),
            full_name: full_name,
            password: hashedPassword,
            company_id: newCompany.id,
            onboarding_user_completed: false,
            metadata: {
              invited_by: req.user!.id,
              invited_at: new Date().toISOString()
            }
          })
          .returning();

        console.log('[FinTech Invite] Created new user:', {
          id: newUser.id,
          email: newUser.email,
          companyId: newCompany.id
        });

        // Create invitation
        const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const [invitation] = await tx.insert(invitations)
          .values({
            email: email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            company_id: newCompany.id,
            invitee_name: full_name,
            invitee_company: company_name,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: {
              invited_by: req.user!.id,
              invited_at: new Date().toISOString()
            }
          })
          .returning();

        console.log('[FinTech Invite] Created invitation:', {
          id: invitation.id,
          code: invitationCode,
          companyId: newCompany.id
        });

        // Create required tasks
        // KYB Task
        const [kybTask] = await tx.insert(tasks)
          .values({
            title: `Company KYB: ${company_name}`,
            description: `Complete Know Your Business (KYB) process for ${company_name}`,
            task_type: 'company_kyb',
            task_scope: 'company',
            status: TaskStatus.NOT_STARTED,
            priority: 'high',
            progress: 0,
            created_by: req.user!.id,
            company_id: newCompany.id,
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            metadata: {
              company_id: newCompany.id,
              status_flow: [TaskStatus.NOT_STARTED],
              created_at: new Date().toISOString()
            }
          })
          .returning();

        console.log('[FinTech Invite] Created KYB task:', {
          id: kybTask.id,
          status: kybTask.status,
          companyId: newCompany.id
        });

        // CARD Task
        const [cardTask] = await tx.insert(tasks)
          .values({
            title: `Company CARD: ${company_name}`,
            description: `Provide Compliance and Risk Data (CARD) for ${company_name}`,
            task_type: 'company_card',
            task_scope: 'company',
            status: TaskStatus.NOT_STARTED,
            priority: 'high',
            progress: 0,
            created_by: req.user!.id,
            company_id: newCompany.id,
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            metadata: {
              company_id: newCompany.id,
              status_flow: [TaskStatus.NOT_STARTED],
              created_at: new Date().toISOString()
            }
          })
          .returning();

        console.log('[FinTech Invite] Created CARD task:', {
          id: cardTask.id,
          status: cardTask.status,
          companyId: newCompany.id
        });

        // Onboarding Task
        const [onboardingTask] = await tx.insert(tasks)
          .values({
            title: `New User Invitation: ${email}`,
            description: `Complete user onboarding for ${full_name}`,
            task_type: 'user_onboarding',
            task_scope: 'user',
            status: TaskStatus.EMAIL_SENT,
            priority: 'medium',
            progress: 25,
            created_by: req.user!.id,
            assigned_to: newUser.id,
            company_id: newCompany.id,
            user_email: email.toLowerCase(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: {
              user_id: newUser.id,
              invitation_id: invitation.id,
              invitation_code: invitationCode,
              status_flow: [TaskStatus.EMAIL_SENT],
              email_sent_at: new Date().toISOString()
            }
          })
          .returning();

        console.log('[FinTech Invite] Created onboarding task:', {
          id: onboardingTask.id,
          status: onboardingTask.status,
          companyId: newCompany.id,
          assignedTo: newUser.id
        });

        return {
          company: newCompany,
          user: newUser,
          invitation,
          tasks: {
            kyb: kybTask,
            card: cardTask,
            onboarding: onboardingTask
          }
        };
      });

      console.log('[FinTech Invite] Process completed successfully:', {
        companyId: result.company.id,
        companyName: result.company.name,
        userId: result.user.id,
        invitationId: result.invitation.id,
        tasks: {
          kyb: result.tasks.kyb.id,
          card: result.tasks.card.id,
          onboarding: result.tasks.onboarding.id
        }
      });

      // Send invitation email outside transaction
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const inviteUrl = `${protocol}://${host}/register?code=${result.invitation.code}&email=${encodeURIComponent(email)}`;

      const emailResult = await emailService.sendTemplateEmail({
        to: email.toLowerCase(),
        from: process.env.GMAIL_USER!,
        template: 'fintech_invite',
        templateData: {
          recipientName: full_name,
          recipientEmail: email.toLowerCase(),
          senderName: sender_name,
          senderCompany: result.company.name,
          targetCompany: company_name,
          inviteUrl,
          code: result.invitation.code
        }
      });

      if (!emailResult.success) {
        console.error('[FinTech Invite] Failed to send email:', emailResult.error);
        // If email fails, we don't rollback the transaction, but log it
        // The user can retry sending the email later
      }

      return res.status(201).json({
        message: "Invitation sent successfully",
        company: {
          id: result.company.id,
          name: result.company.name
        }
      });

    } catch (error) {
      console.error('[FinTech Invite] Error processing invitation:', error);
      return res.status(500).json({
        message: "Failed to process invitation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add endpoint for companies to add other companies to their network
  app.post("/api/companies/:id/network", requireAuth, async (req, res) => {
    try {
      const targetCompanyId = parseInt(req.params.id);

      // Verify the target company exists
      const [targetCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, targetCompanyId));

      if (!targetCompany) {
        return res.status(404).json({ message: "Target company not found" });
      }

      // Check if relationship already exists
      const [existingRelationship] = await db.select()
        .from(relationships)
        .where(and(
          eq(relationships.company_id, req.user!.company_id),
          eq(relationships.related_company_id, targetCompanyId)
        ));

      if (existingRelationship) {
        return res.status(400).json({ message: "Company is already in your network" });
      }

      // Create the relationship
      const [relationship] = await db.insert(relationships)
        .values({
          company_id: req.user!.company_id,
          related_company_id: targetCompanyId,
          relationship_type: 'network_member',
          status: 'active',
          metadata: {
            added_at: new Date().toISOString(),
            added_by: req.user!.id
          }
        })
        .returning();

      res.status(201).json(relationship);
    } catch (error) {
      console.error("Error adding company to network:", error);
      res.status(500).json({ message: "Error adding company to network" });
    }
  });

  // Update the user invite endpoint after the existing registration endpoint
  app.post("/api/users/invite", requireAuth, async (req, res) => {
    try {
      console.log('[Invite] Starting invitation process');
      console.log('[Invite] Request body:', req.body);

      // Validate and normalize invite data
      const inviteData = {
        email: req.body.email.toLowerCase(),
        full_name: req.body.full_name,
        company_id: req.body.company_id,
        company_name: req.body.company_name,
        sender_name: req.body.sender_name,
        sender_company: req.body.sender_company
      };

      console.log('[Invite] Validated invite data:', inviteData);

      // Start a database transaction
      console.log('[Invite] Starting database transaction');
      const result = await db.transaction(async (tx) => {
        try {
          console.log('[Invite] Creating user account');
          // Create new user account with explicit company_id
          const [user] = await tx.insert(users)
            .values({
              email: inviteData.email,
              full_name: inviteData.full_name,
              company_id: inviteData.company_id, // Explicitly set company_id from invite data
              password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
              onboarding_user_completed: false
            })
            .returning();

          if (!user) {
            throw new Error('Failed to create user account');
          }

          // Create invitation record
          const inviteCode = generateInviteCode();
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);

          const [invitation] = await tx.insert(invitations)
            .values({
              email: inviteData.email,
              status: 'pending',
              code: inviteCode,
              company_id: inviteData.company_id,
              invitee_name: inviteData.full_name,
              invitee_company: inviteData.company_name,
              expires_at: expiryDate
            })
            .returning();

          // Create task for tracking the invitation
          const [task] = await tx.insert(tasks)
            .values({
              title: `New User Invitation: ${inviteData.email}`,
              description: `Invitation sent to ${inviteData.full_name} (${inviteData.email}) to join ${inviteData.company_name}`,
              task_type: 'user_onboarding',
              task_scope: 'user',
              status: TaskStatus.EMAIL_SENT,
              progress: 100, // Set directly to 100 for completed status
              priority: 'high',
              company_id: inviteData.company_id,
              user_email: inviteData.email,
              created_by: req.user!.id, // Ensure created_by is set
              metadata: {
                invitation_id: invitation.id,
                invited_by: req.user!.id,
                invited_at: new Date().toISOString(),
                status_flow: [TaskStatus.EMAIL_SENT]
              }
            })
            .returning();

          // Update invitation with task reference
          await tx.update(invitations)
            .set({ task_id: task.id })
            .where(eq(invitations.id, invitation.id));

          // Send invitation email
          await emailService.sendTemplateEmail({
            to: inviteData.email,
            from: 'noreply@example.com',
            template: 'user_invite',
            templateData: {
              recipientEmail: inviteData.email,
              recipientName: inviteData.full_name,
              senderName: inviteData.sender_name,
              senderCompany: inviteData.sender_company,
              targetCompany: inviteData.company_name,
              code: inviteCode,
              inviteUrl: `${process.env.APP_URL}/auth?code=${inviteCode}`
            }
          });

          return { invitation, task, user };
        } catch (error) {
          console.error('[Invite] Error processing invitation:', error);
          throw error;
        }
      });

      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: result.invitation,
        task: result.task
      });

    } catch (error) {
      console.error('[Invite] Error processing invitation:', error);
      res.status(500).json({
        message: 'Error processing invitation request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add invitation validation endpoint
  app.get("/api/invitations/:code/validate", async (req, res) => {
    try {
      console.log('[Invite Debug] Starting validation for code:', req.params.code);

      // Get the invitation with case-insensitive code match and valid expiration
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, req.params.code.toUpperCase()),
          eq(invitations.status, 'pending'),
          sql`${invitations.expires_at} > NOW()`
        ));

      if (!invitation) {
        console.log('[Invite Debug] No valid invitation found for code:', req.params.code);
        return res.json({
          valid: false,
          message: "Invalid or expired invitation code"
        });
      }

      console.log('[Invite Debug] Found valid invitation:', {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at
      });

      res.json({
        valid: true,
        invitation: {
          email: invitation.email,
          invitee_name: invitation.invitee_name,
          company_name: invitation.invitee_company
        }
      });

    } catch (error) {
      console.error('[Invite Debug] Validation error:', error);
      res.status(500).json({
        valid: false,
        message: "Error validating invitation code"
      });
    }
  });

  // Add this endpoint to handle user onboarding completion
  app.post("/api/users/complete-onboarding", requireAuth, async (req, res) => {
    try {
      console.log('[Complete Onboarding] Processing request for user:', req.user!.id);

      // Update user's onboarding status
      const [updatedUser] = await db.update(users)
        .set({
          onboarding_user_completed: true,
          updated_at: new Date()
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      if (!updatedUser) {
        console.error('[Complete Onboarding] Failed to update user:', req.user!.id);
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Try to update the onboarding task status
      const updatedTask = await updateOnboardingTaskStatus(req.user!.id);

      console.log('[Complete Onboarding] Successfully completed onboarding for user:', {
        userId: updatedUser.id,
        taskId: updatedTask?.id
      });

      res.json({
        message: "Onboarding completed successfully",
        user: updatedUser,
        task: updatedTask
      });

    } catch (error) {
      console.error("[Complete Onboarding] Error:", error);
      res.status(500).json({
        message: "Error completing onboarding",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Utility functions
  function generateInviteCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  function formatTimestampForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  function toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async function updateOnboardingTaskStatus(userId: number): Promise<{ id: number; status: TaskStatus; } | null> {
    try {
      const [task] = await db.select().from(tasks).where(eq(tasks.user_email, (await db.select().from(users).where(eq(users.id, userId))).find()?.email));

      if (task && task.task_type === 'user_onboarding') {
        const [updatedTask] = await db.update(tasks)
          .set({ status: TaskStatus.COMPLETED, progress: 100 })
          .where(eq(tasks.id, task.id))
          .returning();
        return updatedTask;
      }
      return null;
    } catch (error) {
      console.error('[updateOnboardingTaskStatus] Error updating task status:', error);
      return null;
    }
  }

  console.log('[Routes] Routes setup completed');
  return app;
}

// Export both the named and default function for backward compatibility
export default registerRoutes;