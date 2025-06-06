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

  console.log('[FileFilter Debug] File validation started:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extractedExtension: ext,
    normalizedMimeType: mime,
    timestamp: new Date().toISOString()
  });

  console.log('[FileFilter Debug] Accepted file types config:', {
    availableMimeTypes: Object.keys(ACCEPTED_FILE_TYPES),
    mimeTypeExists: ACCEPTED_FILE_TYPES[mime] !== undefined,
    timestamp: new Date().toISOString()
  });

  // Check if the MIME type is in our accepted types
  if (ACCEPTED_FILE_TYPES[mime]) {
    console.log('[FileFilter Debug] MIME type found, checking extensions:', {
      mime,
      allowedExtensions: ACCEPTED_FILE_TYPES[mime],
      fileExtension: ext,
      extensionMatch: ACCEPTED_FILE_TYPES[mime].includes(ext),
      timestamp: new Date().toISOString()
    });

    // Verify the extension matches the MIME type
    if (ACCEPTED_FILE_TYPES[mime].includes(ext)) {
      console.log('[FileFilter Debug] File validation passed successfully:', {
        originalname: file.originalname,
        mime,
        ext,
        timestamp: new Date().toISOString()
      });
      return cb(null, true);
    } else {
      console.log('[FileFilter Debug] Extension validation failed:', {
        originalname: file.originalname,
        mime,
        expectedExtensions: ACCEPTED_FILE_TYPES[mime],
        actualExtension: ext,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    console.log('[FileFilter Debug] MIME type not found, attempting fallback validation:', {
      originalname: file.originalname,
      requestedMime: mime,
      fileExtension: ext,
      timestamp: new Date().toISOString()
    });

    // Fallback validation: Check if extension matches any accepted extension
    // This handles cases where browsers send generic MIME types like 'application/octet-stream'
    const allAcceptedExtensions = Object.values(ACCEPTED_FILE_TYPES).flat();
    if (allAcceptedExtensions.includes(ext)) {
      // Determine the correct MIME type based on extension
      let correctMimeType = null;
      for (const [mimeType, extensions] of Object.entries(ACCEPTED_FILE_TYPES)) {
        if (extensions.includes(ext)) {
          correctMimeType = mimeType;
          break;
        }
      }

      console.log('[FileFilter Debug] Fallback validation successful:', {
        originalname: file.originalname,
        detectedMime: mime,
        correctedMime: correctMimeType,
        ext,
        fallbackUsed: true,
        timestamp: new Date().toISOString()
      });
      return cb(null, true);
    }

    console.log('[FileFilter Debug] MIME type not found in accepted types:', {
      originalname: file.originalname,
      requestedMime: mime,
      availableMimes: Object.keys(ACCEPTED_FILE_TYPES),
      allAcceptedExtensions,
      timestamp: new Date().toISOString()
    });
  }

  const errorMessage = `Invalid file type. Accepted formats: ${Object.values(ACCEPTED_FILE_TYPES).flat().join(', ')}`;
  console.log('[FileFilter Debug] File validation failed:', {
    originalname: file.originalname,
    mime,
    ext,
    errorMessage,
    timestamp: new Date().toISOString()
  });

  cb(new Error(errorMessage));
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