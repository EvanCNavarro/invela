/**
 * @file api-version.ts
 * @description Middleware for handling API versioning
 */

import { Request, Response, NextFunction } from 'express';
import { API_VERSION } from '@shared/index';

export interface ApiVersionOptions {
  defaultVersion: string;
  supportedVersions: string[];
}

/**
 * API version extraction types
 */
enum VersionExtractionType {
  HEADER = 'header',
  PATH = 'path',
  QUERY = 'query'
}

/**
 * Default options for version middleware
 */
const defaultOptions: ApiVersionOptions = {
  defaultVersion: API_VERSION,
  supportedVersions: [API_VERSION]
};

/**
 * Creates middleware to handle API versioning
 * @param options Configuration options for versioning
 * @returns Express middleware function
 */
export function apiVersionMiddleware(options: Partial<ApiVersionOptions> = {}) {
  const config = { ...defaultOptions, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Try to extract version from different sources
    let version = extractVersionFromRequest(req);
    
    // If no version specified, use default
    if (!version) {
      version = config.defaultVersion;
    }
    
    // Validate version
    if (!config.supportedVersions.includes(version)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        message: `API version '${version}' is not supported. Supported versions: ${config.supportedVersions.join(', ')}`,
        code: 'UNSUPPORTED_API_VERSION'
      });
    }
    
    // Add version to request object for later use
    req.apiVersion = version;
    
    // Add header to response
    res.setHeader('X-API-Version', version);
    
    next();
  };
}

/**
 * Extract API version from various parts of the request
 * @param req Express request object
 * @returns Version string or undefined if not found
 */
function extractVersionFromRequest(req: Request): string | undefined {
  // Check in URL path - format: /api/v1/resource
  const pathMatch = req.path.match(/\/api\/v(\d+(?:\.\d+)?)/i);
  if (pathMatch && pathMatch[1]) {
    return `v${pathMatch[1]}`;
  }
  
  // Check in 'Accept' header - format: application/vnd.company.v1+json
  const acceptHeader = req.get('Accept');
  if (acceptHeader) {
    const acceptMatch = acceptHeader.match(/application\/vnd\..*\.v(\d+(?:\.\d+)?)\+json/);
    if (acceptMatch && acceptMatch[1]) {
      return `v${acceptMatch[1]}`;
    }
  }
  
  // Check in custom header
  const versionHeader = req.get('X-API-Version');
  if (versionHeader) {
    return versionHeader;
  }
  
  // Check in query parameter - format: ?api-version=v1
  const queryVersion = req.query['api-version'];
  if (queryVersion && typeof queryVersion === 'string') {
    return queryVersion;
  }
  
  return undefined;
}

// Extend Express Request interface to include apiVersion
declare global {
  namespace Express {
    interface Request {
      apiVersion: string;
    }
  }
} 