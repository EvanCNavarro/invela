import multer from 'multer';
import path from 'path';
import { formatTimestampForFilename } from '../utils';

// Configure storage for company logos
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

// Create multer instance for logo uploads
export const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Allow SVG files only
    if (file.mimetype === 'image/svg+xml') {
      cb(null, true);
    } else {
      cb(new Error('Only SVG files are allowed'));
    }
  }
});
