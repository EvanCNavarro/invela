#!/bin/bash
# Script to allow Replit domain in Vite
export VITE_DEV_SERVER_HOST=0.0.0.0
export VITE_DEV_SERVER_HMRHOST="9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev"
export VITE_ALLOW_ORIGINS="9606074c-a9ad-4fe1-8fe5-3d9c3eed0606-00-33ar2rv36ligj.picard.replit.dev"
npm run dev