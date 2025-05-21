#!/bin/bash
# Script to fix Vite host restrictions for Replit preview
# This sets environment variables that tell Vite to accept the Replit domain

# Set the required environment variables
export VITE_FORCE_ALLOW_HOSTS=true
export VITE_ALLOWED_HOSTS=all
export VITE_DEV_SERVER_HOST=0.0.0.0

# The current Replit domain from the error message
export VITE_HMR_HOSTNAME="9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev"

# Run the application with the environment variables set
echo "🚀 Starting server with Replit preview domain access enabled..."
npm run dev