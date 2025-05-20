"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_adapter_1 = require("../utils/db-adapter");
const drizzle_orm_1 = require("drizzle-orm");
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
// Ensure upload directory exists
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});
// File upload endpoint
router.post('/api/files', upload.single('file'), async (req, res) => {
    try {
        console.log('[Files] Processing file upload request');
        if (!req.file) {
            console.log('[Files] No file received in request');
            return res.status(400).json({
                error: 'No file uploaded',
                detail: 'Request must include a file'
            });
        }
        console.log('[Files] File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filename: req.file.filename
        });
        if (!req.user?.id || !req.user?.company_id) {
            console.log('[Files] Authentication required');
            return res.status(401).json({
                error: 'Authentication required',
                detail: 'User must be logged in to upload files'
            });
        }
        // Create file record in database
        const [fileRecord] = await (0, db_adapter_1.getDb)().insert((0, db_adapter_1.getSchemas)().files)
            .values({
            name: req.file.originalname,
            path: req.file.filename,
            type: req.file.mimetype,
            size: req.file.size,
            user_id: req.user.id,
            company_id: req.user.company_id,
            status: 'uploaded',
            download_count: 0,
            version: 1
        })
            .returning();
        console.log('[Files] Created file record:', {
            id: fileRecord.id,
            name: fileRecord.name,
            size: fileRecord.size
        });
        res.status(201).json(fileRecord);
    }
    catch (error) {
        console.error('[Files] Error processing upload:', error);
        // Clean up uploaded file if database operation fails
        if (req.file) {
            const filePath = path_1.default.join(uploadDir, req.file.filename);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        res.status(500).json({
            error: 'Upload failed',
            detail: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});
// Get all files for a company
router.get('/api/files', async (req, res) => {
    try {
        console.log('[Files] Starting file fetch request');
        console.log('[Files] Authentication state:', {
            isAuthenticated: req.isAuthenticated(),
            hasUser: !!req.user,
            sessionID: req.sessionID
        });
        const companyId = req.query.company_id;
        const userId = req.user?.id;
        console.log('[Files] Request parameters:', {
            companyId,
            userId,
            query: req.query,
            user: req.user,
            headers: req.headers
        });
        if (!companyId) {
            console.log('[Files] Missing company_id parameter');
            return res.status(400).json({
                error: 'Company ID is required',
                detail: 'The company_id query parameter must be provided'
            });
        }
        if (typeof companyId !== 'string' && typeof companyId !== 'number') {
            console.log('[Files] Invalid company_id type:', typeof companyId);
            return res.status(400).json({
                error: 'Invalid company ID format',
                detail: `Expected string or number, got ${typeof companyId}`
            });
        }
        const parsedCompanyId = parseInt(companyId.toString(), 10);
        if (isNaN(parsedCompanyId)) {
            console.log('[Files] Failed to parse company_id:', companyId);
            return res.status(400).json({
                error: 'Invalid company ID format',
                detail: 'Company ID must be a valid number'
            });
        }
        // Verify user has access to this company
        if (req.user?.company_id !== parsedCompanyId) {
            console.log('[Files] Company ID mismatch:', {
                requestedCompanyId: parsedCompanyId,
                userCompanyId: req.user?.company_id
            });
            return res.status(403).json({
                error: 'Access denied',
                detail: 'User does not have access to this company\'s files'
            });
        }
        console.log('[Files] Executing database query for company:', parsedCompanyId);
        const fileRecords = await (0, db_adapter_1.getDb)().query.files.findMany({
            where: (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().files.company_id, parsedCompanyId)
        });
        console.log('[Files] Query results:', {
            recordCount: fileRecords.length,
            firstRecord: fileRecords[0],
            lastRecord: fileRecords[fileRecords.length - 1]
        });
        res.json(fileRecords);
    }
    catch (error) {
        console.error('[Files] Error in file fetch endpoint:', error);
        res.status(500).json({
            error: 'Internal server error',
            detail: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});
// Download endpoint
router.get("/api/files/:id/download", async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        console.log('[Files] Download request for file:', fileId);
        const [fileRecord] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().files)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().files.id, fileId));
        if (!fileRecord) {
            console.log('[Files] File not found:', fileId);
            return res.status(404).json({ error: "File not found" });
        }
        const filePath = path_1.default.join(uploadDir, fileRecord.path);
        console.log('[Files] Physical file path:', filePath);
        if (!fs_1.default.existsSync(filePath)) {
            console.error('[Files] File missing from disk:', filePath);
            return res.status(404).json({ error: "File not found on disk" });
        }
        // Update download count
        await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().files)
            .set({ download_count: (fileRecord.download_count || 0) + 1 })
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().files.id, fileId));
        res.download(filePath, fileRecord.name, (err) => {
            if (err) {
                console.error("[Files] Error downloading file:", {
                    error: err,
                    fileId,
                    filePath
                });
                if (!res.headersSent) {
                    res.status(500).json({ error: "Error downloading file" });
                }
            }
        });
    }
    catch (error) {
        console.error("[Files] Error in download endpoint:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
});
exports.default = router;
