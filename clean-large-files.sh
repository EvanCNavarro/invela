#!/bin/bash

# Clean Large Files Script
# This script removes large files and directories to reduce Docker image size

echo "========== CLEANING LARGE FILES =========="
echo "Starting cleanup at $(date)"

# Initial size
INITIAL_SIZE=$(du -sm . | cut -f1)
echo "Initial project size: ${INITIAL_SIZE}MB"

# Create backup directory
mkdir -p deployment-excluded

# 1. Clean node_modules cache directories
echo "Cleaning node_modules cache directories..."
rm -rf node_modules/.cache node_modules/.vite
echo "✅ Removed cache directories"

# 2. Clean large asset directories
echo "Cleaning large asset directories..."
large_dirs=("attached_assets" "backup_assets" "backup_text" "uploads" "cleanup-scripts")

for dir in "${large_dirs[@]}"; do
  if [ -d "$dir" ]; then
    dir_size=$(du -sm "$dir" | cut -f1)
    echo "Processing $dir (${dir_size}MB)..."
    
    # Create excluded directory
    mkdir -p "deployment-excluded/$dir"
    
    # Move contents to excluded directory
    if [ "$(ls -A $dir 2>/dev/null)" ]; then
      mv $dir/* "deployment-excluded/$dir/" 2>/dev/null || true
    fi
    
    # Create placeholder
    echo "This directory was cleaned for deployment" > "$dir/.placeholder"
    
    echo "✅ Cleaned $dir directory (saved ~${dir_size}MB)"
  fi
done

# 3. Clean utility scripts
echo "Cleaning utility scripts..."
mkdir -p deployment-excluded/scripts

# Copy and remove utility scripts
find . -maxdepth 1 -type f -name "add-*.js" -o -name "check-*.js" -o -name "create-*.js" -o -name "demo-*.js" -o -name "fix-*.js" -o -name "import-*.js" -o -name "parse-*.js" | while read file; do
  if [ -f "$file" ]; then
    cp "$file" "deployment-excluded/scripts/" 2>/dev/null
    rm "$file" 2>/dev/null
    echo "✅ Removed utility script: $file"
  fi
done

# 4. Clean test and docs from node_modules
echo "Cleaning documentation and test files from node_modules..."
find node_modules -type d -name "docs" -o -name "doc" -o -name "example" -o -name "examples" -o -name "test" -o -name "tests" -o -name "__tests__" | xargs rm -rf 2>/dev/null
find node_modules -type f -name "*.md" -o -name "LICENSE*" | xargs rm -f 2>/dev/null
echo "✅ Removed documentation and test files"

# 5. Remove large TypeScript files that aren't needed in production
echo "Removing TypeScript source files (keeping .d.ts)..."
find node_modules -type f -name "*.ts" -not -name "*.d.ts" | xargs rm -f 2>/dev/null
echo "✅ Removed TypeScript source files"

# Final size
FINAL_SIZE=$(du -sm . | cut -f1)
SAVED_SIZE=$((INITIAL_SIZE - FINAL_SIZE))
PERCENTAGE=$((SAVED_SIZE * 100 / INITIAL_SIZE))

echo ""
echo "========== CLEANUP COMPLETE =========="
echo "Initial size: ${INITIAL_SIZE}MB"
echo "Final size: ${FINAL_SIZE}MB"
echo "Saved approximately ${SAVED_SIZE}MB (${PERCENTAGE}%)"
echo ""
echo "Your project is now ready for deployment!"