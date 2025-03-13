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
    try {
      // Verify directory is writable
      fs.accessSync(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (error) {
      console.error('[Upload] Directory access error:', error);
      cb(new Error('Upload directory is not writable. Please contact support.'), uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = file.mimetype === 'application/pdf' ? '.pdf' : '.txt';
    const filename = `${timestamp}-${randomString}${ext}`;
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
    console.log('[Upload] Processing file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check file presence
    if (!file) {
      console.error('[Upload] No file received');
      cb(new Error('No file was selected for upload'));
      return;
    }

    // Check file size early
    if (file.size > 50 * 1024 * 1024) {
      console.error('[Upload] File too large:', file.size);
      cb(new Error('File size exceeds 50MB limit. Please compress your file or split it into smaller files.'));
      return;
    }

    // Validate file type
    const acceptedTypes = ['application/pdf', 'text/plain'];
    if (!acceptedTypes.includes(file.mimetype)) {
      console.error('[Upload] Invalid file type:', file.mimetype);
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF and TXT files are allowed.`));
      return;
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.txt'].includes(ext)) {
      console.error('[Upload] Invalid file extension:', ext);
      cb(new Error('File must have a .pdf or .txt extension.'));
      return;
    }

    cb(null, true);
  }
});