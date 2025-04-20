// Test WebSocket broadcasting using ESM syntax
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Set up require for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Now we can use require
const { wsService } = require('./server/services/websocket');

// Company ID we want to update
const companyId = 189; 

// Test broadcasting a company tabs update
console.log('Broadcasting company_tabs_updated event...');
wsService.broadcast('company_tabs_updated', {
  companyId,
  availableTabs: ['task-center', 'file-vault'],
  timestamp: new Date().toISOString()
});

console.log('Broadcast complete!');