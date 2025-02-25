const express = require('express');
const app = express();
const port = 5001;

// Simplified API version middleware
function apiVersionMiddleware(req, res, next) {
  console.log('API versioning middleware called');
  
  // Extract version from URL path: /api/v1/...
  const pathRegex = /^\/api\/v(\d+)\//;
  const pathMatch = req.path.match(pathRegex);
  
  // Extract version from Accept header: application/vnd.company.v1+json
  const acceptRegex = /application\/vnd\.company\.v(\d+)\+json/;
  const acceptHeader = req.get('Accept');
  const acceptMatch = acceptHeader ? acceptHeader.match(acceptRegex) : null;
  
  // Extract version from custom header: X-API-Version: v1
  const versionHeader = req.get('X-API-Version');
  const headerMatch = versionHeader ? versionHeader.match(/^v(\d+)$/) : null;
  
  // Extract version from query parameter: ?api-version=v1
  const queryVersion = req.query['api-version'];
  const queryMatch = queryVersion ? queryVersion.match(/^v(\d+)$/) : null;
  
  // Use the first found version or default to v1
  let version;
  if (pathMatch) {
    version = `v${pathMatch[1]}`;
  } else if (acceptMatch) {
    version = `v${acceptMatch[1]}`;
  } else if (headerMatch) {
    version = versionHeader;
  } else if (queryMatch) {
    version = queryVersion;
  } else {
    version = 'v1'; // Default version
  }
  
  // Validate version
  const supportedVersions = ['v1'];
  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      error: 'Unsupported API version',
      message: `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
      code: 'UNSUPPORTED_API_VERSION'
    });
  }
  
  // Set version in request object and response header
  req.apiVersion = version;
  res.setHeader('X-API-Version', version);
  
  console.log(`API version: ${version}`);
  next();
}

// Apply middleware to all API routes
app.use('/api', apiVersionMiddleware);

// Health endpoints - both versioned and non-versioned
app.get('/api/health', (req, res) => {
  console.log('[Health] Request received for non-versioned endpoint');
  res.json({ status: 'ok' });
});

app.get('/api/v1/health', (req, res) => {
  console.log('[Health] Request received for versioned endpoint');
  res.json({ 
    status: 'ok',
    version: req.apiVersion || 'v1'
  });
});

app.listen(port, () => {
  console.log(`Simple test server running at http://localhost:${port}`);
  console.log(`Health endpoint: http://localhost:${port}/api/health`);
  console.log(`Versioned health endpoint: http://localhost:${port}/api/v1/health`);
}); 