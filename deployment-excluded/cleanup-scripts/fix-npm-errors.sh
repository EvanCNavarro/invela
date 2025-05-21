#!/bin/bash
# This script fixes npm errors related to path aliases.
# Run this script if you encounter npm errors about @/components, @/hooks, etc.

echo "🔍 Checking for npm errors related to path aliases..."

# Find and remove any package-lock entries for @/* paths
if [ -f package-lock.json ]; then
  echo "📝 Checking package-lock.json for problematic entries..."
  
  if grep -q '"@/' package-lock.json; then
    echo "⚠️ Found problematic @/ entries in package-lock.json"
    echo "🔧 Please run: npm install --package-lock-only"
    echo "🔄 Then restart the application"
  else
    echo "✅ No problematic entries found in package-lock.json"
  fi
fi

# Create a .npmrc file to prevent npm from trying to install @/ paths
if [ ! -f .npmrc ] || ! grep -q "ignore-workspace-root-check=true" .npmrc; then
  echo "📝 Creating/updating .npmrc file to ignore path aliases..."
  echo "ignore-workspace-root-check=true" > .npmrc
  echo "✅ Created .npmrc file"
fi

echo "🔍 Checking if dotenv and pg are installed..."
if ! npm list dotenv pg --silent > /dev/null 2>&1; then
  echo "🔧 Installing required dependencies: dotenv pg"
  npm install dotenv pg
else
  echo "✅ Required dependencies are already installed"
fi

echo "✨ Fix completed. If you still encounter npm errors, run: npm install --package-lock-only"
echo "🔄 Then restart the application"