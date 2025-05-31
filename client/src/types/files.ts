/**
 * ========================================
 * File Management Type Definitions
 * ========================================
 * 
 * TypeScript interfaces for file handling and management
 * in the enterprise risk assessment platform. Defines structures
 * for file items, upload tracking, and metadata management.
 * 
 * @module types/files
 * @version 1.0.0
 * @since 2025-05-23
 */

/**
 * File item interface for document management
 */
export interface FileItem {
  id?: number;
  name: string;
  size: number;
  type: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  uploadTime?: number;
  url?: string;
  path?: string;
  metadata?: Record<string, any>;
}