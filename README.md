# OJET Troubleshooter

**Version 1.5.0** - May 4, 2026

This is an application for technical diagnosis and validation of Oracle OJET.

## 🎯 Features

### 📄 Multiple Pages
- **OJET Validation PROD**: Technical validation dashboard with 6 automated checks for production database
- **OJET Validation Downstream**: Dual-database validation dashboard with 8 checks for primary/downstream scenario
- **OJET Troubleshooting**: Common problems and solutions guide
- **Show Commands**: OJET command reference with examples and field explanations
- **Add/Remove Tables**: Step-by-step guides for table management
- **Monitor**: Real-time monitoring of OJET sources via Striim REST API
- **Ojet Queries**: Pre-configured Oracle queries for OJET monitoring and troubleshooting
- **Monitor_Ojet.sh**: Standalone bash script for command-line monitoring (no web interface needed)

### 🔍 Technical Validations

#### Validation PROD (Primary Database Config)
- **Oracle Connection**: Sidebar for database credentials
- **6 Validation Categories**:
  - **Dictionary Dumps**: LogMiner dictionary file verification
  - **Table Instantiation**: Validation of tables prepared for CDC
  - **SCN Validation**: SCN consistency for dumps and tables
  - **Open Transactions**: Identification of long-running open transactions
  - **Check Other DB Values**: Critical database parameters and configuration

#### Validation Downstream (Primary/Downstream Config)
- **Two Independent Database Connections**:
  - Primary DB
  - Downstream DB
- **8 Validation Categories** with smart connection routing:
  - **Existing Dictionary Dumps in Primary DB** → Uses Primary DB
  - **Take Dictionary Dump in Primary DB** → Uses Primary DB
  - **Table Instantiation in Primary DB** → Uses Primary DB
  - **SCN Validation in Downstream DB** → Uses Primary DB (compares with Downstream)
  - **Open Transactions in Primary DB** → Uses Primary DB
  - **Check Other DB Values in Primary DB** → Uses Primary DB
  - **Check Other DB Values in Downstream DB** → Uses Downstream DB
- **Persistent Credentials**: Database credentials saved when navigating between pages
- **Color-Coded Cards**: Blue for Primary DB checks, Purple for Downstream DB checks

### 🔧 Automated Corrective Actions
- **Build Dictionary**: Executes `DBMS_LOGMNR_D.BUILD` to create dictionary dumps
- **Prepare Tables**: Executes `DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION` to prepare tables
- **Smart Database Routing**: Automatically uses the correct database connection for each action
- Confirmation before execution
- Detailed result feedback

### 🗄️ Multi-Database Support
- **Independent Connection Pools**: Backend maintains separate connection pools for each database
- **Automatic Pool Management**: Reuses existing pools, creates new ones as needed
- **Graceful Shutdown**: Automatically closes all database connections on exit
  - Handles Ctrl+C, SIGTERM, SIGHUP signals
  - Closes connections when browser/tab is closed
  - Prevents orphaned database connections
- **Memory Efficient**: Proper cleanup and resource management

### 🛠️ Integrated Troubleshooting
- Documented common problems
- Diagnostic commands
- Step-by-step solutions
- SQL examples with syntax

### 📚 Command Reference
- OJET commands organized by category
- Practical examples
- Sample outputs with ASCII tables
- Detailed field explanations for Status and Memory commands
- Copy to clipboard function

### 📊 Real-Time Monitoring
- **Striim REST API Integration**: Connect to Striim server to monitor OJET sources
- **Automated Commands**: Execute status and memory commands via API
- **Persistent Configuration**: Form values saved in localStorage for convenience
- **ASCII Table Output**: Clean, formatted tables with text wrapping (30 characters max width)
- **Enhanced Error Handling**: Detailed diagnostics for connection issues
  - Network connectivity errors (ECONNREFUSED, ETIMEDOUT, ENOTFOUND)
  - Authentication errors with specific guidance
  - Automatic URL cleanup (removes trailing slashes)
- **4 Monitoring Commands**:
  - `show <source> status` - General status information
  - `show <source> status details` - Detailed status with SCN and metrics
  - `show <source> memory` - Memory usage summary
  - `show <source> memory details` - Detailed memory breakdown with explanations

### 🧮 OJET Estimated Parameters Calculator
- **Capacity Planning Tool**: Available at the bottom of Validation PROD and Validation Downstream pages
- **Inputs**: Average Row Length (bytes) and number of Row Changes per Transaction
- **Calculated Outputs** (updated in real-time):
  - **Raw Data Size (GB)**: Total capture data volume estimate
  - **Min STREAMS_POOL_SIZE (GB)**: Minimum recommended `streams_pool_size` Oracle parameter (Raw Data × 1.10)
  - **TransactionBufferSpilloverCount**: Recommended Striim parameter (Row Changes × 1.25)
  - **TransactionAgeSpilloverLimit**: Fixed value of 8,000 (covers ~2 hours of transactions)
- **Tooltip Documentation**: ⓘ icons explain each field and formula source

### 📊 OJET Queries
- **Direct Oracle Database Queries**: Execute pre-configured queries for OJET monitoring
- **Pre-configured Queries**:
  1. **Recovery Checkpoint and SCN Tracking** - Checkpoint gap and downstream latency
  2. **Check Capture Process Status** - Extraction health and SCN progression
  3. **Interested LCR** - Capture filtering efficiency and memory usage
  4. **Outbound Server (Dispatcher)** - End-to-end pipeline with multi-tier health logic
  5. **Long Running Transactions & Errors** - Session mapping (USERNAME, MACHINE)
  6. **Check Data Transport** - Propagation receiver and network health
  7. **Check Streams Pool Memory Usage** - Pool allocation and utilization
  8. **Check Database Memory Parameters** - Oracle memory configuration
  9. **Finding "Holes" on Arch Log Shipping** - Missing archive log sequences
  10. **Archive Logs Safe to Delete** - Safe archive log cleanup
- **Interactive Documentation**: Expandable column descriptions and health metrics for each query
- **Color-Coded Health Indicators**: Automatic 🔴/🟡/🟢 status for quick diagnosis
- **Credential Persistence**: Database credentials saved in browser localStorage

## 🛠️ Technology Stack

### Frontend
- React 18
- Vite (build tool)
- Axios (HTTP client)
- Lucide React (icons)

### Backend
- Node.js
- Express
- Oracle Database driver (oracledb)
- CORS

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **Oracle Instant Client** installed on the system
3. **Oracle Database** with access to system views (v$archived_log, dba_capture_prepared_tables, etc.)

### Oracle Instant Client Installation

**macOS:**
```bash
brew install instantclient-basic
```

**Linux:**
```bash
# Download from Oracle website
# https://www.oracle.com/database/technologies/instant-client/downloads.html
```

## 🚀 Installation

### Quick Setup (Recommended)

```bash
cd OJET_Troubleshooter
chmod +x setup.sh
./setup.sh
```

The setup script will automatically:
- ✅ Check prerequisites (Node.js, npm)
- ✅ Install all dependencies
- ✅ Create configuration files
- ✅ Make scripts executable

### Manual Setup

If you prefer manual installation:

#### 1. Install Backend dependencies
```bash
cd backend
npm install
```

#### 2. Install Frontend dependencies
```bash
cd ../frontend
npm install
```

#### 3. Configure environment variables (Backend)
```bash
cd ../backend
cp .env.example .env
# Edit .env if necessary (default port: 3001)
```

#### 4. Make scripts executable
```bash
cd ..
chmod +x start.sh stop.sh restart.sh
```

## ▶️ Execution

### Quick Start (Recommended)

```bash
./start.sh
```

This will start both backend and frontend servers **in background mode**, returning terminal control immediately.

**URLs:**
- **Frontend (Web App)**: http://localhost:3000
- **Backend API**: http://localhost:3001

**To stop:**
```bash
./stop.sh
```

**To restart:**
```bash
./restart.sh
```

**To view logs:**
```bash
tail -f logs/backend.log   # Backend logs
tail -f logs/frontend.log  # Frontend logs
```

### Manual Execution

If you prefer to run servers separately:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# API server will run on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Web application will run on http://localhost:3000
```

## 📖 Usage

### Navigation
The application has 7 main pages accessible from the top navigation bar:
- **Validation PROD**: Technical validations for production database (single database)
- **Validation Downstream**: Technical validations for downstream scenarios (dual database)
- **Troubleshooting**: Common problems and solutions
- **Show Commands**: OJET command reference with field explanations
- **Add/Remove Tables**: Step-by-step guides for table management
- **Monitor**: Real-time OJET source monitoring via Striim REST API
- **Ojet Queries**: Pre-configured Oracle queries for OJET monitoring and troubleshooting

### Page: OJET Validation PROD

1. **Connect to Database**:
   - Enter credentials in the left sidebar
   - Host, Port (1521), SID, Username, Password
   - Click on "Connect to Database"

2. **Run Validations**:
   - Each card represents a validation category
   - For "Table Instantiation" and "SCN Validation": enter required parameters
   - Click on "Run Check" to execute the SQL query
   - View results in table format

3. **View SQL Queries**:
   - Click on "Show SQL Query" to see the exact query
   - All queries are based on the official OJET PDF

4. **🔧 Execute Corrective Actions**:
   - After running a validation, if problems are detected
   - Click on the corresponding action button (e.g., "Build Dictionary", "Prepare Tables")
   - Confirm the action in the confirmation dialog
   - View the detailed operation result
   - Re-run the validation to verify the problem is resolved

### Page: OJET Validation Downstream

1. **Connect to Primary Database**:
   - Enter credentials in the first connection form (Primary DB)
   - Host, Port (1521), SID, Username, Password
   - Click on "Connect to Primary DB"

2. **Connect to Downstream Database**:
   - Enter credentials in the second connection form (Downstream DB)
   - Host, Port (1521), SID, Username, Password
   - Click on "Connect to Downstream DB"

3. **Run Validations**:
   - Each card shows which database it uses (Primary or Downstream)
   - Blue cards use Primary DB connection
   - Purple cards use Downstream DB connection
   - Enter required parameters for each check
   - Click on "Run Check" to execute the SQL query
   - View results in table format

4. **Persistent Credentials**:
   - Database credentials are saved when you navigate to other pages
   - Return to this page without re-entering credentials
   - Credentials persist until you disconnect or close the browser

5. **🔧 Execute Corrective Actions**:
   - Same as Validation PROD
   - Actions automatically use the correct database connection

### Page: OJET Troubleshooting

1. **Explore Common Problems**:
   - Each card shows a known problem
   - Read the problem reason
   - Review diagnostic commands
   - Follow step-by-step solutions

2. **Copy Commands**:
   - SQL commands are formatted and ready to copy
   - Includes practical examples

### Page: Show Commands

1. **Browse Commands**:
   - Commands organized by category (General Information, Memory, etc.)
   - Each command includes description, example, and expected output

2. **Field Explanations**:
   - Detailed explanations for each field in Status and Memory commands
   - Examples of different states (e.g., PROPAGATION_STATE, CaptureState)
   - Indented, easy-to-read format

3. **Copy to Clipboard**:
   - Click on the copy icon next to each command
   - Visual confirmation when copied

### Page: Monitor

1. **Configure Striim Connection**:
   - Enter Striim URL (e.g., `http://10.142.0.20:9080`)
   - Enter username and password
   - Values are automatically saved in localStorage

2. **Configure Source**:
   - Enter namespace (e.g., `admin`)
   - Enter OJET Source Name (e.g., `OJET_SOURCE`)

3. **Monitor Source**:
   - Click "Monitor Source" to execute all 4 commands
   - View results in formatted ASCII tables
   - Tables automatically wrap text at 30 characters for readability

4. **Persistent Values**:
   - All form values are saved automatically
   - Navigate to other pages and return without re-entering data


## 🔐 Security

- Credentials are NOT stored on disk (browser localStorage only for convenience)
- Connection is established via connection pools in the backend
- Multiple independent connection pools for different databases
- Automatic cleanup of all connections on application exit
- Parameter validation before executing queries

---

## 📝 Important Notes

1. **Oracle user must have SELECT permissions on:**
   - `v$archived_log`, `v$database`, `v$parameter`, `v$xstream_capture`
   - `v$xstream_outbound_server`, `v$xstream_transaction`, `v$transaction`, `v$session`
   - `dba_capture`, `dba_capture_prepared_tables`, `dba_xstream_outbound`
   - `gv$transaction`, `gv$propagation_receiver`, `global_name`

2. **Default Ports:**
   - Frontend: `3000`
   - Backend: `3001`
   - These can be changed in `backend/.env` and `frontend/vite.config.js`

## 🐛 Troubleshooting

**Error: "ORA-12154: TNS:could not resolve the connect identifier"**
- Verify that Oracle Instant Client is installed
- Verify SID/Service Name format

**Error: "Connection pool not initialized"**
- Make sure to connect first using the sidebar
- Verify that the backend is running

## 👥 Author

Diego Pafumi - Striim Senior Field Engineer
