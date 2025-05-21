# Project Cleanup Plan

Based on the examination of the project structure, here's a categorization of files that can be safely removed versus those that should be kept.

## Files to Keep

### Core Application Files
- package.json
- tsconfig.json
- vite.config.ts
- drizzle.config.ts
- theme.json

### Essential Source Directories
- client/
- server/
- db/
- public/

### Necessary Configuration/Documentation Files
- UNIFIED-PROGRESS-SOLUTION.md (seems to be an important architectural document)

## Files to Remove

### Test Scripts
These are scripts used for testing specific features that are no longer needed in the production environment:
- api-test-*.js
- browser-test-*.js
- test-*.js
- direct-test-*.js
- *-test-*.js
- websocket-test*.js
- browser-websocket-test.js

### Debug/Development Tools
Scripts used during development for debugging:
- direct-debug-*.js
- */debug/*
- *debug*.js
- *-debugger-*.tsx

### Temporary Fix Scripts
Scripts used to apply one-time fixes that have likely been incorporated into the main codebase:
- fix-*.js
- fix_*.js
- *_fix.js
- apply_fix.js
- fixed-*.js
- fixed_*.ts/tsx

### Broadcast Test Scripts
Scripts used to test WebSocket broadcast functionality:
- broadcast-*.js
- direct-broadcast-*.js
- *-broadcast-*.js

### Demo/Sample Data Scripts
Scripts used to populate demo or sample data:
- demo-*.js
- *-demo-*.js
- create-*-sample.ts
- create-test-*.js

### Database Cleanup/Migration Scripts
One-time scripts used for database operations:
- database-cleanup.ts
- add-*-migration.sql
- *.sql (unless part of a critical DB setup)

### Backup Files
Backup files that are no longer needed:
- *.bak
- *.new
- *.tmp*

### Temporary Tutorial Scripts
Scripts used to set up or test tutorials:
- direct-*-tutorial-*.js
- *-tutorial-*.js
- direct-check-tutorial-*.js
- direct-create-*-tutorial*.js
- direct-reset-*-tutorial*.js

### Miscellaneous One-Time Tools
Scripts used for specific operations that are likely completed:
- unlock-*.js
- *-unlock-*.js
- check-*.js
- verify-*.js
- create-fixed-*.js

### Redundant Files
Files in the root that have been moved to server/routes or client components:
- Any *.ts/tsx files in the root that have corresponding files in the proper directories

### Extracted Files
- extract-*.js
- *.log

### Temporary Documentation Files
Markdown files documenting temporary fixes:
- *_FIX.md
- *-FIX-*.md
- *_PLAN.md (except for major architectural plans)