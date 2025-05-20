"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
// Configure storage for company logos
const logoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/home/runner/workspace/uploads/logos');
    },
    filename: (req, file, cb) => {
        const timestamp = (0, utils_1.formatTimestampForFilename)();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${timestamp}${ext}`);
    }
});
// Create multer instance for logo uploads
exports.logoUpload = (0, multer_1.default)({
    storage: logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Allow SVG files only
        if (file.mimetype === 'image/svg+xml') {
            cb(null, true);
        }
        else {
            cb(new Error('Only SVG files are allowed'));
        }
    }
});
