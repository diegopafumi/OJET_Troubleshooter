#!/bin/bash

# OJET Troubleshooter - Release Package Creator
# Version 1.5.0
# Creates a production-ready deployment package

VERSION="1.5.0"
RELEASE_NAME="OJET_Troubleshooter_v${VERSION}"
RELEASE_DIR="releases/${RELEASE_NAME}"

echo "=========================================================================="
echo "🚀 OJET Troubleshooter - Release Package Creator"
echo "📦 Version: ${VERSION}"
echo "=========================================================================="

# Create releases directory if it doesn't exist
mkdir -p releases

# Remove old release directory if it exists
if [ -d "$RELEASE_DIR" ]; then
  echo "🗑️  Removing old release directory..."
  rm -rf "$RELEASE_DIR"
fi

# Create new release directory
echo "📁 Creating release directory: ${RELEASE_DIR}"
mkdir -p "$RELEASE_DIR"

# Copy application files
echo "📋 Copying application files..."

# Backend
cp -r backend "$RELEASE_DIR/"

# Frontend
cp -r frontend "$RELEASE_DIR/"

# Scripts
cp start.sh "$RELEASE_DIR/"
cp stop.sh "$RELEASE_DIR/"
cp restart.sh "$RELEASE_DIR/"
cp setup.sh "$RELEASE_DIR/"
cp Monitor_Ojet.sh "$RELEASE_DIR/"

# Documentation (only copy files that exist)
cp README.md "$RELEASE_DIR/"
cp RELEASE_NOTES.md "$RELEASE_DIR/"
cp REMOTE_ACCESS.md "$RELEASE_DIR/"
cp MONITOR_GUIDE.md "$RELEASE_DIR/"
cp DOCUMENTATION_INDEX.md "$RELEASE_DIR/"
cp OJET_QUERIES_GUIDE.md "$RELEASE_DIR/"
cp INSTALLATION.md "$RELEASE_DIR/"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x "$RELEASE_DIR"/*.sh

# Clean up development files
echo "🧹 Cleaning up development files..."
rm -rf "$RELEASE_DIR/backend/node_modules"
rm -rf "$RELEASE_DIR/frontend/node_modules"
rm -rf "$RELEASE_DIR/frontend/dist"
rm -f "$RELEASE_DIR/backend/.env"
rm -f "$RELEASE_DIR/frontend/.env"

# Create .env.example files
echo "📝 Creating .env.example files..."
cat > "$RELEASE_DIR/backend/.env.example" << 'EOF'
# Backend Configuration
PORT=3001
NODE_ENV=production

# Oracle Database Configuration (Optional - can be configured via UI)
# DB_HOST=localhost
# DB_PORT=1521
# DB_SID=ORCL
# DB_USER=system
# DB_PASSWORD=oracle
EOF

cat > "$RELEASE_DIR/frontend/.env.example" << 'EOF'
# Frontend Configuration
VITE_API_URL=http://localhost:3001
EOF

# Create VERSION file
echo "📌 Creating VERSION file..."
echo "$VERSION" > "$RELEASE_DIR/VERSION"

# Create CHANGELOG for this release
echo "📝 Creating CHANGELOG..."
cat > "$RELEASE_DIR/CHANGELOG.txt" << 'EOF'
OJET Troubleshooter v1.5.0 - March 16, 2026

🎯 Major Update: Enhanced Monitoring, Session Mapping & Standalone Monitor Script

Key Features:
✅ 10 pre-configured OJET/XStream monitoring queries
✅ Enhanced Outbound Server (Dispatcher) with multi-tier 5-priority health logic
✅ New LAG_SEC column with real-time capture latency
✅ Long Running Transactions with SESSION MAPPING (USERNAME, MACHINE via v$session JOINs)
✅ CAPTURED_APPLY_DIFF column in Recovery Checkpoint and Capture Process Status
✅ Connection management with Disconnect feature
✅ Standalone Monitor_Ojet.sh script for command-line monitoring
✅ Recovery Checkpoint filtering for active processes only
✅ Archive Log Holes and Safe-to-Delete queries
✅ Enhanced LAST_MSG format with date and time (DD-MON HH24:MI:SS)

See RELEASE_NOTES.md for complete details.
EOF

# Create ZIP file
echo "📦 Creating ZIP archive..."
cd releases
zip -r "${RELEASE_NAME}.zip" "${RELEASE_NAME}" -q
cd ..

# Calculate file size
FILE_SIZE=$(du -h "releases/${RELEASE_NAME}.zip" | cut -f1)

echo ""
echo "=========================================================================="
echo "✅ Release package created successfully!"
echo "=========================================================================="
echo "📦 Package: releases/${RELEASE_NAME}.zip"
echo "📊 Size: ${FILE_SIZE}"
echo "📁 Contents:"
echo "   - Application code (backend + frontend)"
echo "   - All documentation files"
echo "   - Setup and control scripts"
echo "   - Monitor_Ojet.sh standalone script"
echo "   - .env.example templates"
echo ""
echo "🚀 Ready for deployment!"
echo "=========================================================================="

