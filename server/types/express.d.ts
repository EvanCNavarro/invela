/**
 * Type declarations for Express Request extensions
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      task?: {
        id: number;
        title: string;
        status: string;
        progress: number;
        company_id: number;
        created_by: number;
        metadata?: {
          statusFlow?: string[];
          progressHistory?: Array<{
            timestamp: string;
            value: number;
          }>;
          [key: string]: any;
        };
        [key: string]: any;
      };
      user?: {
        id: number;
        email: string;
        firstName?: string;
        lastName?: string;
        role?: string;
        companyId?: number;
        [key: string]: any;
      };
    }
  }
} 