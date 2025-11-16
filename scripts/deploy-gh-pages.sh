#!/bin/bash

# Deploy to GitHub Pages
# This script builds the site and pushes it to the gh-pages branch

set -e  # Exit on error

echo "🔨 Building site..."
pnpm run generate

echo "📦 Preparing deployment..."
cd .output/public

# Initialize a new git repo in the build directory
git init
git add -A
git commit -m "Deploy to GitHub Pages"

# Force push to gh-pages branch
echo "🚀 Deploying to GitHub Pages..."
git push -f https://github.com/ingo-eichhorst/hikeathon-2025.git main:gh-pages

echo "✅ Deployed successfully!"
echo "🌐 Your site will be live at: https://ingo-eichhorst.github.io/hikeathon-2025/"
echo "⏱️  Give it 1-2 minutes to process..."

# Cleanup
cd ../..
rm -rf .output/public/.git

echo "Done!"
