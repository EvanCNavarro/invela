"use strict";
/**
 * @file files-endpoints.ts
 * @description Swagger documentation for file upload and management endpoints.
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the file
 *         file_name:
 *           type: string
 *           description: Original filename
 *         file_path:
 *           type: string
 *           description: Path where the file is stored
 *         file_size:
 *           type: integer
 *           description: Size of the file in bytes
 *         mime_type:
 *           type: string
 *           description: MIME type of the file
 *         status:
 *           type: string
 *           description: Processing status of the file
 *         uploaded_by:
 *           type: integer
 *           description: ID of the user who uploaded the file
 *         company_id:
 *           type: integer
 *           description: ID of the company the file belongs to
 *         task_id:
 *           type: integer
 *           nullable: true
 *           description: ID of the associated task, if any
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the file was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the file was last updated
 *         metadata:
 *           type: object
 *           description: Additional metadata for the file
 */
/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload a new file
 *     description: Uploads a file with metadata and associates it with a user and company
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to upload
 *               task_id:
 *                 type: integer
 *                 description: ID of the task this file is associated with
 *               meta_data:
 *                 type: string
 *                 format: json
 *                 description: JSON string containing metadata about the file
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: No file provided or invalid request format
 *       401:
 *         description: Unauthorized request
 *       413:
 *         description: File size exceeds limit
 *       500:
 *         description: Server error
 *
 *   get:
 *     summary: List all files for the authenticated user's company
 *     description: Retrieves a list of files with pagination
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: task_id
 *         schema:
 *           type: integer
 *         description: Filter files by task ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of files to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 total:
 *                   type: integer
 *                   description: Total number of files matching the criteria
 *       401:
 *         description: Unauthorized request
 *       500:
 *         description: Server error
 *
 * /files/{id}:
 *   get:
 *     summary: Get a specific file by ID
 *     description: Retrieves details about a specific file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the file to retrieve
 *     responses:
 *       200:
 *         description: File details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       401:
 *         description: Unauthorized request
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a file
 *     description: Deletes a file and its metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File deleted successfully
 *       401:
 *         description: Unauthorized request
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 *
 * /files/{id}/download:
 *   get:
 *     summary: Download a file
 *     description: Downloads the actual file content
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the file to download
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized request
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */ 
