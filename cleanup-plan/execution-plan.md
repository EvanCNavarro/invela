# Cleanup Execution Plan

To safely clean up the project without breaking functionality, we'll follow this multi-step approach:

## 1. Verify Dependencies

Before removing any files, it's important to check if they're being used by core components of the application:

- Check imports in all main application components
- Look for references in the routing setup
- Examine WebSocket handlers for any broadcast functions that might be used

## 2. Clean Up Root Directory

1. First, move any important files currently in the root directory to proper directories:
   - Move any `.ts/.tsx` files that contain app functionality to appropriate server/client directories
   - Organize any critical SQL scripts into a `db/migrations` directory

2. Remove test and debug files from the root directory:
   - All test scripts (.js files with "test" in the name)
   - All direct broadcast scripts
   - All fix-related scripts
   - All debug scripts
   - All demo-data scripts

## 3. Clean Up Client Pages

1. Remove test and debug pages from `client/src/pages`:
   - All files listed in the "Pages to Remove" document
   - The `debug` directory and its contents
   - Backup files (.bak, .new, etc.)

2. Update routes if any removed pages were referenced:
   - Check the main client router setup
   - Update any links or navigation references

## 4. Clean Up Server Components

1. Remove any temporary routes or unused endpoints in `server/routes.ts`
2. Clean up any temporary fix files in `server/fixes/` directory

## 5. Clean Up Attached Assets

1. Review and organize the attached_assets directory:
   - Keep only necessary images and documents
   - Remove duplicates and test files
   - Consider organizing into subdirectories (images, docs, etc.)

## 6. Documentation

1. Keep important documentation:
   - Architectural plans (UNIFIED-PROGRESS-SOLUTION.md)
   - Essential README files

2. Remove temporary fix documentation:
   - Temporary fix plans/summaries
   - Test documentation

## 7. Verify Application

After cleanup, verify that the application still works correctly:

1. Test all main application flows
2. Ensure WebSocket connections are working
3. Check task creation and assignment
4. Verify risk score calculations
5. Test authentication

## Safety Measures

- Before mass deletion, move files to a temporary backup directory
- Execute cleanup in phases, testing after each phase
- Keep a log of all removed files