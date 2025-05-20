"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcrypt"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const email_1 = require("./services/email");
const auth_1 = require("./middleware/auth");
const upload_1 = require("./middleware/upload");
const websocket_1 = require("./services/websocket");
const crypto_1 = __importDefault(require("crypto"));
const company_search_1 = __importDefault(require("./routes/company-search"));
const company_1 = require("./services/company");
const types_1 = require("./types");
const kyb_1 = __importDefault(require("./routes/kyb"));
const files_1 = __importDefault(require("./routes/files"));
const access_1 = __importDefault(require("./routes/access"));
const debug_1 = require("./debug");
const db_adapter_1 = require("./utils/db-adapter");
// Add missing schemas and DB instance for backward compatibility during transition
let db;
let companies;
let users;
let tasks;
let invitations;
let relationships;
let files;
let companyLogos;
// Initialize the database and set up backward compatibility variables
async function initializeDbForRoutes() {
    try {
        const { schemas } = await (0, db_adapter_1.initializeDb)();
        db = (0, db_adapter_1.getDb)();
        companies = schemas.companies;
        users = schemas.users;
        tasks = schemas.tasks;
        invitations = schemas.invitations;
        relationships = schemas.relationships;
        files = schemas.files;
        companyLogos = schemas.companyLogos;
        console.log('[Routes] Database schemas initialized for backward compatibility');
    }
    catch (error) {
        console.error('[Routes] Failed to initialize database for routes:', error);
        throw error;
    }
}
// Call initialization at the start
initializeDbForRoutes().catch(err => {
    console.error('Failed to initialize database for routes:', err);
});
/**
 * Register all API routes for the application
 *
 * This function sets up all endpoints and their handlers, ensuring proper authentication
 * and parameter validation for each route.
 *
 * @param app Express application instance
 * @returns The configured Express application
 */
function registerRoutes(app) {
    app.use(company_search_1.default);
    app.use(kyb_1.default);
    app.use(files_1.default);
    app.use(access_1.default); // Register the new access router
    // Debug API endpoints (development only)
    app.get("/api/debug/auth", auth_1.requireAuth, debug_1.getAuthDebug);
    app.get("/api/debug/db-test", debug_1.testDatabaseConnection);
    /**
     * GET /api/companies
     *
     * Retrieves all companies accessible to the authenticated user. This includes:
     * 1. The user's own company
     * 2. Any companies that have a relationship with the user's company
     *
     * This route demonstrates the use of the database adapter pattern:
     * - Gets schemas from the adapter (type-safe)
     * - Uses executeWithNeonRetry for database operations
     * - Applies ensureValue to handle null/undefined safely
     * - Transforms database results to match frontend expectations
     */
    app.get("/api/companies", auth_1.requireAuth, async (req, res) => {
        try {
            // Authentication validation
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
            // Get database schemas using the adapter
            // This provides type-safe access to table definitions
            const { companies, relationships } = (0, db_adapter_1.getSchemas)();
            // Use executeWithNeonRetry for database operations
            // This handles transient connection issues with Neon serverless
            const networkCompanies = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select({
                    id: companies.id,
                    name: (0, drizzle_orm_1.sql) `COALESCE(${companies.name}, '')`, // Handle NULL values in the database
                    category: (0, drizzle_orm_1.sql) `COALESCE(${companies.category}, '')`,
                    description: (0, drizzle_orm_1.sql) `COALESCE(${companies.description}, '')`,
                    logo_id: companies.logo_id,
                    accreditation_status: (0, drizzle_orm_1.sql) `COALESCE(${companies.accreditation_status}, '')`,
                    risk_score: companies.risk_score,
                    onboarding_company_completed: (0, drizzle_orm_1.sql) `COALESCE(${companies.onboarding_company_completed}, false)`,
                    website_url: (0, drizzle_orm_1.sql) `COALESCE(${companies.website_url}, '')`,
                    legal_structure: (0, drizzle_orm_1.sql) `COALESCE(${companies.legal_structure}, '')`,
                    hq_address: (0, drizzle_orm_1.sql) `COALESCE(${companies.hq_address}, '')`,
                    employee_count: (0, drizzle_orm_1.sql) `COALESCE(${companies.employee_count}, '')`,
                    products_services: (0, drizzle_orm_1.sql) `COALESCE(${companies.products_services}, '{}')::text[]`,
                    incorporation_year: (0, drizzle_orm_1.sql) `COALESCE(${companies.incorporation_year}, '')`,
                    investors_info: (0, drizzle_orm_1.sql) `COALESCE(${companies.investors_info}, '')`,
                    funding_stage: (0, drizzle_orm_1.sql) `COALESCE(${companies.funding_stage}, '')`,
                    key_partners: (0, drizzle_orm_1.sql) `COALESCE(${companies.key_partners}, '{}')::text[]`,
                    leadership_team: (0, drizzle_orm_1.sql) `COALESCE(${companies.leadership_team}, '')`,
                    // Calculate if this company has a relationship with the user's company
                    has_relationship: (0, drizzle_orm_1.sql) `
            CASE 
              WHEN ${companies.id} = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)} THEN true
              WHEN EXISTS (
                SELECT 1 FROM ${relationships} r 
                WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)})
                OR (r.company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)} AND r.related_company_id = ${companies.id})
              ) THEN true
              ELSE false
            END
          `
                })
                    .from(companies)
                    .where((0, drizzle_orm_1.or)(
                // Include the user's own company
                (0, drizzle_orm_1.eq)(companies.id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)), 
                // Include companies with relationships
                (0, drizzle_orm_1.sql) `EXISTS (
                SELECT 1 FROM ${relationships} r 
                WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)})
                OR (r.company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)} AND r.related_company_id = ${companies.id})
              )`))
                    .orderBy(companies.name);
            });
            console.log('[Companies] Query successful, found companies:', {
                count: networkCompanies.length,
                companies: networkCompanies.map((c) => ({
                    id: c.id,
                    name: c.name,
                    hasLogo: !!c.logo_id,
                    hasRelationship: c.has_relationship
                }))
            });
            // Transform the data to match frontend expectations
            // This ensures consistent API responses even if database schema changes
            const transformedCompanies = networkCompanies.map((company) => ({
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
                riskScore: company.risk_score // Added riskScore
            }));
            res.json(transformedCompanies);
        }
        catch (error) {
            // Comprehensive error logging helps with debugging
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
            // Generic error response
            res.status(500).json({
                message: "Error fetching companies",
                code: "INTERNAL_ERROR"
            });
        }
    });
    app.get("/api/companies/current", auth_1.requireAuth, async (req, res) => {
        try {
            console.log('[Current Company] Fetching company for user:', {
                userId: req.user.id,
                companyId: req.user.company_id
            });
            // Use the database adapter pattern
            const { companies } = (0, db_adapter_1.getSchemas)();
            const companyResult = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(companies)
                    .where((0, drizzle_orm_1.eq)(companies.id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)));
            });
            const company = companyResult[0];
            if (!company) {
                console.error('[Current Company] Company not found:', req.user.company_id);
                return res.status(404).json({ message: "Company not found" });
            }
            console.log('[Current Company] Found company:', {
                id: company.id,
                name: company.name,
                onboardingCompleted: company.onboarding_company_completed
            });
            // Add a default risk score if it doesn't exist
            if (company.risk_score === undefined || company.risk_score === null) {
                company.risk_score = 0; // Default risk score
            }
            // Transform the response to match client-side property names
            const responseData = {
                ...company,
                riskScore: company.risk_score // Map risk_score to riskScore for client compatibility
            };
            res.json(responseData);
        }
        catch (error) {
            console.error("[Current Company] Error fetching company:", error);
            res.status(500).json({ message: "Error fetching company details" });
        }
    });
    // Get company by ID
    app.get("/api/companies/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const companyId = parseInt(req.params.id);
            if (isNaN(companyId)) {
                return res.status(400).json({
                    message: "Invalid company ID",
                    code: "INVALID_ID"
                });
            }
            // Get database schemas using the adapter
            const { companies, relationships } = (0, db_adapter_1.getSchemas)();
            // Get company details along with relationship check
            const companyResult = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(companies)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(companies.id, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(companies.id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)), (0, drizzle_orm_1.sql) `EXISTS (
                  SELECT 1 FROM ${relationships} r 
                  WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)})
                  OR (r.company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)} AND r.related_company_id = ${companies.id})
                )`)));
            });
            const company = companyResult[0];
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
                riskScore: company.risk_score // Added riskScore
            };
            res.json(transformedCompany);
        }
        catch (error) {
            console.error("[Companies] Error fetching company:", error);
            res.status(500).json({
                message: "Error fetching company details",
                code: "INTERNAL_ERROR"
            });
        }
    });
    // Tasks endpoints
    app.get("/api/tasks", auth_1.requireAuth, async (req, res) => {
        try {
            console.log('[Tasks] ====== Starting task fetch =====');
            console.log('[Tasks] User details:', {
                id: req.user.id,
                company_id: req.user.company_id,
                email: req.user.email
            });
            // Get database schemas
            const { tasks } = (0, db_adapter_1.getSchemas)();
            // First, let's check if there are any company-wide KYB tasks
            const kybTasks = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(tasks)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)), (0, drizzle_orm_1.eq)(tasks.task_type, 'company_kyb'), (0, drizzle_orm_1.eq)(tasks.task_scope, 'company')));
            });
            console.log('[Tasks] KYB tasks found:', {
                count: kybTasks.length,
                tasks: kybTasks.map((t) => ({
                    id: t.id,
                    company_id: t.company_id,
                    task_scope: t.task_scope,
                    status: t.status
                }))
            });
            // Get all tasks that are either:
            // 1. Assigned to the user
            // 2. Created by the user
            // 3. Company tasks (company_id matches user's company and no specific assignee)
            // 4. KYB tasks for the user's company
            // 5. User onboarding tasks for the user's email
            const query = (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(tasks.assigned_to, (0, db_adapter_1.ensureValue)(req.user?.id, 0)), (0, drizzle_orm_1.eq)(tasks.created_by, (0, db_adapter_1.ensureValue)(req.user?.id, 0)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)), (0, drizzle_orm_1.isNull)(tasks.assigned_to), (0, drizzle_orm_1.eq)(tasks.task_scope, 'company')), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.task_type, 'user_onboarding'), (0, drizzle_orm_1.sql) `LOWER(${tasks.user_email}) = LOWER(${req.user.email})`));
            console.log('[Tasks] Query conditions:', {
                conditions: {
                    condition1: `tasks.assigned_to = ${(0, db_adapter_1.ensureValue)(req.user?.id, 0)}`,
                    condition2: `tasks.created_by = ${(0, db_adapter_1.ensureValue)(req.user?.id, 0)}`,
                    condition3: `tasks.company_id = ${(0, db_adapter_1.ensureValue)(req.user?.company_id, 0)} AND tasks.assigned_to IS NULL AND tasks.task_scope = 'company'`,
                    condition4: `tasks.task_type = 'user_onboarding' AND LOWER(tasks.user_email) = LOWER('${req.user.email}')`
                }
            });
            const userTasks = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(tasks)
                    .where(query)
                    .orderBy((0, drizzle_orm_1.sql) `created_at DESC`);
            });
            console.log('[Tasks] Tasks found:', {
                count: userTasks.length,
                tasks: userTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    assigned_to: task.assigned_to,
                    company_id: task.company_id,
                    task_scope: task.task_scope,
                    status: task.status
                }))
            });
            // Transformed tasks with additional fields
            const transformedTasks = userTasks.map((task) => {
                const progress = task.status ? types_1.taskStatusToProgress[task.status] : 0;
                return {
                    ...task,
                    // Add computed fields
                    progress,
                    isComplete: task.status === 'completed',
                    dueDate: task.due_date ? new Date(task.due_date).toISOString() : null
                };
            });
            res.json(transformedTasks);
        }
        catch (error) {
            console.error("[Tasks] Error fetching tasks:", error);
            res.status(500).json({ message: "Error fetching tasks" });
        }
    });
    // Get a single task
    app.get("/api/tasks/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const taskId = parseInt(req.params.id);
            if (isNaN(taskId)) {
                return res.status(400).json({ message: "Invalid task ID" });
            }
            // Get schemas
            const { tasks } = (0, db_adapter_1.getSchemas)();
            // Fetch the task
            const taskResult = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(tasks)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.id, taskId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(tasks.assigned_to, (0, db_adapter_1.ensureValue)(req.user?.id, 0)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)), (0, drizzle_orm_1.isNull)(tasks.assigned_to)), (0, drizzle_orm_1.eq)(tasks.created_by, (0, db_adapter_1.ensureValue)(req.user?.id, 0)))));
            });
            const task = taskResult[0];
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }
            // Transform task data
            const transformedTask = {
                ...task,
                progress: task.status ? types_1.taskStatusToProgress[task.status] : 0,
                isComplete: task.status === 'completed',
                dueDate: task.due_date ? new Date(task.due_date).toISOString() : null
            };
            res.json(transformedTask);
        }
        catch (error) {
            console.error("[Tasks] Error fetching task:", error);
            res.status(500).json({ message: "Error fetching task" });
        }
    });
    // Relationships endpoints
    app.get("/api/relationships", auth_1.requireAuth, async (req, res) => {
        try {
            console.log('[Relationships] Fetching relationships for company:', req.user.company_id);
            // Get schemas
            const { relationships, companies } = (0, db_adapter_1.getSchemas)();
            // Fetch relationships and related company info
            const networkRelationships = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select({
                    id: relationships.id,
                    company_id: relationships.company_id,
                    related_company_id: relationships.related_company_id,
                    status: relationships.status,
                    type: relationships.type,
                    created_at: relationships.created_at,
                    // Add relatedCompany object with company details
                    relatedCompany: {
                        id: companies.id,
                        name: companies.name,
                        category: companies.category,
                        logo_id: companies.logo_id
                    }
                })
                    .from(relationships)
                    .leftJoin(companies, (0, drizzle_orm_1.eq)(relationships.related_company_id, companies.id))
                    .where((0, drizzle_orm_1.eq)(relationships.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)));
            });
            console.log('[Relationships] Found network members:', {
                count: networkRelationships.length,
                relationships: networkRelationships.map((r) => ({
                    id: r.id,
                    companyName: r.relatedCompany?.name,
                    status: r.status,
                    type: r.type
                }))
            });
            // Transform relationships for frontend
            const transformedRelationships = networkRelationships.map((rel) => ({
                id: rel.id,
                companyId: rel.related_company_id,
                companyName: rel.relatedCompany?.name || 'Unknown Company',
                category: rel.relatedCompany?.category || 'Other',
                status: rel.status,
                type: rel.type,
                establishedDate: rel.created_at ? new Date(rel.created_at).toISOString() : null,
                hasLogo: !!rel.relatedCompany?.logo_id
            }));
            res.json(transformedRelationships);
        }
        catch (error) {
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(invitations.code, invitationCode.toUpperCase()), (0, drizzle_orm_1.eq)(invitations.status, 'pending'), (0, drizzle_orm_1.sql) `LOWER(${invitations.email}) = LOWER(${email})`, (0, drizzle_orm_1.gt)(invitations.expires_at, new Date())));
            if (!invitation) {
                console.log('[Account Setup] Invalid invitation:', invitationCode);
                return res.status(400).json({
                    message: "Invalid invitation code or email mismatch"
                });
            }
            // Find existing user with case-insensitive email match
            const [existingUser] = await db.select()
                .from(users)
                .where((0, drizzle_orm_1.sql) `LOWER(${users.email}) = LOWER(${email})`);
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
                onboarding_user_completed: false, // Changed to false so new user modal appears
            })
                .where((0, drizzle_orm_1.eq)(users.id, existingUser.id))
                .returning();
            console.log('[Account Setup] Updated user:', updatedUser.id);
            // Update the related task
            const [task] = await db.select()
                .from(tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.user_email, email.toLowerCase()), (0, drizzle_orm_1.eq)(tasks.status, types_1.TaskStatus.EMAIL_SENT)));
            if (task) {
                const [updatedTask] = await db.update(tasks)
                    .set({
                    status: types_1.TaskStatus.COMPLETED,
                    progress: types_1.taskStatusToProgress[types_1.TaskStatus.COMPLETED],
                    assigned_to: updatedUser.id,
                    metadata: {
                        ...task.metadata,
                        registeredAt: new Date().toISOString(),
                        statusFlow: [...(task.metadata?.statusFlow || []), types_1.TaskStatus.COMPLETED]
                    }
                })
                    .where((0, drizzle_orm_1.eq)(tasks.id, task.id))
                    .returning();
                // Ensure metadata is not null before broadcasting
                (0, websocket_1.broadcastTaskUpdate)({
                    ...updatedTask,
                    metadata: updatedTask.metadata || {}
                });
            }
            // Update invitation status
            await db.update(invitations)
                .set({
                status: 'used',
                used_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(invitations.id, invitation.id));
            // Log the user in
            req.login(updatedUser, (err) => {
                if (err) {
                    console.error("[Account Setup] Login error:", err);
                    return res.status(500).json({ message: "Error logging in" });
                }
                res.json(updatedUser);
            });
        }
        catch (error) {
            console.error("[Account Setup] Account setup error:", error);
            res.status(500).json({ message: "Error updating user information" });
        }
    });
    // File upload endpoint
    app.post("/api/files/upload", auth_1.requireAuth, upload_1.logoUpload.single('logo'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }
            const storedPath = req.file.filename;
            // Check if file already exists
            const existingFile = await db.select()
                .from(files)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(files.name, req.file.originalname), (0, drizzle_orm_1.eq)(files.user_id, req.user.id)));
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
                        .where((0, drizzle_orm_1.eq)(files.id, existingFile[0].id))
                        .returning();
                    console.log('Debug - Updated existing file record:', updatedFile);
                    return res.status(200).json(updatedFile);
                }
                catch (error) {
                    console.error('Error updating existing file:', error);
                    // Clean up uploaded file on error
                    const newFilePath = path_1.default.resolve('/home/runner/workspace/uploads', req.file.filename);
                    if (fs_1.default.existsSync(newFilePath)) {
                        fs_1.default.unlinkSync(newFilePath);
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
                user_id: req.user.id,
                company_id: req.user.company_id,
                download_count: 0,
                version: 1.0,
            };
            const [file] = await db.insert(files)
                .values(fileData)
                .returning();
            console.log('Debug - Created new file record:', file);
            res.status(201).json(file);
        }
        catch (error) {
            console.error("File upload error:", error);
            res.status(500).json({ message: "Error uploading file" });
            // Clean up uploaded file on error
            if (req.file) {
                const filePath = path_1.default.resolve('/home/runner/workspace/uploads', req.file.filename);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
            }
        }
    });
    app.delete("/api/files/:id", auth_1.requireAuth, async (req, res) => {
        try {
            const [file] = await db.select()
                .from(files)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(files.id, parseInt(req.params.id)), (0, drizzle_orm_1.eq)(files.user_id, req.user.id)));
            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            // Remove the file from storage
            const filePath = path_1.default.resolve('/home/runner/workspace/uploads', file.path);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            // Update file status to deleted
            await db.update(files)
                .set({ status: 'deleted' })
                .where((0, drizzle_orm_1.eq)(files.id, file.id));
            res.sendStatus(200);
        }
        catch (error) {
            console.error("Error deleting file:", error);
            res.status(500).json({ message: "Error deleting file" });
        }
    });
    // Add file restore endpoint
    app.post("/api/files/:id/restore", auth_1.requireAuth, async (req, res) => {
        try {
            // Find the file
            const [file] = await db.select()
                .from(files)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(files.id, parseInt(req.params.id)), (0, drizzle_orm_1.eq)(files.user_id, req.user.id)));
            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            if (file.status !== 'deleted') {
                return res.status(400).json({ message: "File is not in deleted state" });
            }
            // Update file status to restored
            const [updatedFile] = await db.update(files)
                .set({ status: 'restored' })
                .where((0, drizzle_orm_1.eq)(files.id, file.id))
                .returning();
            res.json(updatedFile);
        }
        catch (error) {
            console.error("Error restoring file:", error);
            res.status(500).json({ message: "Error restoring file" });
        }
    });
    // Update company logo upload endpoint
    app.post("/api/companies/:id/logo", auth_1.requireAuth, upload_1.logoUpload.single('logo'), async (req, res) => {
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
                .where((0, drizzle_orm_1.eq)(companies.id, companyId));
            if (!company) {
                console.log('Debug - Company not found:', companyId);
                return res.status(404).json({ message: "Company not found" });
            }
            // If company already has a logo, delete the old file
            if (company.logo_id) {
                const [oldLogo] = await db.select()
                    .from(companyLogos)
                    .where((0, drizzle_orm_1.eq)(companyLogos.id, company.logo_id));
                if (oldLogo) {
                    const oldFilePath = path_1.default.resolve('/home/runner/workspace/uploads/logos', oldLogo.file_path);
                    console.log('Debug - Attempting to delete old logo:', oldFilePath);
                    if (fs_1.default.existsSync(oldFilePath)) {
                        fs_1.default.unlinkSync(oldFilePath);
                        console.log('Debug - Successfully deleted old logo');
                    }
                    else {
                        console.log('Debug - Old logo file not found on disk');
                    }
                }
            }
            // Create logo record
            const logoResult = await db.insert(companyLogos)
                .values({
                company_id: companyId,
                file_name: req.file.originalname,
                file_path: req.file.filename,
                file_type: req.file.mimetype,
            })
                .returning();
            const logo = Array.isArray(logoResult) ? logoResult[0] : logoResult;
            console.log('Debug - Created new logo record:', logo);
            // Update company with logo reference
            await db.update(companies)
                .set({ logo_id: logo.id })
                .where((0, drizzle_orm_1.eq)(companies.id, companyId));
            // Verify file exists in the correct location
            const uploadedFilePath = path_1.default.resolve('/home/runner/workspace/uploads/logos', req.file.filename);
            console.log('Debug - Verifying uploaded file exists:', uploadedFilePath);
            if (!fs_1.default.existsSync(uploadedFilePath)) {
                console.error('Debug - Logo file not found after upload!');
                throw new Error('Logo file not found after upload');
            }
            res.json(logo);
        }
        catch (error) {
            console.error("Error uploading company logo:", error);
            res.status(500).json({ message: "Error uploading company logo" });
        }
    });
    // Update the company logo endpoint to properly handle logo_id correctly
    app.get("/api/companies/:id/logo", auth_1.requireAuth, async (req, res) => {
        try {
            console.log(`[Company Logo] Fetching logo for company ID: ${req.params.id}`);
            const [company] = await db.select()
                .from(companies)
                .where((0, drizzle_orm_1.eq)(companies.id, parseInt(req.params.id)));
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
                .where((0, drizzle_orm_1.eq)(companyLogos.id, company.logo_id));
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
            const filePath = path_1.default.resolve('/home/runner/workspace/uploads/logos', logo.file_path);
            console.log(`[Company Logo] Attempting to serve logo from: ${filePath}`);
            if (!fs_1.default.existsSync(filePath)) {
                console.error(`Logo file missing for company ${company.name} (${company.id}): ${filePath}`);
                return res.status(404).json({
                    message: "Logo file not found on disk",
                    code: "LOGO_FILE_MISSING"
                });
            }
            try {
                // Validate SVG content
                const content = fs_1.default.readFileSync(filePath, 'utf8');
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
                const fileStream = fs_1.default.createReadStream(filePath);
                fileStream.pipe(res);
                console.log(`[Company Logo] Successfully served logo for company ${company.name} (${company.id})`);
            }
            catch (readError) {
                console.error(`[Company Logo] Error reading SVG file for company ${company.name}:`, readError);
                return res.status(500).json({
                    message: "Error reading logo file",
                    code: "LOGO_READ_ERROR"
                });
            }
        }
        catch (error) {
            console.error(`[Company Logo] Error serving company logo for ID ${req.params.id}:`, error);
            res.status(500).json({
                message: "Error serving company logo",
                code: "LOGO_SERVER_ERROR"
            });
        }
    });
    // Add this endpoint before the fintech invite endpoint
    app.post("/api/fintech/check-company", auth_1.requireAuth, async (req, res) => {
        try {
            const { company_name } = req.body;
            if (!company_name) {
                return res.status(400).json({
                    message: "Company name is required"
                });
            }
            // Check for existing company with same name
            const [existingCompany] = await db.select()
                .from(companies)
                .where((0, drizzle_orm_1.sql) `LOWER(${companies.name}) = LOWER(${company_name})`);
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
        }
        catch (error) {
            console.error("Error checking company existence:", error);
            res.status(500).json({
                message: "Error checking company existence"
            });
        }
    });
    // Fix fintech invite logging
    app.post("/api/fintech/invite", auth_1.requireAuth, async (req, res) => {
        console.log('[FinTech Invite] Starting invitation process');
        console.log('[FinTech Invite] Request body:', req.body);
        try {
            const { email, company_name, full_name, sender_name } = req.body;
            // Input validation before starting transaction
            const invalidFields = [];
            if (!email)
                invalidFields.push('email');
            if (!company_name)
                invalidFields.push('company name');
            if (!full_name)
                invalidFields.push('full name');
            if (!sender_name)
                invalidFields.push('sender name');
            if (invalidFields.length > 0) {
                const errorMessage = invalidFields.length === 1
                    ? `${invalidFields[0]}`
                    : `${invalidFields.slice(0, -1).join(', ')}${invalidFields.length > 2 ? ',' : ''} and ${invalidFields.slice(-1)[0]} are required`;
                console.log('[FinTechInvite] Validation failed:', {
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
                        .where((0, drizzle_orm_1.eq)(companies.id, req.user.company_id));
                    if (!userCompany) {
                        console.error('[FinTech Invite] Sender company not found:', req.user.company_id);
                        throw new Error("Your company information not found");
                    }
                    console.log('[FinTech Invite] Found sender company:', userCompany.name);
                    // Step 2: Check for existing company with same name
                    console.log('[FinTech Invite] Checking for existing company:', company_name);
                    const [existingCompany] = await tx.select()
                        .from(companies)
                        .where((0, drizzle_orm_1.sql) `LOWER(${companies.name}) = LOWER(${company_name})`);
                    if (existingCompany) {
                        console.error('[FinTech Invite] Company already exists:', existingCompany.name);
                        const response = {
                            message: "A company with this name already exists",
                            company: {
                                id: existingCompany.id,
                                name: existingCompany.name,
                                category: existingCompany.category
                            }
                        };
                        return response;
                    }
                    // Step 3: Create new company record with proper status
                    console.log('[FinTech Invite] Creating new company:', company_name);
                    const companyData = {
                        name: company_name.trim(),
                        description: `FinTech partner company ${company_name}`,
                        category: 'FinTech',
                        status: 'active',
                        accreditation_status: 'PENDING',
                        onboarding_company_completed: false,
                        metadata: {
                            invited_by: req.user.id,
                            invited_at: new Date().toISOString(),
                            invited_from: userCompany.name,
                            created_via: 'fintech_invite'
                        }
                    };
                    console.log('[FinTech Invite] Attempting to insert company with data:', JSON.stringify(companyData, null, 2));
                    const newCompany = await (0, company_1.createCompany)(companyData);
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
                        created_at: newCompany.created_at,
                        metadata: newCompany.metadata
                    });
                    // Step 4: Create user record with temporary password
                    console.log('[FinTech Invite] Creating user account');
                    const tempPassword = crypto_1.default.randomBytes(32).toString('hex');
                    const hashedPassword = await bcrypt.hash(tempPassword, 10);
                    const [newUser] = await tx.insert(users)
                        .values({
                        email: email.toLowerCase(),
                        password: hashedPassword,
                        company_id: newCompany.id,
                        full_name: full_name,
                        onboarding_user_completed: false, // Ensure this is false for new users
                        metadata: {
                            invited_by: req.user.id,
                            invited_at: new Date().toISOString(),
                            invited_from: userCompany.name,
                            created_via: 'fintech_invite'
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
                        company_id: newCompany.id,
                        invitee_name: full_name,
                        invitee_company: company_name,
                        expires_at: expirationDate,
                        metadata: {
                            user_id: newUser.id,
                            sender_name: sender_name,
                            sender_company_id: userCompany.id,
                            sender_company_name: userCompany.name,
                            created_at: new Date().toISOString()
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
                    const taskValues = {
                        title: `New User Invitation: ${email}`,
                        description: `Invitation sent to ${full_name} to join ${company_name} on the platform.`,
                        task_type: 'user_onboarding',
                        task_scope: 'user',
                        status: types_1.TaskStatus.PENDING, // Type casting to resolve enum issue
                        priority: 'medium',
                        progress: types_1.taskStatusToProgress[types_1.TaskStatus.PENDING],
                        created_by: req.user.id,
                        user_email: email.toLowerCase(),
                        company_id: newCompany.id,
                        due_date: expirationDate,
                        metadata: {
                            user_id: newUser.id,
                            invitee_name: full_name,
                            invitee_company: company_name,
                            sender_name: sender_name,
                            company_created_at: newCompany.created_at,
                            invitation_id: invitation.id,
                            invitation_code: code,
                            status_flow: [types_1.TaskStatus.PENDING]
                        }
                    };
                    const taskResult = await tx.insert(tasks)
                        .values(taskValues)
                        .returning();
                    const task = Array.isArray(taskResult) ? taskResult[0] : taskResult;
                    if (!task) {
                        console.error('[FinTech Invite] Failed to create task');
                        throw new Error("Failed to create task record");
                    }
                    // Broadcast the task update
                    (0, websocket_1.broadcastTaskUpdate)({
                        id: task.id,
                        status: task.status,
                        progress: task.progress,
                        metadata: task.metadata || {}
                    });
                    console.log('[FinTech Invite] Successfully created task:', {
                        id: task.id,
                        status: task.status
                    });
                    // Send invitation email
                    console.log('[FinTech Invite] Sending invitation email');
                    const inviteUrl = `${req.protocol}://${req.get('host')}/register?code=${code}&email=${encodeURIComponent(email)}`;
                    try {
                        const emailResult = await email_1.emailService.sendTemplateEmail({
                            to: email,
                            from: process.env.GMAIL_USER,
                            template: 'fintech_invite',
                            templateData: {
                                recipientName: full_name,
                                recipientEmail: email.toLowerCase(),
                                senderName: sender_name,
                                senderCompany: userCompany.name,
                                targetCompany: company_name,
                                inviteUrl,
                                code,
                                inviteType: 'fintech'
                            }
                        });
                        if (!emailResult.success) {
                            console.error('[FinTech Invite] Email sending failed:', emailResult.error);
                            throw new Error(`Failed to send invitation email: ${emailResult.error}`);
                        }
                        // Update task status after successful email
                        const [updatedTask] = await tx.update(tasks)
                            .set({
                            status: types_1.TaskStatus.EMAIL_SENT,
                            progress: types_1.taskStatusToProgress[types_1.TaskStatus.EMAIL_SENT],
                            metadata: {
                                ...task.metadata,
                                email_sent_at: new Date().toISOString(),
                                status_flow: [...(task.metadata?.status_flow || []), types_1.TaskStatus.EMAIL_SENT]
                            }
                        })
                            .where((0, drizzle_orm_1.eq)(tasks.id, task.id))
                            .returning();
                        if (!updatedTask) {
                            console.error('[FinTech Invite] Failed to update task status');
                            throw new Error("Failed to update task status");
                        }
                        console.log('[FinTech Invite] Successfully completed invitation process');
                        return { invitation, task: updatedTask, company: newCompany, user: newUser };
                    }
                    catch (emailError) {
                        console.error("[FinTech Invite] Email sending failed:", emailError);
                        throw new Error("Failed to send invitation email. Please try again.");
                    }
                }
                catch (error) {
                    console.error('[FinTech Invite] Transaction error:', error);
                    throw error; // Re-throw to trigger rollback
                }
            });
            console.log('[FinTech Invite] Invitation completed successfully');
            res.json({
                message: "Invitation sent successfully",
                invitation: result && 'invitation' in result ? result.invitation : undefined,
                company: result && 'company' in result ? result.company : undefined,
                user: result && 'user' in result ? result.user : undefined
            });
        }
        catch (error) {
            console.error("[FinTech Invite] Error processing invitation:", error);
            res.status(500).json({
                message: error.message || "Failed to send invitation. Please try again."
            });
        }
    });
    // Add endpoint for companies to add other companies to their network
    app.post("/api/companies/:id/network", auth_1.requireAuth, async (req, res) => {
        try {
            const targetCompanyId = parseInt(req.params.id);
            // Verify the target company exists
            const [targetCompany] = await db.select()
                .from(companies)
                .where((0, drizzle_orm_1.eq)(companies.id, targetCompanyId));
            if (!targetCompany) {
                return res.status(404).json({ message: "Target company not found" });
            }
            // Check if relationship already exists
            const [existingRelationship] = await db.select()
                .from(relationships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(relationships.company_id, req.user.company_id), (0, drizzle_orm_1.eq)(relationships.related_company_id, targetCompanyId)));
            if (existingRelationship) {
                return res.status(400).json({ message: "Company is already in your network" });
            }
            // Create the relationship
            const [relationship] = await db.insert(relationships)
                .values({
                company_id: req.user.company_id,
                related_company_id: targetCompanyId,
                relationship_type: 'network_member',
                status: 'active',
                metadata: {
                    added_at: new Date().toISOString(),
                    added_by: req.user.id
                }
            })
                .returning();
            res.status(201).json(relationship);
        }
        catch (error) {
            console.error("Error adding company to network:", error);
            res.status(500).json({ message: "Error adding company to network" });
        }
    });
    // Update the user invite endpoint after the existing registration endpoint
    app.post("/api/users/invite", auth_1.requireAuth, async (req, res) => {
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
                        password: await bcrypt.hash(crypto_1.default.randomBytes(32).toString('hex'), 10),
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
                        status: types_1.TaskStatus.EMAIL_SENT,
                        progress: types_1.taskStatusToProgress[types_1.TaskStatus.EMAIL_SENT],
                        priority: 'high',
                        company_id: inviteData.company_id,
                        user_email: inviteData.email,
                        created_by: req.user.id, // Ensure created_by is set
                        metadata: {
                            invitation_id: invitation.id,
                            invited_by: req.user.id,
                            invited_at: new Date().toISOString(),
                            status_flow: [types_1.TaskStatus.EMAIL_SENT]
                        }
                    })
                        .returning();
                    // Update invitation with task reference
                    await tx.update(invitations)
                        .set({ task_id: task.id })
                        .where((0, drizzle_orm_1.eq)(invitations.id, invitation.id));
                    // Send invitation email
                    await email_1.emailService.sendTemplateEmail({
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
                            inviteUrl: `${process.env.APP_URL}/auth?code=`,
                            inviteType: 'user'
                        }
                    });
                    return { invitation, task, user };
                }
                catch (error) {
                    console.error('[Invite] Error processing invitation:', error);
                    throw error;
                }
            });
            res.status(201).json({
                message: 'Invitation sent successfully',
                invitation: result.invitation,
                task: result.task
            });
        }
        catch (error) {
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(invitations.code, req.params.code.toUpperCase()), (0, drizzle_orm_1.eq)(invitations.status, 'pending'), (0, drizzle_orm_1.sql) `${invitations.expires_at} > NOW()`));
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
        }
        catch (error) {
            console.error('[Invite Debug] Validation error:', error);
            res.status(500).json({
                valid: false,
                message: "Error validating invitation code"
            });
        }
    });
    // Add this endpoint to handle user onboarding completion
    app.post("/api/users/complete-onboarding", auth_1.requireAuth, async (req, res) => {
        try {
            console.log('[Complete Onboarding] Processing request for user:', req.user.id);
            // Update user's onboarding status
            const [updatedUser] = await db.update(users)
                .set({
                onboarding_user_completed: true,
                updated_at: new Date()
            })
                .where((0, drizzle_orm_1.eq)(users.id, req.user.id))
                .returning();
            if (!updatedUser) {
                console.error('[Complete Onboarding] Failed to update user:', req.user.id);
                return res.status(500).json({ message: "Failed to update user" });
            }
            // Try to update the onboarding task status
            const updatedTask = await updateOnboardingTaskStatus(req.user.id);
            console.log('[Complete Onboarding] Successfully completed onboarding for user:', {
                userId: updatedUser.id,
                taskId: updatedTask?.id
            });
            res.json({
                message: "Onboarding completed successfully",
                user: updatedUser,
                task: updatedTask
            });
        }
        catch (error) {
            console.error("[Complete Onboarding] Error:", error);
            res.status(500).json({
                message: "Error completing onboarding",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
    // Utility functions
    function generateInviteCode() {
        return crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
    }
    function formatTimestampForFilename() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
    function toTitleCase(str) {
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    async function updateOnboardingTaskStatus(userId) {
        try {
            // Get the user's email first
            const [user] = await db.select().from(users).where((0, drizzle_orm_1.eq)(users.id, userId));
            if (!user || !user.email) {
                console.error('[updateOnboardingTaskStatus] User not found or missing email:', userId);
                return null;
            }
            // Find the task for this user
            const [task] = await db.select().from(tasks).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tasks.user_email, user.email), (0, drizzle_orm_1.eq)(tasks.task_type, 'user_onboarding')));
            if (task) {
                // Update task with new status and include metadata update
                const [updatedTask] = await db.update(tasks)
                    .set({
                    status: 'completed', // Use string literal for status
                    progress: 100,
                    metadata: {
                        ...task.metadata || {},
                        completedAt: new Date().toISOString(),
                        status_flow: [...(task.metadata?.status_flow || []), types_1.TaskStatus.COMPLETED]
                    }
                })
                    .where((0, drizzle_orm_1.eq)(tasks.id, task.id))
                    .returning();
                // Broadcast the task update
                (0, websocket_1.broadcastTaskUpdate)({
                    id: updatedTask.id,
                    status: updatedTask.status, // Type cast to resolve enum issue
                    progress: updatedTask.progress,
                    metadata: updatedTask.metadata || {}
                });
                // Return only the required fields with the correct type
                return {
                    id: updatedTask.id,
                    status: updatedTask.status // Cast to TaskStatus for return type
                };
            }
            return null;
        }
        catch (error) {
            console.error('[updateOnboardingTaskStatus] Error updating task status:', error);
            return null;
        }
    }
    // Get all invitations for the company
    app.get("/api/invitations", auth_1.requireAuth, async (req, res) => {
        try {
            console.log('[Invitations] Fetching invitations for company:', req.user.company_id);
            // Get schemas
            const { invitations } = (0, db_adapter_1.getSchemas)();
            // Use adapter pattern to fetch invitations
            const invitationsList = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(invitations)
                    .where((0, drizzle_orm_1.eq)(invitations.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)))
                    .orderBy((0, drizzle_orm_1.sql) `created_at DESC`);
            });
            console.log('[Invitations] Found invitations:', {
                count: invitationsList.length
            });
            // Get the user list for linking
            const { users } = (0, db_adapter_1.getSchemas)();
            const usersList = await (0, db_adapter_1.executeWithNeonRetry)(async (db) => {
                return db.select()
                    .from(users)
                    .where((0, drizzle_orm_1.eq)(users.company_id, (0, db_adapter_1.ensureValue)(req.user?.company_id, 0)));
            });
            // Create a map for easier lookup
            const usersMap = new Map();
            usersList.forEach((user) => {
                if (user && user.email) {
                    usersMap.set(user.email.toLowerCase(), {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        active: user.active
                    });
                }
            });
            // Transform invitations for response
            const transformedInvitations = invitationsList.map((invitation) => {
                const userRecord = usersMap.get(invitation.email.toLowerCase());
                // Safely create user object with proper defaults
                const userObject = userRecord ? {
                    id: userRecord.id || 0,
                    name: userRecord.name || '',
                    email: userRecord.email || '',
                    role: userRecord.role || '',
                    active: userRecord.active !== undefined ? userRecord.active : false
                } : null;
                return {
                    ...invitation,
                    isRegistered: !!userRecord,
                    user: userObject
                };
            });
            res.json(transformedInvitations);
        }
        catch (error) {
            console.error("[Invitations] Error fetching invitations:", error);
            res.status(500).json({ message: "Error fetching invitations" });
        }
    });
    console.log('[Routes] Routes setup completed');
    return app;
}
// Export both the named and default function for backward compatibility
exports.default = registerRoutes;
