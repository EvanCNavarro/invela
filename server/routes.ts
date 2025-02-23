import { Express } from 'express';
import { eq, and, gt, sql, or, isNull } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { users, companies, files, companyLogos, relationships, tasks, invitations } from '@db/schema';
import { emailService } from './services/email';
import { requireAuth } from './middleware/auth';
import { logoUpload } from './middleware/upload';
import { broadcastTaskUpdate } from './services/websocket';
import crypto from 'crypto';
import companySearchRouter from "./routes/company-search";
import { createCompany } from "./services/company";
import { TaskStatus, taskStatusToProgress } from './types';
import kybRouter from './routes/kyb';
import filesRouter from './routes/files';

// Generate invitation code helper function (keep it DRY)
function generateInviteCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Progress mapping for task statuses
//const taskStatusToProgress: Record<TaskStatus, number> = {
//  [TaskStatus.PENDING]: 0,
//  [TaskStatus.EMAIL_SENT]: 25,
//  [TaskStatus.COMPLETED]: 100,
//  [TaskStatus.FAILED]: 100,
//};

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File
    }
  }
}

export function registerRoutes(app: Express): Express {
  app.use(companySearchRouter);
  app.use(kybRouter);
  app.use(filesRouter); // Mount the files router

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
        foundersAndLeadership: company.leadership_team || 'No leadership information available'
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

  //New Endpoint
  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      console.log('[Company Details] Fetching company:', req.params.id);

      // Get company details along with relationship check
      const [company] = await db.select({
        id: companies.id,
        name: companies.name,
        category: companies.category,
        description: companies.description,
        logo_id: companies.logo_id,
        accreditation_status: companies.accreditation_status,
        risk_score: companies.risk_score,
        onboarding_company_completed: companies.onboarding_company_completed,
        website_url: companies.website_url,
        legal_structure: companies.legal_structure,
        hq_address: companies.hq_address,
        employee_count: companies.employee_count,
        products_services: companies.products_services,
        incorporation_year: companies.incorporation_year,
        investors_info: companies.investors_info,
        funding_stage: companies.funding_stage,
        key_partners: companies.key_partners,
        leadership_team: companies.leadership_team,
        // Check if requesting user has access
        has_relationship: sql<boolean>`
          ${companies.id} = ${req.user!.company_id}
          OR EXISTS (
            SELECT 1 FROM ${relationships} r 
            WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user!.company_id})
            OR (r.company_id = ${req.user!.company_id} AND r.related_company_id = ${companies.id})
          )
        `
      })
      .from(companies)
      .where(eq(companies.id, parseInt(req.params.id)));

      if (!company) {
        console.log('[Company Details] Company not found:', req.params.id);
        return res.status(404).json({ 
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      if (!company.has_relationship) {
        console.log('[Company Details] Access denied for company:', {
          companyId: company.id,
          userId: req.user!.id,
          userCompanyId: req.user!.company_id
        });
        return res.status(403).json({ 
          message: "You don't have permission to view this company's information. This company is not in your network.",
          code: "ACCESS_DENIED"
        });
      }

      // Transform response to match frontend expectations
      const transformedCompany = {
        ...company,
        websiteUrl: company.website_url || 'N/A',
        legalStructure: company.legal_structure || 'N/A',
        hqAddress: company.hq_address || 'N/A',
        numEmployees: company.employee_count || 'N/A',
        productsServices: company.products_services || 'N/A',
        incorporationYear: company.incorporation_year || 'N/A',
        investors: company.investors_info || 'No investor information available',
        fundingStage: company.funding_stage || null,
        keyClientsPartners: company.key_partners || 'No client/partner information available',
        foundersAndLeadership: company.leadership_team || 'No leadership information available'
      };

      console.log('[Company Details] Successfully fetched company:', {
        id: company.id,
        name: company.name,
        hasAccess: company.has_relationship
      });

      res.json(transformedCompany);
    } catch (error) {
      console.error("[Company Details] Error fetching company:", error);
      res.status(500).json({ message: "Error fetching company details" });
    }
  });

  // Tasks endpoints
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
          eq(invitations.code, invitationCode),
          eq(invitations.status, 'pending'),
          sql`LOWER(${invitations.email}) = LOWER(${email})`,
          gt(invitations.expiresAt, new Date())
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
          firstName,
          lastName,
          fullName,
          password: await bcrypt.hash(password, 10),
          onboardingUserCompleted: true,
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      console.log('[Account Setup] Updated user:', updatedUser.id);

      // Update the related task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.userEmail, email.toLowerCase()),
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        ));

      if (task) {
        const [updatedTask] = await db.update(tasks)
          .set({
            status: TaskStatus.COMPLETED,
            progress: taskStatusToProgress[TaskStatus.COMPLETED],
            assignedTo: updatedUser.id,
            metadata: {
              ...task.metadata,
              registeredAt: new Date().toISOString(),
              statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
            }
          })
          .where(eq(tasks.id, task.id))
          .returning();

        broadcastTaskUpdate(updatedTask);
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          usedAt: new Date(),
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
          eq(files.userId, req.user!.id)
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
        userId: req.user!.id,
        companyId: req.user!.companyId,
        downloadCount: 0,
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
          eq(files.userId, req.user!.id)
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
          eq(files.userId, req.user!.id)
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
      if (company.logoId) {
        const [oldLogo] = await db.select()
          .from(companyLogos)
          .where(eq(companyLogos.id, company.logoId));

        if (oldLogo) {
          const oldFilePath = path.resolve('/home/runner/workspace/uploads/logos', oldLogo.filePath);
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
          companyId,
          fileName: req.file.originalname,
          filePath: req.file.filename,
          fileType: req.file.mimetype,
        })
        .returning();

      console.log('Debug - Created new logo record:', logo);

      // Update company with logo reference
      await db.update(companies)
        .set({ logoId: logo.id })
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

  // Update the company logo endpoint to properly handle missing logos
  app.get("/api/companies/:id/logo", requireAuth, async (req, res) => {
    try {
      console.log(`Debug - Logo request for company ID: ${req.params.id}`);

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(req.params.id)));

      if (!company) {
        console.log(`Debug - Company not found: ${req.params.id}`);
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      if (!company.logoId) {
        console.log(`Debug - No logo assigned for company: ${company.name} (${company.id})`);
        return res.status(404).json({
          message: "No logo assigned to company",
          code: "LOGO_NOT_ASSIGNED"
        });
      }

      const [logo] = await db.select()
        .from(companyLogos)
        .where(eq(companyLogos.id, company.logoId));

      if (!logo) {
        console.log(`Debug - Logo record not found for company ${company.name} (${company.id}), logoId: ${company.logoId}`);
        return res.status(404).json({
          message: "Logo record not found",
          code: "LOGO_RECORD_NOT_FOUND"
        });
      }

      // Fix path resolution - remove extra 'uploads/logos' from the path
      const filePath = path.resolve('/home/runner/workspace/uploads/logos', logo.filePath.replace('uploads/logos/', ''));
      console.log(`Debug - Attempting to serve logo from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.error(`Logo file missing for company ${company.name} (${company.id}): ${filePath}`);
        // Log directory contents to help debug
        const dir = path.resolve('/home/runner/workspace/uploads/logos');
        const dirContents = fs.readdirSync(dir);
        console.log('Debug - Logo directory contents:', dirContents);

        return res.status(404).json({
          message: "Logo file not found on disk",
          code: "LOGO_FILE_MISSING"
        });
      }

      try {
        // Try to read and validate SVG content
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<?xml') && !content.includes('<svg')) {
          console.error(`Debug - Invalid SVG content for company ${company.name}:`, content.slice(0, 100));
          return res.status(400).json({
            message: "Invalid SVG file",
            code: "INVALID_SVG_CONTENT"
          });
        }

        // Add Content-Type and security headers
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream the file with proper error handling
        const fileStream = fs.createReadStream(filePath);

        fileStream.on('error', (error) => {
          console.error(`Error streaming logo file for company ${company.name}:`, error);
          if (!res.headersSent) {
            res.status(500).json({
              message: "Error serving logo file",
              code: "LOGO_STREAM_ERROR"
            });
          }
        });

        fileStream.pipe(res);

      } catch (readError) {
        console.error(`Debug - Error reading SVG file for company ${company.name}:`, readError);
        return res.status(500).json({
          message: "Error reading logo file",
          code: "LOGO_READ_ERROR"
        });
      }

    } catch (error) {
      console.error(`Error serving company logo for ID ${req.params.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Error serving company logo",
          code: "LOGO_SERVER_ERROR"
        });
      }
    }
  });

  // Add this endpoint before the fintech invite endpoint
  app.post("/api/fintech/check-company", requireAuth, async (req, res) => {
    try {
      const { company_name } = req.body;

      if (!company_name) {
        return res.status(400).json({
          message: "Company name is required"
        });
      }

      // Check for existing company with same name
      const [existingCompany] = await db.select()
        .from(companies)        .where(sql`LOWER(${companies.name}) = LOWER(${company_name})`);

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

  // Fix fintech invite logging
  app.post("/api/fintech/invite", requireAuth, async (req, res) => {
    console.log('[FinTech Invite] Startinginvitation process');
    console.log('[FinTech Invite] Request body:', req.body);

    try {
      const { email, company_name, full_name, sender_name } = req.body;

      // Input validation before starting transaction
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

      // Database transaction for atomicity
      const result = await db.transaction(async (tx) => {
        try {
          // Step 1: Get user's company details first
          console.log('[FinTech Invite] Fetching sender company details');
          const [userCompany] = await tx.select()
            .from(companies)
            .where(eq(companies.id, req.user!.companyId));

          if (!userCompany) {
            console.error('[FinTech Invite] Sender company not found:', req.user!.companyId);
            throw new Error("Your company information not found");
          }
          console.log('[FinTech Invite] Found sender company:', userCompany.name);

          // Step 2: Check for existing company with same name
          console.log('[FinTech Invite] Checking for existing company:', company_name);
          const [existingCompany] = await tx.select()
            .from(companies)
            .where(sql`LOWER(${companies.name}) = LOWER(${company_name})`);

          if (existingCompany) {
            console.error('[FinTech Invite] Company already exists:', existingCompany.name);
            return res.status(409).json({
              message: "A company with this name already exists",
              existingCompany: {
                id: existingCompany.id,
                name: existingCompany.name,
                category: existingCompany.category
              }
            });
          }

          // Step 3: Create new company record with proper status
          console.log('[FinTech Invite] Creating new company:', company_name);

          const companyData = {
            name: company_name.trim(),
            description: `FinTech partner company ${company_name}`,
            category: 'FinTech',
            status: 'active',
            accreditationStatus: 'PENDING',
            onboardingCompanyCompleted: false,
            metadata: {
              invitedBy: req.user!.id,
              invitedAt: new Date().toISOString(),
              invitedFrom: userCompany.name,
              createdVia: 'fintech_invite'
            }
          };

          console.log('[FinTech Invite] Attempting to insert company with data:', JSON.stringify(companyData, null, 2));

          const newCompany = await createCompany(companyData);

          if (!newCompany) {
            console.error('[FinTech Invite] Failed to create company - null response');
            throw new Error("Failed to create company record");
          }

          if (!newCompany.id) {
            console.error('[FinTech Invite] Company created but missing ID:', newCompany);
            throw new Error("Invalid company record created");
          }

          console.log('[FinTech Invite] Successfully created company:', {
            id: newCompany.id,
            name: newCompany.name,
            status: newCompany.status,
            category: newCompany.category,
            createdAt: newCompany.createdAt,
            metadata: newCompany.metadata
          });

          // Step 4: Create user record with temporary password
          console.log('[FinTech Invite] Creating user account');
          const tempPassword = crypto.randomBytes(32).toString('hex');
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          const [newUser] = await tx.insert(users)
            .values({
              email: email.toLowerCase(),
              password: hashedPassword,
              companyId: newCompany.id,
              fullName: full_name,
              onboardingUserCompleted: false,
              metadata: {
                invitedBy: req.user!.id,
                invitedAt: new Date().toISOString(),
                invitedFrom: userCompany.name,
                createdVia: 'fintech_invite'
              }
            })
            .returning();

          if (!newUser) {
            console.error('[FinTech Invite] Failed to create user account');
            throw new Error("Failed to create user account");
          }

          console.log('[FinTech Invite] Successfully created user:', {
            id: newUser.id,
            email: newUser.email
          });

          // Generate invitation code
          const code = generateInviteCode();
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 7);

          // Create invitation record
          console.log('[FinTech Invite] Creating invitation for:', email);
          const [invitation] = await tx.insert(invitations)
            .values({
              email: email.toLowerCase(),
              code,
              status: 'pending',
              companyId: newCompany.id,
              inviteeName: full_name,
              inviteeCompany: company_name,
              expiresAt: expirationDate,
              metadata: {
                userId: newUser.id,
                senderName: sender_name,
                senderCompanyId: userCompany.id,
                senderCompanyName: userCompany.name,
                createdAt: new Date().toISOString()
              }
            })
            .returning();

          if (!invitation) {
            console.error('[FinTech Invite] Failed to create invitation');
            throw new Error("Failed to create invitation record");
          }

          console.log('[FinTech Invite] Successfully created invitation:', {
            id: invitation.id,
            code: invitation.code,
            status: invitation.status
          });

          // Create task for invitation
          console.log('[FinTech Invite] Creating task');
          const [task] = await tx.insert(tasks)
            .values({
              title: `New User Invitation: ${email}`,
              description: `Invitation sent to ${full_name} to join ${company_name} on the platform.`,
              taskType: 'user_onboarding',
              taskScope: 'user',
              status: TaskStatus.PENDING,
              priority: 'medium',
              progress: taskStatusToProgress[TaskStatus.PENDING],
              createdBy: req.user!.id,
              userEmail: email.toLowerCase(),
              companyId: newCompany.id,
              dueDate: expirationDate,
              metadata: {
                userId: newUser.id,
                inviteeName: full_name,
                inviteeCompany: company_name,
                senderName: sender_name,
                companyCreatedAt: newCompany.createdAt,
                invitationId: invitation.id,
                invitationCode: code,
                statusFlow: [TaskStatus.PENDING]
              }
            })
            .returning();

          if (!task) {
            console.error('[FinTech Invite] Failed to create task');
            throw new Error("Failed to create task record");
          }

          console.log('[FinTech Invite] Successfully created task:', {
            id: task.id,
            status: task.status
          });

          // Send invitation email
          console.log('[FinTech Invite] Sending invitation email');
          const inviteUrl = `${req.protocol}://${req.get('host')}/register?code=${code}&email=${encodeURIComponent(email)}`;

          try {
            const emailResult = await emailService.sendTemplateEmail({
              to: email,
              from: process.env.GMAIL_USER!,
              template: 'fintech_invite',
              templateData: {
                recipientName: full_name,
                recipientEmail: email.toLowerCase(),
                senderName: sender_name,
                senderCompany: userCompany.name,
                targetCompany: company_name,
                inviteUrl,
                code
              }
            });

            if (!emailResult.success) {
              console.error('[FinTech Invite] Email sending failed:', emailResult.error);
              throw new Error(`Failed to send invitation email: ${emailResult.error}`);
            }

            // Update task status after successful email
            const [updatedTask] = await tx.update(tasks)
              .set({
                status: TaskStatus.EMAIL_SENT,
                progress: taskStatusToProgress[TaskStatus.EMAIL_SENT],
                metadata: {
                  ...task.metadata,
                  emailSentAt: new Date().toISOString(),
                  statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.EMAIL_SENT]
                }
              })
              .where(eq(tasks.id, task.id))
              .returning();

            if (!updatedTask) {
              console.error('[FinTech Invite] Failed to update task status');
              throw new Error("Failed to update task status");
            }

            console.log('[FinTech Invite] Successfully completed invitation process');
            return { invitation, task: updatedTask, company: newCompany, user: newUser };

          } catch (emailError) {
            console.error("[FinTech Invite] Email sending failed:", emailError);
            throw new Error("Failed to send invitation email. Please try again.");
          }
        } catch (error) {
          console.error('[FinTech Invite] Transaction error:', error);
          throw error; // Re-throw to trigger rollback
        }
      });

      console.log('[FinTech Invite] Invitation completed successfully');
      res.json({
        message: "Invitation sent successfully",
        invitation: result.invitation,
        company: result.company,
        user: result.user
      });

    } catch (error: any) {
      console.error("[FinTech Invite] Error processing invitation:", error);
      res.status(500).json({
        message: error.message || "Failed to send invitation. Please try again."
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
          eq(relationships.companyId, req.user!.companyId),
          eq(relationships.relatedCompanyId, targetCompanyId)
        ));

      if (existingRelationship) {
        return res.status(400).json({ message: "Company is already in your network" });
      }

      // Create the relationship
      const [relationship] = await db.insert(relationships)
        .values({
          companyId: req.user!.companyId,
          relatedCompanyId: targetCompanyId,
          relationshipType: 'network_member',
          status: 'active',
          metadata: {
            addedAt: new Date().toISOString(),
            addedBy: req.user!.id
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
    console.log('[Invite] Starting invitation process');
    console.log('[Invite] Request body:', req.body);

    try {
      // Validate and normalize invite data
      const inviteData = {
        email: req.body.email.toLowerCase(),
        fullName: req.body.full_name,
        companyId: req.body.company_id,
        companyName: req.body.company_name,
        senderName: req.body.sender_name,
        senderCompany: req.body.sender_company || (req.user?.companyId === 0 ? 'Invela' : undefined)
      };

      console.log('[Invite] Validated invite data:', inviteData);

      if (!inviteData.senderCompany) {
        console.error('[Invite] Missing sender company:', inviteData);
        throw new Error("Sender company is required");
      }

      // Create the transaction for atomic operations
      const result = await db.transaction(async (tx) => {
        console.log('[Invite] Starting database transaction');
        console.log('[Invite] Creating user account');

        // Generate a temporary password
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user account with temporary password
        const [newUser] = await tx.insert(users)
          .values({
            email: inviteData.email,
            password: hashedPassword,
            companyId: inviteData.companyId,
            fullName: inviteData.fullName,
            onboardingUserCompleted: false
          })
          .returning();

        console.log('[Invite] Created user account:', { id: newUser.id, email: newUser.email });

        // Generate invitation code
        const code = generateInviteCode();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        console.log('[Invite] Creating invitation record with code:', code);

        // Create invitation record
        const [invitation] = await tx.insert(invitations)
          .values({
            email: inviteData.email,
            code,
            status: 'pending',
            companyId: inviteData.companyId,
            inviteeName: inviteData.fullName,
            inviteeCompany: inviteData.companyName,
            expiresAt: expiryDate,
            metadata: {
              userId: newUser.id,
              senderName: inviteData.senderName,
              senderCompany: inviteData.senderCompany,
              createdAt: new Date().toISOString()
            }
          })
          .returning();

        console.log('[Invite] Created invitation:', invitation);

        // Create associated task
        console.log('[Invite] Creating associated task');
        const [task] = await tx.insert(tasks)
          .values({
            title: `New User Invitation: ${inviteData.email}`,
            description: `Invitation sent to ${inviteData.fullName} to join ${inviteData.companyName}`,
            taskType: 'user_onboarding',
            taskScope: 'user',
            status: TaskStatus.EMAIL_SENT,
            priority: 'medium',
            progress: taskStatusToProgress[TaskStatus.EMAIL_SENT],
            createdBy: req.user!.id,
            userEmail: inviteData.email,
            companyId: inviteData.companyId,
            dueDate: expiryDate,
            metadata: {
              userId: newUser.id,
              senderName: inviteData.senderName,
              statusFlow: [TaskStatus.EMAIL_SENT],
              emailSentAt: new Date().toISOString(),
              invitationId: invitation.id,
              invitationCode: code
            }
          })
          .returning();

        console.log('[Invite] Created task:', task);

        // Send invitation email
        console.log('[Invite] Sending invitation email');
        console.log('[Invite] Email template data:', {
          recipientName: inviteData.fullName,
          recipientEmail: inviteData.email,
          senderName: inviteData.senderName,
          senderCompany: inviteData.senderCompany,
          targetCompany: inviteData.companyName,
          inviteUrl: `${process.env.APP_URL}/register?code=${invitation.code}`,
          code: invitation.code
        });

        const emailResult = await emailService.sendTemplateEmail({
          to: inviteData.email,
          from: process.env.GMAIL_USER!,
          template: 'user_invite',
          templateData: {
            recipientName: inviteData.fullName,
            recipientEmail: inviteData.email,
            senderName: inviteData.senderName,
            senderCompany: inviteData.senderCompany,
            targetCompany: inviteData.companyName,
            inviteUrl: `${process.env.APP_URL}/register?code=${invitation.code}`,
            code: invitation.code
          }
        });

        if (!emailResult.success) {
          console.error('[Invite] Failed to send email:', emailResult.error);
          throw new Error(emailResult.error || 'Failed to send invitation email');
        }

        console.log('[Invite] Successfully sent invitation email');
        console.log('[Invite] Successfully completed invitation process');

        return { invitation, task, user: newUser };
      });

      res.json({
        message: "Invitation sent successfully",
        invitation: result.invitation,
        user: result.user
      });

    } catch (error: any) {
      console.error("[Invite] Error processing invitation:", error);
      res.status(500).json({
        message: error.message || "Failed to send invitation. Please try again."
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
          eq(relationships.companyId, req.user!.companyId),
          eq(relationships.relatedCompanyId, targetCompanyId)
        ));

      if (existingRelationship) {
        return res.status(400).json({ message: "Company is already in your network" });
      }

      // Create the relationship
      const [relationship] = await db.insert(relationships)
        .values({
          companyId: req.user!.companyId,
          relatedCompanyId: targetCompanyId,
          relationshipType: 'network_member',
          status: 'active',
          metadata: {
            addedAt: new Date().toISOString(),
            addedBy: req.user!.id
          }
        })
        .returning();

      res.status(201).json(relationship);
    } catch (error) {
      console.error("Error adding company to network:", error);
      res.status(500).json({ message: "Error adding company to network" });
    }
  });

  // Update the user invitation endpoint to include sender details
  app.post("/api/invitations", requireAuth, async (req, res) => {
    try {
      const { email, name: recipientName } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Format the recipient's name
      const formattedName = recipientName
        ?.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || email.split('@')[0];

      // Get sender's full name and company
      const [sender] = await db.select()
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.id, req.user!.id));

      if (!sender || !sender.companies) {
        return res.status(400).json({ message: "Sender company information not found" });
      }

      const senderName = sender.users.fullName;
      const senderCompany = sender.companies.name;

      // Generate invitation code
      const code = generateInviteCode();

      console.log('Debug - Creating invitation with details:', {
        senderName,
        senderCompany,
        recipientName: formattedName,
        email
      });

      // Create invitation record
      const [invitation] = await db.insert(invitations)
        .values({
          email,
          code,
          status: 'pending',
          companyId: req.user!.companyId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdBy: req.user!.id
        })
        .returning();

      const inviteUrl = `${req.protocol}://${req.get('host')}`;

      console.log('Debug - Preparing to send invitation email');
      // Send invitation email with formatted name and company details
      const emailParams = {
        to: email,
        from: process.env.GMAIL_USER!,
        template: 'user_invite',
        templateData: {
          recipientEmail: email,
          recipientName: formattedName,
          senderName,
          senderCompany,
          code,
          inviteUrl,
        }
      };

      console.log('Debug - Sending invitation email with params:', {
        to: email,
        template: 'user_invite',
        senderName,
        senderCompany,
        code
      });

      const emailResult = await emailService.sendTemplateEmail(emailParams);
      console.log('Debug - Email service response:', emailResult);

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Update task status
      await db.update(tasks)
        .set({ status: 'email_sent' })
        .where(eq(tasks.id, invitation.taskId));

      res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
      console.error("Error sending invitation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Error sending invitation: ${errorMessage}` });
    }
  });

  // Add invitation validation endpoint
  app.get("/api/invitations/:code/validate", async (req, res) => {
    try {
      console.log('[Invite Debug] Starting validation for code:', req.params.code);
      const code = req.params.code.toUpperCase();

      // Find the invitation
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, code),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date())
        ));

      console.log('[Invite Debug] Initial invitation query result:', invitation);

      if (!invitation) {
        return res.status(404).json({
          valid: false,
          message: "Invalid or expired invitation code"
        });
      }

      // Find the associated user
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, invitation.email.toLowerCase()));

      console.log('[Invite Debug] Found user for email:', {
        email: invitation.email,
        userFound: !!user,
        userData: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName
        } : null
      });

      // Get associated task and company info if needed
      const [task] = invitation.taskId ? await db.select().from(tasks).where(eq(tasks.id, invitation.taskId)) : [null];
      const [company] = invitation.companyId ? await db.select().from(companies).where(eq(companies.id, invitation.companyId)) : [null];

      console.log('[Invite Debug] Task and company info:', {
        taskFound: !!task,
        companyFound: !!company,
        taskData: task ? {
          id: task.id,
          status: task.status
        } : null,
        companyData: company ? {
          id: company.id,
          name: company.name
        } : null
      });

      // Construct the response with proper field mapping
      const response = {
        valid: true,
        invitation: {
          code: invitation.code,
          email: invitation.email,
          company: invitation.inviteeCompany || company?.name || null,
          companyId: invitation.companyId,
          firstName: invitation.inviteeName?.split(' ')[0] || null,
          lastName: invitation.inviteeName?.split(' ').slice(1).join(' ') || null,
          fullName: invitation.inviteeName || null
        }
      };

      console.log('[Invite Debug] Final response:', response);

      res.json(response);
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
      const [task] = await db.select().from(tasks).where(eq(tasks.userEmail, (await db.select().from(users).where(eq(users.id, userId))).find()?.email));

      if (task && task.taskType === 'user_onboarding') {
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