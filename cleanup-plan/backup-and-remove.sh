#!/bin/bash

# Script to backup and remove test/debug files

BACKUP_DIR=".backup_before_cleanup"

# Create backup subdirectories
mkdir -p "$BACKUP_DIR/test_scripts"
mkdir -p "$BACKUP_DIR/debug_scripts"
mkdir -p "$BACKUP_DIR/broadcast_scripts"
mkdir -p "$BACKUP_DIR/fix_scripts"
mkdir -p "$BACKUP_DIR/demo_scripts"
mkdir -p "$BACKUP_DIR/temp_pages"
mkdir -p "$BACKUP_DIR/backup_files"
mkdir -p "$BACKUP_DIR/md_docs"
mkdir -p "$BACKUP_DIR/tutorial_scripts"
mkdir -p "$BACKUP_DIR/server_routes"

# Backup and remove test scripts
echo "Backing up test scripts..."
find . -maxdepth 1 -type f -name "*test*.js" -o -name "*test*.ts" | xargs -I{} cp {} "$BACKUP_DIR/test_scripts/"
find . -maxdepth 1 -type f -name "*test*.js" -o -name "*test*.ts" | xargs -I{} rm {}

# Backup and remove debug scripts
echo "Backing up debug scripts..."
find . -maxdepth 1 -type f -name "*debug*.js" -o -name "*debug*.ts" | xargs -I{} cp {} "$BACKUP_DIR/debug_scripts/"
find . -maxdepth 1 -type f -name "*debug*.js" -o -name "*debug*.ts" | xargs -I{} rm {}

# Backup and remove broadcast scripts
echo "Backing up broadcast scripts..."
find . -maxdepth 1 -type f -name "broadcast-*.js" -o -name "broadcast-*.cjs" | xargs -I{} cp {} "$BACKUP_DIR/broadcast_scripts/"
find . -maxdepth 1 -type f -name "broadcast-*.js" -o -name "broadcast-*.cjs" | xargs -I{} rm {}

# Backup and remove fix scripts
echo "Backing up fix scripts..."
find . -maxdepth 1 -type f -name "fix-*.js" -o -name "fix_*.js" -o -name "fix-*.ts" -o -name "fix_*.ts" -o -name "fixed-*.js" -o -name "fixed-*.ts" | xargs -I{} cp {} "$BACKUP_DIR/fix_scripts/"
find . -maxdepth 1 -type f -name "fix-*.js" -o -name "fix_*.js" -o -name "fix-*.ts" -o -name "fix_*.ts" -o -name "fixed-*.js" -o -name "fixed-*.ts" | xargs -I{} rm {}

# Backup and remove demo scripts
echo "Backing up demo scripts..."
find . -maxdepth 1 -type f -name "demo-*.js" -o -name "*-demo-*.js" -o -name "create-*-sample.ts" | xargs -I{} cp {} "$BACKUP_DIR/demo_scripts/"
find . -maxdepth 1 -type f -name "demo-*.js" -o -name "*-demo-*.js" -o -name "create-*-sample.ts" | xargs -I{} rm {}

# Backup and remove tutorial scripts
echo "Backing up tutorial scripts..."
find . -maxdepth 1 -type f -name "*tutorial*.js" -o -name "*tutorial*.ts" | xargs -I{} cp {} "$BACKUP_DIR/tutorial_scripts/"
find . -maxdepth 1 -type f -name "*tutorial*.js" -o -name "*tutorial*.ts" | xargs -I{} rm {}

# Backup and remove temporary markdown docs
echo "Backing up temporary documentation..."
find . -maxdepth 1 -type f -name "*_FIX.md" -o -name "*-FIX-*.md" -o -name "*_PLAN.md" -not -name "UNIFIED-PROGRESS-SOLUTION.md" | xargs -I{} cp {} "$BACKUP_DIR/md_docs/"
find . -maxdepth 1 -type f -name "*_FIX.md" -o -name "*-FIX-*.md" -o -name "*_PLAN.md" -not -name "UNIFIED-PROGRESS-SOLUTION.md" | xargs -I{} rm {}

# Backup and remove backup files
echo "Backing up backup files..."
find . -maxdepth 1 -type f -name "*.bak" -o -name "*.new" -o -name "*.tmp*" | xargs -I{} cp {} "$BACKUP_DIR/backup_files/"
find . -maxdepth 1 -type f -name "*.bak" -o -name "*.new" -o -name "*.tmp*" | xargs -I{} rm {}

# Backup and remove test pages in client/src/pages
echo "Backing up test pages..."
find client/src/pages -type f -name "*test*.tsx" -o -name "*debugger*.tsx" -o -name "*playground*.tsx" | xargs -I{} cp {} "$BACKUP_DIR/temp_pages/"
find client/src/pages -type f -name "*test*.tsx" -o -name "*debugger*.tsx" -o -name "*playground*.tsx" | xargs -I{} rm {}

# Backup and remove backup files in client/src/pages
echo "Backing up backup page files..."
find client/src/pages -type f -name "*.bak" -o -name "*.new" | xargs -I{} cp {} "$BACKUP_DIR/temp_pages/"
find client/src/pages -type f -name "*.bak" -o -name "*.new" | xargs -I{} rm {}

# Backup debug directory
echo "Backing up debug directory..."
if [ -d "client/src/pages/debug" ]; then
  cp -r client/src/pages/debug "$BACKUP_DIR/temp_pages/"
  rm -rf client/src/pages/debug
fi

# Backup server routes before removing
echo "Backing up server test/debug routes..."
find server/routes -type f -name "*test*.ts" -o -name "*debug*.ts" -o -name "*fix*.ts" | xargs -I{} cp {} "$BACKUP_DIR/server_routes/"

# DO NOT remove these server routes yet as they are used in the routes.ts file
# We need to first modify routes.ts to remove references to these routes
# The following commented code would remove these routes:
# find server/routes -type f -name "*test*.ts" -o -name "*debug*.ts" | xargs -I{} rm {}

echo "Backup completed. All backed up files are in $BACKUP_DIR"
echo "IMPORTANT: We've only backed up server routes but NOT removed them yet."
echo "You must first update server/routes.ts to remove references to these routes."