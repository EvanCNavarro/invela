import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { formatTimestampForFilename } from '../utils';

// Ensure upload directory exists with proper permissions
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o777 });
    console.log('[Upload] Created upload directory:', uploadDir);
  } catch (error) {
    console.error('[Upload] Error creating upload directory:', error);
    throw error;
  }
}

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Check directory permissions
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log('[Upload] Directory is writable:', uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error('[Upload] Directory access error:', error);
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    try {
      const timestamp = formatTimestampForFilename();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeFilename = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
      console.log('[Upload] Generated filename:', safeFilename);
      cb(null, safeFilename);
    } catch (error) {
      console.error('[Upload] Filename generation error:', error);
      cb(error as Error, '');
    }
  }
});

// Create multer instance for file uploads
export const fileUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs and other documents
    files: 1 // Allow only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    try {
      console.log('[Upload] Processing file:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // Define accepted mime types and their corresponding extensions
      const allowedMimes = {
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.oasis.opendocument.text': ['.odt'],
        'text/plain': ['.txt'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'image/svg+xml': ['.svg']
      };

      if (file.mimetype in allowedMimes) {
        // For PDF files, ensure proper content type and extension
        if (file.mimetype === 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
          file.originalname = `${file.originalname}.pdf`;
        }
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: PDF, DOC, DOCX, ODT, TXT, JPG, PNG, GIF, WEBP, SVG`));
      }
    } catch (error) {
      console.error('[Upload] File filter error:', error);
      cb(error as Error);
    }
  }
});