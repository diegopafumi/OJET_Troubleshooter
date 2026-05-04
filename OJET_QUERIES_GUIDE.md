# 📊 OJET Queries Guide

This guide explains how to use the **Ojet Queries** feature to execute useful Oracle queries for monitoring OJET capture, outbound, and transport processes.

---

## 🎯 Overview

The Ojet Queries feature allows you to:
- Connect to an Oracle database directly
- Execute pre-configured monitoring queries for OJET processes
- View formatted results in tables with color-coded health indicators
- Monitor capture status, outbound pipeline, memory usage, and SCN tracking
- Identify long-running transactions with session mapping (USERNAME, MACHINE)
- Troubleshoot OJET performance issues with built-in documentation

---

## 🚀 Quick Start

### 1. Navigate to Ojet Queries Page
- Open the OJET Troubleshooter application
- Click on **"Ojet Queries"** in the navigation bar

### 2. Configure Database Connection
Fill in the Oracle database connection details in the sidebar:
- **Host**: The hostname or IP address of your Oracle database
- **Port**: The Oracle listener port (default: 1521)
- **SID / Service Name**: Your Oracle database SID or service name
- **Username**: Database username with appropriate privileges
- **Password**: Database password

### 3. Connect to Database
- Click **"Connect to Database"**
- Wait for the connection confirmation message
- The credentials are saved in your browser for convenience

### 4. Execute Queries
- Browse the available query cards
- Click **"View SQL Query"** to see the actual SQL being executed
- Click **"Execute Query"** to run the query
- View results in the formatted table below each query

---

## 📋 Available Queries (10 Total)

### 1. Recovery Checkpoint and SCN Tracking
**Purpose**: Monitor how far the capture process checkpoint is behind the current captured SCN

**Key Metrics**:
- CAPTURE_NAME - Name of the capture process
- CAPTURED_SCN - Highest SCN captured
- APPLIED_SCN - Highest SCN applied by downstream client
- CAPTURED_APPLY_DIFF - Gap between captured and applied SCNs (downstream latency)
- REQUIRED_CHECKPOINT_SCN - Oldest SCN needed for redo log retention
- CHECKPOINT_GAP - Difference between CAPTURED_SCN and REQUIRED_CHECKPOINT_SCN
- CHECKPOINT_HEALTH - 🟡 STALE CHECKPOINT (gap > 2M) or 🟢 CHECKPOINT MOVING

**Use Case**: Identify long-running transactions preventing checkpoint advancement and redo log purging

---

### 2. Check Capture Process Status (Extraction Process)
**Purpose**: Monitor the capture process status, latency, SCN progression, and extraction health

**Key Metrics**:
- CAPTURE_NAME, STATUS, ERROR_MESSAGE
- START_SCN, CAPTURED_SCN, APPLIED_SCN, CAPTURED_APPLY_DIFF
- STATUS_CHECK - Multi-tier health indicator (🔴 ABORTED/CRITICAL LAG, 🟡 BACKLOGGED, 🟢 HEALTHY)

**Use Case**: Monitor overall health, progress, and latency of extraction processes

---

### 3. Interested LCR (Capture Process Memory Usage)
**Purpose**: Monitor filtering efficiency — shows how many captured messages are actually interested (enqueued) vs. discarded

**Key Metrics**:
- CAPTURE_NAME, STATE, LAG_SEC, MEM_UTIL_PCT
- TOTAL_CAPTURED, TOTAL_ENQUEUED, DIFF_CAPTURE_ENQ
- ENGINE_HEALTH_STATUS - Comprehensive engine health indicator

**Use Case**: Identify memory pressure, spilling, and filtering efficiency

---

### 4. Outbound Server (Dispatcher)
**Purpose**: Monitor the complete OJET pipeline from capture to outbound server

**Key Metrics**:
- PIPELINE - Combined capture → outbound name
- CAP_STATE, OUT_STATE - Current states of capture and outbound
- ENQUEUED, SENT, IN_TRANSIT - LCR counts and gap
- LAG_SEC - Capture latency in seconds
- MB_SENT, LAST_MSG - Data volume and last sent timestamp (DD-MON HH24:MI:SS)
- OUTBOUND_HEALTH - Multi-tier 5-priority health logic:
  1. 🔴 RED: SERVER DOWN (ABORTED/DISABLED)
  2. 🔴 RED: CRITICAL LAG (> 1800s)
  3. 🟡 YELLOW: STRIIM IS SLOW / BOTTLENECK
  4. 🟡 YELLOW: HIGH LAG (> 300s) / HUGE BACKLOG (> 500k)
  5. 🟢 GREEN: HEALTHY (IDLE) / DATA FLOWING

**Use Case**: End-to-end pipeline monitoring — identifies crashes, lag, bottlenecks, and backpressure

---

### 5. Long Running Transactions & Errors
**Purpose**: Identify long-running transactions blocking replication with session mapping

**Key Metrics**:
- USERNAME - Oracle database user executing the transaction
- MACHINE - Hostname/IP of the client machine
- TRANSACTION_ID - Unique transaction ID (XIDUSN.XIDSLOT.XIDSQN)
- TOTAL_MESSAGE_COUNT - LCRs pending (🔴 > 100k, 🟡 > 10k)
- START_TIME - When the first change was captured (YYYY-MM-DD HH24:MI:SS)

**Use Case**: Identify WHO and FROM WHERE is causing replication blocks. JOINs `v$xstream_transaction` with `v$transaction` and `v$session`.

---

### 6. Check Data Transport (Downstream Status)
**Purpose**: Monitor data transport and propagation receiver status

**Key Metrics**:
- INST_ID, HIGHEST_MESS_SCN_RECEIVED, HIGHEST_MESS_ACKNOWLEDGE_TO_SENDER
- UNACKNOWLEDGED_SCN_GAP, STATE
- NETWORK_HEALTH_STATUS - Multi-tier network health indicator

**Use Case**: Identify bottlenecks in data propagation and check for acknowledgment lag

---

### 7. Check Streams Pool Memory Usage
**Purpose**: Monitor overall streams pool allocation and usage

**Key Metrics**:
- STREAM_POOL_TOTAL_MB, STREAM_POOL_FREE_MB, STREAM_POOL_USAGE_PCT
- POOL_HEALTH_STATUS - 🔴 EXHAUSTION (> 95%), 🟡 HIGH UTILIZATION (> 80%), 🟢 HEALTHY

**Use Case**: Determine if streams_pool_size needs to be increased

---

### 8. Check Database Memory Parameters
**Purpose**: View key Oracle memory configuration parameters

**Parameters Shown**:
- sga_target, sga_max_size, shared_pool_size, large_pool_size
- streams_pool_size, memory_max_target, memory_target, db_cache_size

**Use Case**: Review current memory configuration and plan adjustments

---

### 9. Finding "Holes" on Arch Log Shipping
**Purpose**: Identify missing archive log sequences (gaps) in registered archive logs

**Key Metrics**:
- THREAD#, SEQUENCE# - Log sequence tracking
- Detects gaps that could prevent capture from advancing

**Use Case**: Find missing archive logs that may block LogMiner and capture process

---

### 10. Archive Logs Safe to Delete
**Purpose**: Identify which archive logs can be safely deleted based on capture checkpoint

**Key Metrics**:
- Archive log details with registration and checkpoint status
- Shows last 100 logs for analysis

**Use Case**: Safe cleanup of archive logs without breaking capture process

---

## 🔍 Interpreting Results

### Memory Utilization
- **< 70%**: Healthy
- **70-90%**: Monitor closely
- **> 90%**: Consider increasing memory allocation

### Capture States
- **CAPTURING CHANGES**: Normal operation
- **WAITING FOR REDO**: Idle, waiting for new changes
- **PAUSED FOR FLOW CONTROL**: Memory pressure or slow consumer
- **WAITING FOR TRANSACTION**: Waiting for LogMiner

### Propagation States
- **WAITING FOR MESSAGE FROM PROPAGATION SENDER**: Normal, catching up
- **RECEIVING LCRS**: Actively receiving data
- **WAITING FOR MEMORY**: Memory pressure - increase streams_pool_size

---

## 💡 Best Practices

1. **Regular Monitoring**: Execute these queries regularly to establish baselines
2. **Compare Metrics**: Compare CAPTURED_SCN vs APPLIED_SCN to measure lag
3. **Memory Tuning**: Use memory queries to proactively adjust Oracle parameters
4. **Transaction Analysis**: Monitor long-running transactions that may impact performance

---

## 🔒 Security Notes

1. **Credentials**: Stored in browser localStorage (client-side only)
2. **Permissions**: User must have SELECT privileges on V$ and DBA_ views
3. **Network**: Ensure network connectivity to Oracle database

---

## 🐛 Troubleshooting

### Cannot Connect to Database
**Error**: "Connection failed"

**Solutions**:
- Verify host, port, and SID are correct
- Check network connectivity to database
- Ensure user has appropriate privileges
- Verify Oracle listener is running

### Query Returns No Results
**Possible Causes**:
- No OJET processes are running
- User lacks privileges on system views
- Database is not configured for OJET/Streams

### ORA-00942: table or view does not exist
**Solution**: User needs SELECT privileges on V$ and DBA_ views

---

## 📚 Related Documentation

- [Confluence: Ojet Show Commands and Queries](https://webaction.atlassian.net/wiki/spaces/CSE/pages/2937978994/Ojet+Show+Commands+and+Queries)
- [Monitor Guide](MONITOR_GUIDE.md) - For Striim-based monitoring
- [Installation Guide](INSTALLATION.md) - Setup instructions

