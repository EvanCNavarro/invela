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

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[Upload] Setting destination:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomString}.pdf`;
    console.log('[Upload] Generated filename:', filename);
    cb(null, filename);
  }
});

// Export only fileUpload middleware
export const fileUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Allow only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    console.log('[Upload] Checking file:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});