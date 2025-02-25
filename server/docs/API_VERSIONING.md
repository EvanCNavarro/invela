# API Versioning Strategy

This document outlines our approach to API versioning, helping both API consumers and developers understand how we manage changes to our API.

## Overview

Our API uses versioning to ensure backward compatibility while allowing the API to evolve. The current API version is defined in the shared constants (`shared/index.ts`) as `API_VERSION`.

## Version Format

We use a simple versioning scheme: `v{major}[.{minor}]`

- **Major version** (v1, v2): Indicates breaking changes that are not backward compatible
- **Minor version** (v1.1, v1.2): Indicates backward-compatible additions or changes

## How to Specify API Version

Clients can specify which API version to use in several ways (in order of precedence):

1. **URL Path**: `/api/v1/users`
2. **Accept Header**: `Accept: application/vnd.company.v1+json`
3. **Custom Header**: `X-API-Version: v1`
4. **Query Parameter**: `?api-version=v1`

If no version is specified, the API will use the current default version.

## Versioning Conventions

### When to Create a New Major Version

Create a new major version (v2, v3, etc.) when making breaking changes such as:

- Removing or renaming endpoints
- Changing the structure of request or response payloads
- Removing required parameters
- Changing the behavior of existing endpoints

### When to Create a New Minor Version

Create a new minor version (v1.1, v1.2, etc.) when making backward-compatible changes such as:

- Adding new endpoints
- Adding optional parameters to existing endpoints
- Adding fields to response payloads
- Fixing bugs that don't change the API contract

## Deprecation Policy

1. We will maintain deprecated endpoints for at least 6 months after deprecation notice
2. Deprecated endpoints will return a warning header: `X-API-Deprecated: true`
3. Documentation will clearly mark deprecated endpoints

## Implementing New Versions

When implementing a new version:

1. Create version-specific route handlers in the appropriate version folders
2. Update tests to cover all supported versions
3. Update API documentation to reflect changes
4. Add the new version to the `supportedVersions` array in the API version middleware configuration

Example implementation:

```typescript
// In server/index.ts
app.use('/api', apiVersionMiddleware({
  defaultVersion: 'v1',
  supportedVersions: ['v1', 'v2']
}));
```

## Testing API Versions

Our API testing strategy includes:

1. Automated tests for all supported API versions
2. Tests to verify backward compatibility within the same major version
3. Tests to verify version negotiation logic works correctly

## Example Version Implementation

```typescript
// Version-specific route implementation
import { Router } from 'express';

export function getUsersRouterV1() {
  const router = Router();
  
  router.get('/', (req, res) => {
    // v1 implementation
  });
  
  return router;
}

export function getUsersRouterV2() {
  const router = Router();
  
  router.get('/', (req, res) => {
    // v2 implementation with different response format
  });
  
  return router;
}

// In the main router file
import { getUsersRouterV1, getUsersRouterV2 } from './users';

export default function(app) {
  app.use('/api/v1/users', getUsersRouterV1());
  app.use('/api/v2/users', getUsersRouterV2());
}
``` 