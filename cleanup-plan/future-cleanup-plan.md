# Future Cleanup Plan

The initial phase of cleanup has been successfully completed, focusing on removing obvious test and debug files. The following outlines what should be considered for future cleanup phases:

## Phase 2: Direct Fix/Broadcast Scripts
These scripts were left in place during the initial cleanup to avoid breaking any functionality. After verifying the application continues to function properly for an extended period, consider removing these files:

### Direct Scripts to Consider for Removal
- `direct-broadcast-company-tabs.cjs`
- `direct-broadcast-dashboard-tutorial-update.js`
- `direct-broadcast-kyb-update.cjs`
- `direct-broadcast-tutorial-update.js`
- `direct-check-tutorial-entries.js`
- `direct-check-tutorial-implementation.cjs`
- `direct-create-current-user-tutorials.js`
- `direct-create-tab-tutorials.js`
- And other similar direct-* scripts

### Fix Scripts to Consider for Removal
After verifying these fixes have been properly incorporated into the main application code:
- `fix-all-kyb-tasks.js`
- `fix-broadcast-task-739.js`
- `fix-company-204.cjs`
- `fix-empty-csv-files.js`
- And other fix-* scripts

## Phase 3: Remaining Test Files
After thorough validation of system stability:
- Remove remaining test/demo scripts in the root directory
- Clean up test components that may still exist in client/src/components/test/

## Phase 4: Documentation and Legacy Files
- Review and potentially remove outdated documentation files
- Clean up any remaining legacy code marked for deprecation

## Implementation Guidelines
For each phase:
1. Back up all files before removal
2. Remove files in small batches
3. Test application thoroughly after each batch
4. Keep a log of removed files and their purpose

## Note on Fix Files
Some fix files may be needed for emergency recovery purposes. Consider moving these to a separate 'maintenance-tools' directory rather than removing them completely.