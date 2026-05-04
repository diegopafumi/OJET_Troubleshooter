#!/bin/bash

# OJET Troubleshooter - Create Release v1.4.0
# Script to create official release package for customers

set -e

VERSION="1.4.0"
RELEASE_DATE="2026-02-10"

echo "🚀 Creating OJET Troubleshooter Release v${VERSION}"
echo "=================================================="
echo "📅 Release Date: ${RELEASE_DATE}"
echo ""

# Clean up any customer-unfriendly files first
echo "🧹 Cleaning up unnecessary files..."

# Remove .DS_Store files
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# Remove log files
rm -f logs/*.log logs/*.pid 2>/dev/null || true

# Remove .env (customers should create their own)
rm -f backend/.env 2>/dev/null || true

echo "   ✅ Cleanup complete"
echo ""

PROJECT_DIR=$(basename "$PWD")
ARCHIVE_NAME="OJET_Troubleshooter_v${VERSION}.zip"

echo "📋 Project: $PROJECT_DIR"
echo "📦 Archive: $ARCHIVE_NAME"
echo "🏷️  Version: $VERSION"
echo ""
echo "🗜️  Creating release package..."
echo "   Excluding: node_modules, dist, logs, .env, internal scripts"
echo ""

# Create zip archive from parent directory to preserve folder structure
cd ..
zip -r -q -X "$ARCHIVE_NAME" "$PROJECT_DIR" \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/.vite/*" \
  -x "*/logs/*" \
  -x "*/.env" \
  -x "*.log" \
  -x "*.swp" \
  -x "*/.DS_Store" \
  -x "*/._*" \
  -x "*/create-customer-package.sh" \
  -x "*/create-release-v*.sh" \
  -x "*/GETTING_STARTED.md" \
  -x "*/PORTABILITY_GUIDE.md" \
  -x "*/RESTART_GUIDE.md" \
  -x "*/CHANGELOG.md" \
  -x "*/RELEASE_NOTES_v*.md" \
  -x "*/RELEASE_ANNOUNCEMENT_v*.md" \
  -x "*/INSTALLATION_v*.md" \
  -x "*/.git/*" \
  -x "*/.gitignore"
cd "$PROJECT_DIR"

ARCHIVE_SIZE=$(du -sh "../$ARCHIVE_NAME" 2>/dev/null | cut -f1)

echo ""
echo "=============================================="
echo "✅ Release v${VERSION} Created Successfully!"
echo "=============================================="
echo "📦 Archive: ../$ARCHIVE_NAME"
echo "📊 Size: $ARCHIVE_SIZE"
echo "📅 Date: $RELEASE_DATE"
echo ""
echo "📋 What's Included:"
echo "   ✅ All source code (frontend & backend)"
echo "   ✅ Setup and start scripts (setup.sh, start.sh, stop.sh, restart.sh)"
echo "   ✅ Complete documentation (README.md, RELEASE_NOTES.md, guides)"
echo "   ✅ .env.example (customers create their own .env)"
echo ""
echo "📋 What's Excluded:"
echo "   ❌ node_modules (installed via setup.sh)"
echo "   ❌ Log files"
echo "   ❌ .env files (sensitive data)"
echo "   ❌ .DS_Store and temp files"
echo "   ❌ Internal scripts (create-customer-package.sh, create-release-*.sh)"
echo "   ❌ Git files (.git, .gitignore)"
echo ""
echo "🎯 New Features in v${VERSION}:"
echo "   ✨ Enhanced OJET Queries with automatic health status detection"
echo "   ✨ Color-coded health indicators for all monitoring queries"
echo "   ✨ Optimized table layouts with compact column display"
echo "   ✨ Intelligent health status columns with emoji indicators"
echo "   ✨ Updated column descriptions for better clarity"
echo "   ✨ Comprehensive diagnostic capabilities across all queries"
echo ""
echo "📊 Updated Queries:"
echo "   🔍 Check Capture Process Status - Added APPLY_LAG_SCN and STATUS_CHECK"
echo "   🔍 Check Data Transport - Added UNACKNOWLEDGED_SCN_GAP and NETWORK_HEALTH_STATUS"
echo "   🔍 Check Capture Memory - Added ENGINE_HEALTH_STATUS with lag detection"
echo "   🔍 Check Apply Memory - Added READER_HEALTH_STATUS with backpressure detection"
echo "   🔍 Check Streams Pool - Added POOL_HEALTH_STATUS with capacity warnings"
echo ""
echo "📋 Customer Installation Instructions:"
echo "   1. Extract: unzip $ARCHIVE_NAME"
echo "   2. Navigate: cd $PROJECT_DIR"
echo "   3. Setup: chmod +x setup.sh && ./setup.sh"
echo "   4. Start: ./start.sh"
echo "   5. Access: http://localhost:3000"
echo ""
echo "📚 Documentation Files:"
echo "   📄 README.md - Complete project overview"
echo "   📄 INSTALLATION.md - Installation guide"
echo "   📄 RELEASE_NOTES.md - Version history and changes"
echo "   📄 MONITOR_GUIDE.md - Striim monitoring guide"
echo "   📄 OJET_QUERIES_GUIDE.md - OJET Queries documentation"
echo "   📄 DOCUMENTATION_INDEX.md - Documentation navigation"
echo ""
echo "🎯 Release package is ready for customer delivery!"
echo "📧 Send ../$ARCHIVE_NAME to customers"
echo ""

