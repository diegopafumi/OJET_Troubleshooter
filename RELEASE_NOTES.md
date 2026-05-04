# Release Notes

## Version 1.5.0 (May 4, 2026)

🎯 **Major Update: Enhanced Outbound Server Monitoring, Connection Management & Standalone Monitor Script**

### 🆕 New Features

#### 📊 Enhanced Outbound Server (Dispatcher) Query
- **Complete Pipeline Monitoring**: New comprehensive query that joins `v$xstream_capture`, `dba_xstream_outbound`, and `v$xstream_outbound_server`
- **Multi-Tier Health Logic**: Intelligent 5-priority health detection system:
  1. **Priority 1 - Hard Crashes**: SERVER DOWN (ABORTED/DISABLED) → 🔴 RED
  2. **Priority 2 - Critical Latency**: CRITICAL LAG (> 30 minutes) → 🔴 RED
  3. **Priority 3 - Communication Bottlenecks**: STRIIM IS SLOW or BOTTLENECK/BACKPRESSURE → 🟡 YELLOW
  4. **Priority 4 - Creeping Latency**: HIGH LAG (> 5 minutes) or HUGE BACKLOG (> 500k LCRs) → 🟡 YELLOW
  5. **Priority 5 - Healthy**: HEALTHY (IDLE) or DATA FLOWING → 🟢 GREEN
- **New LAG_SEC Column**: Real-time capture latency in seconds with color coding
  - 🔴 RED if > 1800 seconds (30 minutes)
  - 🟡 YELLOW if > 300 seconds (5 minutes)
- **Enhanced LAST_MSG Format**: Now shows date and time (DD-MON HH24:MI:SS) instead of just time
- **Updated IN_TRANSIT Threshold**: Changed to 500,000 LCRs for more accurate backlog detection

#### 🔄 Connection Management Improvements
- **Disconnect Feature**: New red "Disconnect" button to clear all active connections
- **Automatic State Reset**: Connecting to a new database automatically clears previous query results
- **Clean UI State**: Ensures dashboard starts fresh when switching database contexts
- **Visual Feedback**: Clear indication of connection status

#### 🎯 Recovery Checkpoint Enhancements
- **Filtered Results**: Added `WHERE client_status = 'ATTACHED'` to focus only on active processes
- **CAPTURED_APPLY_DIFF Column**: New column showing the difference between `CAPTURED_SCN` and `APPLIED_SCN` to identify downstream latency
- **Cleaner Output**: Removes inactive capture processes from checkpoint tracking
- **Better Accuracy**: Shows only relevant checkpoint information

#### 📊 Check Capture Process Status Enhancements
- **CAPTURED_SCN Column**: Shows the highest SCN captured by the extraction process
- **APPLIED_SCN Column**: Shows the highest SCN applied by the downstream client
- **CAPTURED_APPLY_DIFF Column**: Calculated difference between captured and applied SCNs
- **Renamed**: `SCN_DIFF` renamed to `CAPTURED_APPLY_DIFF` for clarity

#### 🔍 Long Running Transactions Overhaul
- **Session Mapping**: New JOINs with `v$transaction` and `v$session` to identify transaction owners
- **USERNAME Column**: Shows the Oracle database user (schema) executing the transaction
- **MACHINE Column**: Shows the hostname/IP of the client machine that initiated the session
- **Enhanced Troubleshooting**: Directly identify which application and host is causing replication blocks
- **Formatted Start Time**: `TO_CHAR(first_message_time, 'YYYY-MM-DD HH24:MI:SS')` for clear timestamps

#### 📜 Standalone Monitor Script
- **Monitor_Ojet.sh**: New standalone bash script for command-line monitoring
- **8 Comprehensive Checks**: All critical OJET health checks in one script
- **Automatic Logging**: Saves timestamped reports to local files
- **No Dependencies**: Works directly with SQL*Plus, no web interface needed
- **Perfect for Automation**: Can be scheduled with cron for periodic health checks

#### 🧹 Query Cleanup
- **Removed Phantom Gap Logic**: Eliminated false positives from "Interested LCR" query
  - Removed color coding from DIFF_CAPTURE_ENQ column
- **Simplified Data Transport**: Removed misleading UNACKNOWLEDGED_SCN_GAP color coding
- **Removed Apply Process Memory**: Eliminated "Check Apply Process Memory Usage" section (not applicable for OJET)

### 🎨 UI/UX Improvements
- **Enhanced Color Coding**: More accurate thresholds for LAG_SEC and IN_TRANSIT columns
- **Better Documentation**: Updated "Column Descriptions & Health Metrics" for all modified queries
- **Clearer Health Status**: Multi-tier priority system makes it easier to identify root causes
- **Improved Table Layout**: Wider LAST_MSG column (a18) to accommodate date format

### 📚 Documentation Updates
- **Outbound Server Documentation**: Complete rewrite with new column descriptions
- **Health Metrics Guide**: Updated with 5-priority system explanation
- **Threshold Documentation**: Clear explanation of all new thresholds
- **Monitor Script Guide**: Instructions for using standalone Monitor_Ojet.sh

### 🔧 Technical Improvements
- **Phantom Gap Fix**: Intelligent logic that ignores SCN differences when processes are IDLE
- **State Reset Pattern**: Using `setQueryResults({})` and `setQueryErrors({})` for UI consistency
- **Hybrid String Matching**: Checks for both emoji (🟢) and text (GREEN) for database compatibility
- **Connection Pool Cleanup**: Proper cleanup on disconnect to prevent memory leaks

### 📦 Deployment
- **Release Package**: `OJET_Troubleshooter_v1.5.0.zip`
- **Includes Monitor_Ojet.sh**: Standalone monitoring script in package root
- **Backward Compatible**: All existing features continue to work
- **No Breaking Changes**: Existing queries enhanced, not replaced

#### 🧮 OJET Estimated Parameters Calculator
- **New Planning Tool**: Capacity estimation calculator added to both Validation PROD and Validation Downstream pages
- **Inputs**: Average Row Length (bytes) and Row Changes per Transaction
- **Real-Time Calculations**:
  - **Raw Data Size (GB)**: `ROUND(2.16 * (RC/1M) + (AvgRowLen * RC) / 1GB, 1)`
  - **Min STREAMS_POOL_SIZE (GB)**: Raw Data Size × 1.10 (no rounding)
  - **TransactionBufferSpilloverCount**: Row Changes × 1.25
  - **TransactionAgeSpilloverLimit**: Fixed 8,000 (2-hour transaction window)
- **Tooltip Documentation**: ⓘ icons on each field explain the formula source and how to obtain input values

#### 🔧 Table Instantiation Input Format Improvement
- **Unified Input**: Table Owner and Table Names fields consolidated into a single `SCHEMA.TABLE` input separated by `;`
- **Multi-Owner Support**: Different schemas can be specified per table (e.g., `HR.EMPLOYEES;SALES.ORDERS`)
- **Auto-Uppercase**: Input is automatically converted to uppercase
- **Format Validation**: Invalid Oracle identifiers are caught and reported before query execution

### 🐛 Bug Fixes
- **Monitor Copy Button**: Fixed `setCopiedCommand` undefined error that caused copy-to-clipboard to crash
- **Table Input Parser**: Improved whitespace handling around dot separator (`SCHEMA . TABLE` now parses correctly)
- **Text Corrections**: "XStream pipeline" renamed to "OJET pipeline" in Ojet Queries documentation
- **STRIIM$ Filter Removed**: Archive Logs cleanup query now shows all captures regardless of naming convention
- **Connection Test**: `/api/test-connection` now uses `getOrCreatePool()` for consistent pool management

### 🔒 Security Improvements
- **Oracle Identifier Validation**: Schema and table names validated against Oracle naming rules before SQL construction
- **Auth Log Cleanup**: Removed verbose authentication debug logs (username/token details no longer logged in production)
- **Environment-Based Logging**: New `log.debug()` / `log.info()` / `log.error()` helpers — debug output suppressed when `NODE_ENV=production`

### 🔄 Migration Notes
- **No Action Required**: Existing installations work as-is
- **New Features**: Disconnect button and enhanced monitoring available immediately
- **Monitor Script**: Extract Monitor_Ojet.sh from package root for standalone use
- **Database Permissions**: Same permissions required as v1.4.0
- **Table Instantiation Input**: Fields changed — enter `SCHEMA.TABLE;SCHEMA.TABLE` instead of separate owner/table fields

---

## Version 1.4.0 (February 10, 2026)

🎯 **Major Update: Enhanced OJET Queries with Automatic Health Status Detection**

### 🆕 New Features

#### 🏥 Automatic Health Status Detection
- **Intelligent Health Indicators**: All queries now include automatic health status columns
- **Color-Coded Diagnostics**: Instant visual feedback with red (🔴), yellow (🟡), and green (🟢) indicators
- **Smart Thresholds**: Industry-standard thresholds for critical, warning, and healthy states
- **Emoji Status Messages**: Clear, human-readable status messages with emoji indicators

#### 📊 Enhanced Queries

**1. Check Capture Process Status**
- ✨ New `APPLY_LAG_SCN` column - Calculates lag between captured and applied SCNs
- ✨ New `STATUS_CHECK` column - Automatic health status with 4 states:
  - 🔴 NOT HEALTHY (ABORTED) - Process has errors
  - 🔴 CRITICAL LAG - SCN lag > 200,000
  - 🟡 BACKLOGGED - SCN lag > 50,000
  - 🟢 HEALTHY - Normal operation
- 🔧 Removed `QUEUE_OWNER` column for better space utilization
- 🔧 Truncated `ERROR_MESSAGE` to 30 characters
- 🔧 Truncated `CAPTURE_NAME` to 30 characters

**2. Check Data Transport**
- ✨ New `UNACKNOWLEDGED_SCN_GAP` column - Shows pending acknowledgment count
- ✨ New `NETWORK_HEALTH_STATUS` column - Automatic network health diagnosis:
  - 🔴 MEMORY PRESSURE - Waiting for memory allocation
  - 🔴 CRITICAL BACKLOG - SCN gap > 100,000
  - 🟡 DOWNSTREAM BUSY - Waiting for client
  - 🟡 NETWORK LATENCY - SCN gap > 20,000
  - 🟢 HEALTHY - Normal operation
- 🔧 Added `INST_ID` column for RAC environments
- 🔧 Removed `TOTAL_MSGS` column
- 📝 Updated column descriptions for clarity

**3. Check Capture Process Memory Usage**
- ✨ New `ENGINE_HEALTH_STATUS` column - Comprehensive engine health:
  - 🔴 PROCESS DEAD - State is ABORTED
  - 🔴 CRITICAL EXTRACTION LAG - Lag > 1800 seconds (30 min)
  - 🔴 MEMORY EXHAUSTION (SPILLING) - Memory > 95%
  - 🟡 FLOW CONTROL (BACKPRESSURE) - State is PAUSED
  - 🟡 LATENCY DETECTED - Lag > 300 seconds (5 min)
  - 🟡 HIGH MEMORY LOAD - Memory > 80%
  - 🟢 IDLE & CURRENT - Lag < 60 seconds and waiting
  - 🟢 ACTIVE - Normal operation
- 🔧 Updated LAG_SEC thresholds (1800/300 instead of 1000/500)
- 🔧 Updated MEM_UTIL_PCT thresholds (95/80 instead of just 95)

**4. Check Apply Process Memory Usage**
- ✨ New `READER_HEALTH_STATUS` column - Reader process health:
  - 🔴 STREAMS POOL EXHAUSTED - Waiting for memory
  - 🔴 MEMORY CRITICAL (SPILLING) - Memory > 95%
  - 🟡 STRIIM BACKPRESSURE (CLIENT SLOW) - Waiting for client
  - 🟡 HIGH MEMORY USAGE - Memory > 80%
  - 🟡 PROCESS STARTING - Initializing state
  - 🟢 DATA FLOWING - Dequeuing messages
  - 🟢 IDLE - Normal idle state
- 🔧 Removed `INST_ID` column for simplicity
- 🔧 Simplified query structure

**5. Check Streams Pool Memory Usage**
- ✨ New `POOL_HEALTH_STATUS` column - Pool capacity health:
  - 🔴 MEMORY EXHAUSTION (DANGER) - Usage > 95%
  - 🔴 CRITICAL FREE SPACE - Free space < 50 MB
  - 🟡 HIGH UTILIZATION (MONITOR) - Usage > 80%
  - 🟡 POOL MAY BE TOO SMALL FOR OJET - Total < 512 MB
  - 🟢 HEALTHY BUFFER - Normal operation
- 🎨 Color-coded all metrics (total, free, usage percentage)

### 🎨 UI/UX Improvements
- **Multi-Column Colorization**: Health status, metrics, and state columns all color-coded
- **Consistent Color Scheme**: Pure red (#ff0000) for critical, pure yellow (#ffff00) for warnings
- **Optimized Table Layout**: Reduced font sizes (11px table, 9px headers) and padding (6px 8px)
- **Better Space Utilization**: Compact tables fit more data on screen without scrolling

### 📚 Documentation Updates
- **Updated Column Descriptions**: All health status columns documented
- **Threshold Documentation**: Clear explanation of all warning and critical thresholds
- **Health Check Analysis**: Updated guides for new diagnostic capabilities

### 🔧 Technical Improvements
- **Subquery Pattern**: All enhanced queries use subqueries for cleaner CASE logic
- **Consistent Thresholds**: Standardized thresholds across all queries
- **Frontend-Backend Sync**: Query display matches executed query exactly
- **Enhanced Error Detection**: More comprehensive state and metric checking

### 📦 Deployment
- **Release Package**: `OJET_Troubleshooter_v1.4.0.zip`
- **Backward Compatible**: All existing features continue to work
- **No Breaking Changes**: Existing queries enhanced, not replaced

---

## Version 1.3.0 (February 5, 2026)

🎯 **Major Update: OJET Queries Feature with Comprehensive Documentation**

### 🆕 New Features

#### 📊 OJET Queries Page
- **New Dedicated Page**: Execute useful Oracle queries for monitoring OJET processes
- **7 Pre-configured Queries** covering capture status, data transport, memory usage, and transactions

#### 📖 Interactive Documentation
- **Expandable Column Descriptions**: Each query includes detailed column explanations
- **Health Metrics Guide**: Built-in troubleshooting tips and health indicators
- **Visual Alerts**: Color-coded warnings and notes for important states
- **SQL Query Display**: View the actual SQL being executed

#### 🎨 Optimized Table Display
- **Space-efficient Columns**: Dynamic column widths based on content
- **Compact Design**: Reduced padding and font sizes for better space utilization
- **Consistent Styling**: Uniform appearance across all query results
- **Tooltips**: Hover over truncated content to see full values

### 🎨 UI/UX Improvements
- **Database Icon**: New icon for OJET Queries in navigation
- **Credential Persistence**: Database credentials saved in browser localStorage
- **Collapsible Sections**: Documentation and SQL queries in expandable accordions
- **Professional Tables**: Clean, modern table design with alternating row colors

### 📚 Documentation Enhancements
- **OJET_QUERIES_GUIDE.md**: Comprehensive guide for all 7 queries
- **DEPLOYMENT_GUIDE.md**: Complete deployment instructions for customers
- **Column Descriptions**: Detailed explanations for every column in each query
- **Troubleshooting Tips**: Built-in guidance for common issues

### 🔧 Technical Improvements
- **7 New API Endpoints**: Backend endpoints for each OJET query
- **Connection Pooling**: Efficient database connection management
- **Error Handling**: Comprehensive error messages and recovery
- **Query Optimization**: Efficient SQL queries for minimal database impact

### 📦 Deployment
- **Deployment Package Script**: Automated package creation for customer delivery
- **Verification Script**: Installation verification tool included
- **Multiple Formats**: Both .tar.gz and .zip packages with checksums

---

## Version 1.2.1 (January 21, 2026)

🎨 **UI/UX Enhancements, Monitor Page Improvements & Simplified Scripts**

### 🆕 New Features

#### 🔍 Monitor Page Enhancements
- **Integrated `mon` Command**: Executes automatically with `show` commands when clicking "Start Monitoring"
- **Filtered Metrics Display**: Shows only 9 critical metrics from `mon` command:
  - Last Event Position
  - Last Event Read Age
  - Latest Activity
  - Memory Usage Apply Session
  - Memory Usage Capture Session
  - Memory Usage LogMiner Session
  - Memory Usage Streams Pool
  - Read Timestamp
  - Timestamp
- **Smart Default Values**: All form fields have intelligent defaults (localhost, admin, OJET_SOURCE)
- **Visual Feedback**: Fields display in gray for default values, black when modified

### 🎨 UI/UX Improvements
- **Better Information Hierarchy**: Documentation links moved to top of Dashboard pages
- **Cleaner Interface**: Removed redundant sections from Monitor page
- **Consistent Form Styling**: Port field uses placeholder instead of pre-filled value
- **Visual Distinction**: Clear difference between default and user-modified values

### 🛠️ Scripts Consolidation
- **Simplified Startup**: `start.sh` now runs in background mode by default
- **Immediate Control**: Returns terminal control after starting services
- **Removed Redundancy**: Eliminated `start-background.sh` (merged into `start.sh`)

### 🐛 Bug Fixes
- Fixed `mon` command showing all fields instead of filtered subset
- Fixed inconsistent form field styling across pages
- Fixed port field appearing in bold instead of as placeholder

---

## Version 1.2.0 (January 20, 2026)

🎉 **Major Update: Validation Downstream, Multi-Database Support & Enhanced Stability**

### 🆕 New Features

#### 🔄 Validation Downstream Dashboard
- **Dual Database Support**: New "Validation Downstream" page with two independent database connections
  - Primary DB connection (for production/source database)
  - Downstream DB connection (for downstream/replica database)
- **8 Validation Checks**: All checks from Validation PROD plus new downstream-specific checks
  - Existing Dictionary Dumps in Primary DB
  - Take Dictionary Dump in Primary DB
  - Table Instantiation in Primary DB
  - SCN Validation in Downstream DB
  - Open Transactions in Primary DB
  - Check Other DB Values in Primary DB
  - Check Other DB Values in Downstream DB
- **Smart Connection Routing**: Each check automatically uses the correct database connection
- **Persistent Credentials**: Database credentials persist when navigating between pages

#### 🗄️ Multi-Database Connection Pool System
- **Independent Connection Pools**: Backend maintains separate connection pools for each database
- **Connection Pool Map**: Efficient management of multiple simultaneous database connections
- **Automatic Pool Reuse**: Reuses existing pools for the same database configuration
- **Memory Efficient**: Pools are properly closed when no longer needed

#### 🔒 Enhanced Security & Stability
- **Graceful Shutdown**: Automatic cleanup of all database connections on application exit
  - Handles SIGTERM, SIGINT (Ctrl+C), SIGHUP signals
  - Closes all Oracle connection pools properly
  - Prevents orphaned database connections
- **Browser Close Detection**: Automatically closes connections when browser/tab is closed
  - Uses `navigator.sendBeacon` for reliable cleanup
  - Fallback to axios for older browsers
- **Password Autocomplete Prevention**: Added `autoComplete="new-password"` to all password fields
  - Prevents Chrome "Check your saved password" popup
  - Improves user experience when navigating between pages

#### 🌐 Improved Striim Integration
- **URL Cleanup**: Automatically removes trailing slashes from Striim URLs
- **Enhanced Error Messages**: Detailed error diagnostics for connection issues
  - Network connectivity errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
  - Authentication errors with specific guidance
  - Server reachability checks before authentication
- **Detailed Logging**: Comprehensive request/response logging for troubleshooting

### 🔧 Improvements

#### User Interface
- **3-Row Grid Layout**: Validation Downstream checks organized in 3 rows for better visibility
- **Color-Coded Cards**: Different colors for Primary DB (blue) and Downstream DB (purple) checks
- **Enhanced Warning Messages**: SCN validation warnings now more prominent with ⚠️ emoji
- **Responsive Design**: Maintains 3-column grid layout with proper breakpoints

#### Backend Enhancements
- **Connection String Keying**: Connection pools keyed by unique connection string
- **Error Handling**: Improved error messages with actionable suggestions
- **Health Check Endpoint**: `/api/health` for monitoring backend status
- **Cleanup Endpoint**: `/api/cleanup` for graceful connection cleanup

#### Code Quality
- **Modular Architecture**: Separate components for each dashboard
- **State Management**: Lifted state to App.jsx for persistence
- **Props Drilling**: Clean prop passing through component hierarchy
- **Error Boundaries**: Robust error handling throughout the application

### 🐛 Bug Fixes
- **Fixed**: Striim URL with trailing slash causing 404 errors
- **Fixed**: Database credentials lost when navigating between pages
- **Fixed**: Chrome password manager popup appearing on navigation
- **Fixed**: Connection pools not being closed on application exit
- **Fixed**: Single global pool causing all checks to use last connected database

### 📚 Documentation Updates
- Updated README.md with new Validation Downstream features
- Updated MONITOR_GUIDE.md with enhanced error handling information
- Added detailed inline code comments for complex logic
- Improved troubleshooting sections

### 🔄 Migration Notes
- **No Breaking Changes**: Existing Validation PROD functionality unchanged
- **New Page**: Access "Validation Downstream" from navigation menu
- **Backward Compatible**: All existing features work as before
- **Database Permissions**: Same permissions required as v1.1.0

---

## Version 1.1.0 (January 19, 2026)

🎉 **Major Update: Real-Time Monitoring & Enhanced Documentation**

### 🆕 New Features

#### 📊 Real-Time OJET Monitoring
- **Striim REST API Integration**: Monitor OJET sources remotely via Striim REST API
- **4 Automated Commands**: Status, Status Details, Memory, and Memory Details
- **ASCII Table Output**: Clean, formatted tables with intelligent text wrapping (30 char max width)
- **Persistent Configuration**: Form values saved in localStorage for convenience
- **Authentication**: Secure token-based authentication with Striim server

#### 📖 Enhanced Command Reference
- **Detailed Field Explanations**: Comprehensive explanations for all Status and Memory fields
- **State Examples**: Detailed examples for PROPAGATION_STATE and CaptureState
- **Formatted Documentation**: Indented, easy-to-read format with proper line breaks
- **12+ Field Descriptions**: Including LOG_MINER, CAPTURE, APPLY, STREAMS, and more

### 🔧 Improvements
- **Text Wrapping Algorithm**: Smart wrapping at word boundaries, `$`, and `_` characters
- **Table Formatting**: Optimized column width for better readability
- **Documentation Updates**: All MD files updated with new features
- **New Documentation**: Added MONITOR_GUIDE.md and DOCUMENTATION_INDEX.md

---

## Version 1.0.0 (January 19, 2026)

🎉 **First stable release of OJET Troubleshooter**

### 🎯 Overview

OJET Troubleshooter is a professional web application for diagnosing and validating Oracle OJET (Oracle Job for Extracting Transactions). This tool provides automated checks, corrective actions, and comprehensive troubleshooting guides for Oracle database administrators and engineers.

---

### ✨ Features

#### 🔍 Automated Validations (6 Categories)
- **Dictionary Dumps**: LogMiner dictionary file verification
- **Table Instantiation**: Validation of tables prepared for CDC
- **SCN Validation**: SCN consistency for dumps and tables
- **Open Transactions**: Identification of long-running open transactions
- **Database Parameters**: Critical database configuration checks
- **Connection Testing**: Oracle database connectivity validation

#### 🔧 Automated Corrective Actions
- **Build Dictionary**: One-click execution of `DBMS_LOGMNR_D.BUILD`
- **Prepare Tables**: One-click execution of `DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION`
- Confirmation dialogs before execution
- Detailed result feedback and error handling

#### 📚 Comprehensive Documentation
- **Troubleshooting Guide**: Common problems with step-by-step solutions
- **Command Reference**: OJET commands with examples, field explanations, and copy-to-clipboard
- **Table Management**: Guides for adding/removing tables
- **Monitor Guide**: Real-time monitoring via Striim REST API
- **Remote Access**: GCP, AWS, and VPS deployment instructions

#### 🌐 Remote Access Support
- Configured for external connections (binds to 0.0.0.0)
- GCP firewall configuration examples
- AWS security group setup instructions
- SSH tunneling and reverse proxy guidance

---

### 🛠️ Technology Stack

**Frontend:**
- React 18
- Vite (build tool)
- Axios (HTTP client)
- Lucide React (icons)

**Backend:**
- Node.js
- Express
- Oracle Database driver (oracledb)

---

### 📦 Installation

#### Quick Start
```bash
# Extract the package
unzip OJET_Troubleshooter_v1.0.0.zip

# Navigate to directory
cd OJET_Troubleshooter

# Run setup
chmod +x setup.sh
./setup.sh

# Start the application
./start.sh
```

#### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

For remote access: http://<SERVER_IP>:3000

---

### 📋 Requirements

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Oracle Database**: Access to Oracle database with appropriate permissions
- **Operating System**: Linux, macOS, or Windows (with WSL)

---

### 🔒 Security Notes

- The package does NOT include `node_modules` (installed via setup.sh)
- No `.env` files included (create from `.env.example`)
- No sensitive data or credentials in the package
- Recommended to use SSH tunneling or reverse proxy for production

---

### 📚 Documentation

Included documentation files:
- **README.md** - Project overview and features
- **INSTALLATION.md** - Installation guide
- **DOCUMENTATION_INDEX.md** - Documentation navigation guide
- **MONITOR_GUIDE.md** - Real-time monitoring guide
- **OJET_QUERIES_GUIDE.md** - OJET Queries reference
- **REMOTE_ACCESS.md** - GCP/AWS/VPS deployment
- **RELEASE_NOTES.md** - Version history

---

### 🐛 Known Issues

None reported in this release.

---

### 🙏 Credits

**Author**: Diego Pafumi - Striim Senior Field Engineer

---

### 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub:
https://github.com/dpafumi/OJET_Troubleshooter/issues

---

### 📄 License

This project is provided as-is for Oracle OJET troubleshooting and diagnosis.

