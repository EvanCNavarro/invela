import multer from 'multer';
import path from 'path';
import { formatTimestampForFilename } from '../utils';

// Define accepted MIME types and their corresponding extensions
const ACCEPTED_FILE_TYPES = {
  // Document formats
  'text/csv': ['.csv'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/pdf': ['.pdf'],
  'application/rtf': ['.rtf'],
  'text/plain': ['.txt'],
  'application/wordperfect': ['.wpd'],
  'application/x-wpwin': ['.wpf'],
  // Image formats
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg']
};

// Configure storage for document uploads
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/home/runner/workspace/uploads/documents');
  },
  filename: (req, file, cb) => {
    const timestamp = formatTimestampForFilename();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

// Configure storage for company logos (existing)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/home/runner/workspace/uploads/logos');
  },
  filename: (req, file, cb) => {
    const timestamp = formatTimestampForFilename();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

// File type validation function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Check if the MIME type is in our accepted types
  if (ACCEPTED_FILE_TYPES[mime]) {
    // Verify the extension matches the MIME type
    if (ACCEPTED_FILE_TYPES[mime].includes(ext)) {
      return cb(null, true);
    }
  }

  cb(new Error(`Invalid file type. Accepted formats: ${Object.values(ACCEPTED_FILE_TYPES).flat().join(', ')}`));
};

// Create multer instance for document uploads (50MB limit)
export const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter
});

// Create multer instance for logo uploads (existing)
export const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter
});