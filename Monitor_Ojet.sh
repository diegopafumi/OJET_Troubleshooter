#!/bin/bash

# Validate that the connection string was provided
if [ -z "$1" ]; then
  echo "❌ Error: Connection string is missing."
  echo "💡 Usage: $0 user/password@TNS_ALIAS"
  exit 1
fi

CONNECTION_STRING=$1

# Generate log file name with timestamp (e.g., ojet_health_20260313_202744.txt)
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_DIR="." 
LOG_FILE="${LOG_DIR}/ojet_health_${TIMESTAMP}.txt"

echo "=========================================================================="
echo "🚀 STARTING XSTREAM (OJET) MONITORING DASHBOARD"
echo "🕒 Date and Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📄 Saving a copy of the report to: ${LOG_FILE}"
echo "=========================================================================="
# Set NLS_LANG to support UTF-8 Emojis in SQL*Plus
export NLS_LANG=AMERICAN_AMERICA.AL32UTF8

# The quotes around "EOF" prevent Bash from stripping the $ signs from Oracle views
sqlplus -s "$CONNECTION_STRING" <<"EOF" | tee -a "$LOG_FILE"

-- Terminal environment configuration
-- Prevents SQL*Plus from asking for variables when it sees an & symbol
SET DEFINE OFF
-- Increasing to 400 to have more space
SET LINESIZE 400
SET PAGESIZE 200
-- Clean up spaces at the end of each line
SET TRIMSPOOL ON
SET TRIMOUT ON
-- Avoid breaking up lines
SET WRAP OFF           
SET FEEDBACK OFF
SET VERIFY OFF
SET HEADING ON


PROMPT 
PROMPT =====================================================================
PROMPT 1. CAPTURE PROCESS STATUS (Extraction Process)
PROMPT =====================================================================
PROMPT Validating capture process status, read latency, and data volume.

COL capture_name    FOR a45           HEAD 'Capture_Name'
COL status          FOR a10           HEAD 'Status'
COL state           FOR a30           HEAD 'Real-Time State'
COL lag_sec         FOR 999,999       HEAD 'Lag (s)'
COL captured_scn    FOR 9999999999999 HEAD 'Captured_SCN'
COL applied_scn     FOR 9999999999999 HEAD 'Applied_SCN'
COL scn_diff        FOR 999,999,999   HEAD 'CAPT_APPLY Diff'
COL tot_lcr         FOR 999,999,999   HEAD 'Total_LCR'
COL redo_mined_mb   FOR 999,999       HEAD 'Redo_Mined(MB)'
COL capture_health  FOR a30           HEAD 'Capture Health'
COL error           FOR a30           HEAD 'Error Message'

SELECT  
    cp.capture_name,
    cp.status,
    vc.state,
    ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) AS lag_sec,
    cp.captured_scn,
    cp.applied_scn,
    (cp.captured_scn - cp.applied_scn) AS scn_diff,
    vc.total_messages_captured AS tot_lcr,
    ROUND(vc.bytes_of_redo_mined / 1024 / 1024) AS redo_mined_mb,
    CASE 
        -- 1. Check for fatal crashes or stopped processes
        WHEN cp.status IN ('ABORTED', 'DISABLED') THEN '🔴 RED: PROCESS ' || cp.status
        WHEN cp.error_message IS NOT NULL THEN '🔴 RED: ERROR DETECTED'
        -- 2. Check for severe latency (Math: Capture Time - Create Time)
        WHEN ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) > 1800 THEN '🔴 RED: CRITICAL LAG'
        WHEN ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) > 300 THEN '🟡 YELLOW: HIGH LAG'
        -- 3. Check physical state
        WHEN vc.state = 'WAITING FOR TRANSACTION' THEN '🟢 GREEN: HEALTHY (IDLE)'
        ELSE '🟢 GREEN: HEALTHY (ACTIVE)'
    END AS capture_health,
    substr(cp.error_message,1,35) as error
FROM dba_capture cp
LEFT JOIN v$xstream_capture vc ON cp.capture_name = vc.capture_name
ORDER BY ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) DESC;


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 2. CAPTURE PROCESS MEMORY & HEALTH (Interested LCRs)
PROMPT =====================================================================
PROMPT Displaying memory usage and health status of the capture engine.

COL capture_name         FOR a45 HEAD 'Capture Name'
COL engine_health_status FOR a40 HEAD 'Engine Health Status'

SELECT
    CAPTURE_NAME,
    TOTAL_MESSAGES_CAPTURED, 
    total_messages_enqueued AS total_enqueued,
    diff_capture_enq,
    ALLOCATED_MB,
    USED_MB,
    MEM_UTIL_PCT,
    LAG_SEC,
    CASE
        WHEN STATE = 'ABORTED' THEN '🔴 RED: PROCESS DEAD'
        WHEN LAG_SEC > 1800 THEN '🔴 RED: CRITICAL EXTRACTION LAG'
        WHEN MEM_UTIL_PCT > 95 THEN '🔴 RED: MEMORY EXHAUSTION (SPILLING)'
        WHEN STATE = 'PAUSED' THEN '🟡 YELLOW: FLOW CONTROL (BACKPRESSURE)'
        WHEN LAG_SEC > 300 THEN '🟡 YELLOW: LATENCY DETECTED'
        WHEN MEM_UTIL_PCT > 80 THEN '🟡 YELLOW: HIGH MEMORY LOAD'
        WHEN LAG_SEC < 60 AND STATE LIKE 'WAITING%' THEN '🟢 GREEN: IDLE and CURRENT'
        ELSE '🟢 GREEN: ACTIVE'
    END AS ENGINE_HEALTH_STATUS
FROM (
    SELECT CAPTURE_NAME, STATE, TOTAL_MESSAGES_CAPTURED, total_messages_enqueued,
           (total_messages_captured - total_messages_enqueued) AS diff_capture_enq,
           ROUND(SGA_ALLOCATED / 1024 / 1024, 2) AS ALLOCATED_MB,
           ROUND(SGA_USED / 1024 / 1024, 2) AS USED_MB,
           ROUND((SGA_USED / NULLIF(SGA_ALLOCATED, 0)) * 100, 2) AS MEM_UTIL_PCT,
           -- FIXED: Lag based on message creation time, not sysdate (Prevents False Positives)
           ROUND((CAPTURE_TIME - CAPTURE_MESSAGE_CREATE_TIME) * 86400) AS LAG_SEC
    FROM V$XSTREAM_CAPTURE
);


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 3. OUTBOUND SERVER STATUS (Dispatcher / Pipeline)
PROMPT =====================================================================
PROMPT Queue balance: Enqueued messages vs Messages sent to Striim.

COL pipeline        FOR a45 HEAD 'Pipeline (Outbound)'
COL outbound_health FOR a35 HEAD 'Outbound Health'
COL cap_state       FOR a25 HEAD 'Capture_State'
COL out_state       FOR a20 HEAD 'Outbound State'
COL enqueued        FOR 999,999,999 HEAD 'Enqueued LCR'
COL sent            FOR 999,999,999 HEAD 'Sent LCR'
COL in_transit      FOR 999,999 HEAD 'In Transit (Gap)'
COL mb_sent         FOR 999,999 HEAD 'MB Sent'
COL last_msg        FOR a16 HEAD 'Last Sent'

SELECT 
    vo.server_name AS pipeline,
    vc.state AS cap_state,
    vo.state AS out_state,
    vc.total_messages_enqueued AS enqueued,
    vo.total_messages_sent AS sent,
    (vc.total_messages_enqueued - vo.total_messages_sent) AS in_transit,
    ROUND(vo.bytes_sent / 1024 / 1024) AS mb_sent,
    ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) AS lag_sec,
    TO_CHAR(vo.last_sent_message_create_time, 'DD-MON HH24:MI:SS') AS last_msg,
    CASE
        -- 1. Hard Crashes
        WHEN vo.state IN ('ABORTED', 'DISABLED') THEN '🔴 RED: SERVER DOWN'
        -- 2. Critical Latency
        WHEN ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) > 1800 THEN '🔴 RED: CRITICAL LAG'
        -- 3. Communication Bottlenecks (Striim/Network is slow)
        WHEN vo.state = 'WAITING FOR CLIENT' THEN '🟡 YELLOW: STRIIM IS SLOW'
        WHEN vo.state = 'FLOW CONTROL' THEN '🟡 YELLOW: BOTTLENECK / BACKPRESSURE'
        -- 4. Creeping Latency or Massive Backlog
        WHEN ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) > 300 THEN '🟡 YELLOW: HIGH LAG'
        WHEN (vc.total_messages_enqueued - vo.total_messages_sent) > 500000 AND vo.state != 'IDLE' THEN '🟡 YELLOW: HUGE BACKLOG'
        -- 5. Everything is fine
        WHEN vo.state = 'IDLE' THEN '🟢 GREEN: HEALTHY (IDLE)'
        ELSE '🟢 GREEN: DATA FLOWING'
    END AS outbound_health    
FROM v$xstream_capture vc
JOIN dba_xstream_outbound dxo ON vc.capture_name = dxo.capture_name
JOIN v$xstream_outbound_server vo ON dxo.server_name = vo.server_name;


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 4. DATA TRANSPORT HEALTH (Propagation Receiver)
PROMPT =====================================================================
PROMPT Network latency and packet delivery health (High Watermark).

COL highest_mess_scn_received          FOR a16 HEAD 'Received SCN'
COL highest_mess_acknowledge_to_sender FOR a16 HEAD 'Ack SCN'
COL unacknowledged_scn_gap             FOR 999,999,999 HEAD 'SCN Gap'
COL network_health_status              FOR a35 HEAD 'Network Health'
COL state                              FOR a45 HEAD 'Current State'

SELECT
    TO_CHAR(HIGH_WATER_MARK) AS HIGHEST_MESS_SCN_RECEIVED,
    TO_CHAR(ACKNOWLEDGEMENT) AS HIGHEST_MESS_ACKNOWLEDGE_TO_SENDER,
    (HIGH_WATER_MARK - ACKNOWLEDGEMENT) AS UNACKNOWLEDGED_SCN_GAP,
    STATE,
    CASE
        -- 1. Critical hardware/client errors go first
        WHEN STATE LIKE '%Waiting for Memory%' THEN '🔴 RED: MEMORY PRESSURE'
        WHEN STATE LIKE '%Waiting for Client%' THEN '🟡 YELLOW: DOWNSTREAM BUSY'       
        -- 2. If it's idle and waiting for the sender, it is HEALTHY (Ignore the phantom gap)
        WHEN STATE = 'Waiting for message from propagation sender' THEN '🟢 GREEN: HEALTHY (IDLE)'
        -- 3. If it is NOT idle, then we DO evaluate the mathematical network lag
        WHEN (HIGH_WATER_MARK - ACKNOWLEDGEMENT) > 150000 THEN '🔴 RED: CRITICAL BACKLOG'
        WHEN (HIGH_WATER_MARK - ACKNOWLEDGEMENT) > 80000 THEN '🟡 YELLOW: NETWORK LATENCY'
        -- 4. If it's actively processing and the gap is under 80k
        WHEN STATE IN ('Waiting for message', 'Processing message') THEN '🟢 GREEN: HEALTHY (ACTIVE)'
        ELSE '⚪ UNKNOWN STATE'
    END AS NETWORK_HEALTH_STATUS
FROM GV$PROPAGATION_RECEIVER;


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 5. STREAMS POOL EXHAUSTION (Global RAM Buffer)
PROMPT =====================================================================
PROMPT Validating free space in the shared memory (Streams Pool).

COL stream_pool_total_mb  FOR 999,999 HEAD 'Total MB'
COL stream_pool_free_mb   FOR 999,999 HEAD 'Free MB'
COL stream_pool_usage_pct FOR 999.99  HEAD 'Usage %'
COL pool_health_status    FOR a40     HEAD 'Pool Health Status'

SELECT
    STREAM_POOL_TOTAL_MB,
    STREAM_POOL_FREE_MB,
    STREAM_POOL_USAGE_PCT,
    CASE
        WHEN STREAM_POOL_USAGE_PCT > 95 THEN '🔴 RED: MEMORY EXHAUSTION (DANGER)'
        WHEN STREAM_POOL_FREE_MB < 50 THEN '🔴 RED: CRITICAL FREE SPACE'
        WHEN STREAM_POOL_USAGE_PCT > 80 THEN '🟡 YELLOW: HIGH UTILIZATION (MONITOR)'
        WHEN STREAM_POOL_TOTAL_MB < 512 THEN '🟡 YELLOW: POOL MAY BE TOO SMALL'
        ELSE '🟢 GREEN: HEALTHY BUFFER'
    END AS POOL_HEALTH_STATUS
FROM (
    SELECT ROUND(CURRENT_SIZE / 1024 / 1024, 2) AS STREAM_POOL_TOTAL_MB,
           ROUND((CURRENT_SIZE - TOTAL_MEMORY_ALLOCATED) / 1024 / 1024, 2) AS STREAM_POOL_FREE_MB,
           ROUND((TOTAL_MEMORY_ALLOCATED / NULLIF(CURRENT_SIZE, 0)) * 100, 2) AS STREAM_POOL_USAGE_PCT
    FROM V$STREAMS_POOL_STATISTICS
);


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 6. LONG RUNNING TRANSACTIONS (Safety Net)
PROMPT =====================================================================
PROMPT Alert: Identifies who is running massive transactions blocking buffer flush (> 1000 LCRs).

COL username            FOR a20 HEAD 'DB User'
COL machine             FOR a30 HEAD 'Machine / Host'
COL transaction_id      FOR a20 HEAD 'Transaction ID'
COL total_message_count FOR 999,999,999 HEAD 'LCRs Pending'
COL start_time          FOR a25 HEAD 'Start Time'

SELECT
    s.username,
    s.machine,
    xt.transaction_id,
    xt.total_message_count,
    TO_CHAR(xt.first_message_time, 'YYYY-MM-DD HH24:MI:SS') AS start_time
FROM v$xstream_transaction xt
JOIN v$transaction t ON xt.transaction_id = t.xidusn || '.' || t.xidslot || '.' || t.xidsqn
JOIN v$session s ON t.ses_addr = s.saddr
WHERE xt.total_message_count > 1000;


PROMPT 
PROMPT =====================================================================
PROMPT 7. SCN TRACKING & RECOVERY CHECKPOINT (Log Retention Anchor)
PROMPT =====================================================================
PROMPT Evaluates checkpoint progression and detects stuck transactions holding logs.

COL capture_name             FOR a45           HEAD 'Capture_Name'
COL status                   FOR a10           HEAD 'Status'
COL captured_scn             FOR 9999999999999 HEAD 'Captured_SCN (NOW)'
COL oldest_scn               FOR 9999999999999 HEAD 'Oldest_Open_SCN (Open_TX)'
COL required_checkpoint_scn  FOR 9999999999999 HEAD 'Req_Checkpoint'
COL checkpoint_gap           FOR 9999999999999 HEAD 'Checkpoint_Gap'
COL checkpoint_health        FOR a35           HEAD 'Checkpoint_Health'

SELECT 
    capture_name,
    status,
    captured_scn,
    oldest_scn,
    required_checkpoint_scn,
    (captured_scn - required_checkpoint_scn) AS checkpoint_gap,
    CASE 
        -- 1. Hard crashes hide here if we don't catch them
        WHEN status IN ('ABORTED', 'DISABLED') THEN '🔴 RED: PROCESS DEAD (LOGS STUCK)'
        -- 2. Massive gap (Logs are piling up)
        WHEN (captured_scn - required_checkpoint_scn) > 5000000 THEN '🔴 RED: SEVERE CHECKPOINT LAG'
        -- 3. Warning gap (Long transaction pending)
        WHEN (captured_scn - required_checkpoint_scn) > 2000000 THEN '🟡 YELLOW: STALE CHECKPOINT (LONG TXN)'
        -- 4. Healthy
        ELSE '🟢 GREEN: CHECKPOINT MOVING'
    END AS checkpoint_health
FROM dba_capture;
--where client_status = 'ATTACHED';


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 8. RECOVERY CHECKPOINT & MISSING LOG DETECTOR
PROMPT =====================================================================
PROMPT Alert: Identifies exactly where the capture process is anchored.

COL capture_name             FOR a45 HEAD 'Capture Name'
COL required_checkpoint_scn  FOR 9999999999999 HEAD 'Required_SCN'
COL log_status               FOR a25 HEAD 'Log Anchor Status'
COL file_needed              FOR a65 HEAD 'File Needed / Warning'

WITH req_logs AS (
    SELECT 
        c.capture_name,
        c.status,
        c.required_checkpoint_scn,
        (SELECT MIN(first_change#) FROM v$log) AS min_online_scn,
        MAX(a.name) AS log_name
    FROM dba_capture c
    LEFT JOIN v$archived_log a 
      ON c.required_checkpoint_scn >= a.first_change# 
      AND c.required_checkpoint_scn < a.next_change#
      AND a.standby_dest = 'NO'
      AND a.deleted = 'NO'
    GROUP BY c.capture_name, c.status, c.required_checkpoint_scn
)
SELECT 
    capture_name,
    required_checkpoint_scn,
    CASE 
        WHEN status IN ('ABORTED', 'DISABLED') AND log_name IS NULL AND required_checkpoint_scn < min_online_scn THEN '💀 FATAL: LOG PURGED'
        WHEN status IN ('ABORTED', 'DISABLED') THEN '🔴 ABORTED (FROZEN)'
        WHEN log_name IS NOT NULL THEN '🟡 NEEDS ARCHIVE LOG'
        WHEN required_checkpoint_scn >= min_online_scn THEN '🟢 ONLINE REDO (SAFE)'
        ELSE '⚪ UNKNOWN STATE'
    END AS log_status,
    CASE 
        -- If process is dead but SCN is still in Online Redo:
        WHEN status IN ('ABORTED', 'DISABLED') AND log_name IS NULL AND required_checkpoint_scn >= min_online_scn 
             THEN '⚠️ WARNING: In Active Redo. Restart process ASAP!'
        -- If process is dead and SCN was purged by RMAN:
        WHEN status IN ('ABORTED', 'DISABLED') AND log_name IS NULL AND required_checkpoint_scn < min_online_scn 
             THEN '🚨 FATAL: Required log sequence was deleted by RMAN!'
        -- If an Archive Log was found (for any status):
        WHEN log_name IS NOT NULL THEN log_name
        -- If process is healthy and in Online Redo:
        ELSE 'Active in Online Redo Log (No action needed)'
    END AS file_needed
FROM req_logs
ORDER BY required_checkpoint_scn ASC;


PROMPT 
PROMPT 
PROMPT =====================================================================
PROMPT 🏁 END OF REPORT - Check local file for history.
PROMPT =====================================================================

EXIT;
EOF

