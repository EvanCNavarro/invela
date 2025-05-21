/**
 * File type definitions
 */

export type FileCategory = 'KYB' | 'KY3P' | 'OPEN_BANKING_SURVEY' | 'SOC2_AUDIT' | 'ISO27001_CERT' | 'PENTEST_REPORT' | 'BUSINESS_CONTINUITY' | 'OTHER';

export type FileStatus = 'active' | 'archived' | 'pending' | 'deleted';

export interface File {
  id: number;
  name: string;
  original_name: string;
  status: FileStatus;
  company_id: number;
  user_id: number;
  content: Buffer;
  mime_type: string;
  category: FileCategory;
  task_id?: number;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
  version?: number;
}