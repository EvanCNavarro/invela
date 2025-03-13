import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
      // Generate a safe filename with timestamp
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const safeFilename = `${timestamp}-${randomString}.pdf`;
      console.log('[Upload] Generated filename:', safeFilename);
      cb(null, safeFilename);
    } catch (error) {
      console.error('[Upload] Filename generation error:', error);
      cb(error as Error, '');
    }
  }
});

// Create multer instance for PDF uploads
export const fileUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for PDFs
    files: 1 // Allow only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    try {
      console.log('[Upload] Processing file:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // Accept only PDF files
      if (file.mimetype === 'application/pdf') {
        // Check if file has PDF extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
          file.originalname = `${file.originalname}.pdf`;
        }

        // Basic PDF header check (will be enhanced by checking magic numbers)
        if (file.stream) {
          const firstBytes = Buffer.alloc(5);
          file.stream.read(firstBytes, 0, 5);
          if (firstBytes.toString().startsWith('%PDF-')) {
            cb(null, true);
            return;
          }
          cb(new Error('Invalid PDF file format'));
          return;
        }

        cb(null, true);
        return;
      }

      cb(new Error('Only PDF files are allowed'));
    } catch (error) {
      console.error('[Upload] File filter error:', error);
      cb(error as Error);
    }
  }
});