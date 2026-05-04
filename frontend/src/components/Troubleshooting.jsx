import { AlertTriangle, Wrench, Terminal, TrendingUp, Database, Activity, XCircle, RefreshCw } from 'lucide-react'

function Troubleshooting() {
  const issues = [
    {
      id: 1,
      title: 'Read lag is increasing',
      icon: TrendingUp,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      reason: `OJET uses database server 'STREAMS_POOL_SIZE' area of SGA to buffer the uncommitted changes. In case of huge transactions or lots of open transactions of significant numbers, this memory could be under pressure and results in frequent disk spillover.`,
      diagnosis: {
        command: `show <Ojet_Source> memory <details> ;`,
        description: 'The command will return:',
        results: [
          { status: 'Normal', description: 'when OJET is not waiting for memory' },
          { status: 'Under pressure', description: 'when current usage exceeds 90% of allocated size' }
        ],
        note: 'The current used and allocated size of memory will be shown'
      },
      solution: {
        title: 'How to fix?',
        description: 'Increase the STREAMS_POOL_SIZE value.',
        command: `alter system set streams_pool_size={SIZE}G;`,
        example: `alter system set streams_pool_size=2G;`
      }
    },
    {
      id: 2,
      title: 'SpillCount is Increasing',
      icon: Database,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      reason: `Messages are being saved to disk (SYSAUX Tablespace) instead of memory. This indicates that the STREAMS_POOL_SIZE is insufficient for the current workload, or there are large transactions causing spillover.`,
      diagnosis: {
        command: `show <Ojet_Source> status;`,
        description: 'Check the SpillCount value:',
        results: [
          { status: 'Increasing', description: 'SpillCount is growing, indicating disk spillover' },
          { status: 'Stable', description: 'SpillCount is not changing, memory is sufficient' }
        ],
        note: 'Monitor SpillCount over time to identify trends'
      },
      solution: {
        title: 'How to fix?',
        description: 'Increase memory allocation and buffer settings.',
        command: `-- Increase streams_pool_size on source database
alter system set streams_pool_size={SIZE}G;

-- Increase MAX_SGA_SIZE for the application
-- Increase TransactionBufferSpilloverCount to 300k`,
        example: `alter system set streams_pool_size=4G;`
      }
    },
    {
      id: 3,
      title: 'No events are captured',
      icon: XCircle,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      reason: `OJET processes committed transactions only. Long-running transactions will not be available to Striim before the actual database commit. This can also occur if table instantiation was not completed successfully.`,
      diagnosis: {
        command: `show <Ojet_Source> status <details>;`,
        description: 'Check the following metrics:',
        results: [
          { status: 'REDO_MINED', description: 'Should show increasing values (bytes mined since capture started)' },
          { status: 'CAPTURE_TIME', description: 'Should show increasing values (time scanning redo logs)' },
          { status: 'SPILL_COUNT', description: 'Verify if spilling is happening (large transactions)' }
        ],
        note: 'Also check: show <source> opentransactions for huge transactions'
      },
      solution: {
        title: 'How to fix?',
        description: 'Verify table instantiation was completed successfully.',
        command: `SELECT table_Name
FROM DBA_CAPTURE_PREPARED_TABLES
WHERE TABLE_OWNER = '<owner_name>';

-- If table is missing, prepare it:
BEGIN
  DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION(
    table_name => '<schema>.<table>',
    supplemental_logging => 'NONE',
    container => 'CURRENT'
  );
END;`,
        example: `SELECT table_Name FROM DBA_CAPTURE_PREPARED_TABLES WHERE TABLE_OWNER = 'HR';`
      }
    },
    {
      id: 4,
      title: 'Initial changes captured after big delay',
      icon: Activity,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      reason: `Unexpected large number of archive logs are being mined. This can happen when there are stale/old deployments, or the dictionary dump is not recent.`,
      diagnosis: {
        command: `show <Ojet_Source> status <details> ;`,
        description: 'Check the capture state:',
        results: [
          { status: 'CAPTURE_STATE', description: 'Shows if waiting for event or processing archive log' },
          { status: 'Processing old logs', description: 'OJET is scanning through old archive logs' }
        ],
        note: 'Check if there are multiple OJET deployments using setupOJet.sh'
      },
      solution: {
        title: 'How to fix?',
        description: 'Clean up old deployments and ensure recent dictionary build.',
        command: `-- Use setupOJet.sh to check deployments
-- Remove/cleanup stale deployments via setupOjet.sh
-- Ensure there is a recent dictionary build
-- For local capture, start without START_SCN to auto-build dictionary`,
        example: `./setupOJet.sh --list
./setupOJet.sh --cleanup <old_deployment>`
      }
    },
    {
      id: 5,
      title: 'MISSING multi-version data dictionary in Alert,log File',
      icon: AlertTriangle,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      reason: `Table Instantiation was not executed, or was executed before BUILD, or after the table was added to the OJET App. This can cause missing records on the target.`,
      diagnosis: {
        command: `-- Check Oracle alert.log for errors
-- Get table names from object IDs
SELECT owner||'.'||object_name
FROM dba_objects
WHERE object_id IN (<object_ids>);

--Now use above object id to run second query and get its output. 
select o.LOGMNR_UID,global_name,ownername,lvl0name,baseobj#, start_scn 
from system.logmnrc_gtlo o,system.logmnrc_dbname_uid_map m 
where m.logmnr_uid=o.logmnr_uid 
  AND baseobj# in (<object_ids>);
  
--Now see whether those tables were some of the tables for which data was not captured( as per Mon outputs)
--Please make sure they have dictionary dump created under CDB . 
--Then undeploy -> redeploy -> start the app and see if it will capture data from all the tables.`,
        description: 'Identify problematic tables from alert.log:',
        results: [
          { status: 'Error in alert.log', description: 'knllgobjinfo: MISSING multi-version data dictionary!!!' },
          { status: 'Missing records', description: 'Data not captured for specific tables' }
        ],
        note: 'Check if dictionary dump was created under CDB'
      },
      solution: {
        title: 'How to fix?',
        description: 'Undeploy, redeploy, and restart the app. If issue persists, use previous dictionary build.',
        command: `-- Undeploy -> Redeploy -> Start app
-- If still failing, configure use_previous_dict_build
OJetConfig: '{"OJET":["use_previous_dict_build:1"]}'`,
        example: `-- This will use previous dictionary dump instead of latest
-- Example: Start SCN 2050 will use dump at 1AM instead of 5AM`
      }
    },
    {
      id: 6,
      title: 'ORA-26914: Unable to communicate with OJet',
      icon: XCircle,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      reason: `Unable to communicate with OJetServer capture process. 
      Possible reasons: 
      - Insufficient memory 
      - Network issues 
      - SYSAUX tablespace full.
      - OJET may be unable to find the required dictionary build.`,
      diagnosis: {
        command: `-- Check if dictionary build exists at SCN
SELECT MAX(FIRST_CHANGE#)
FROM V$ARCHIVED_LOG
WHERE DICTIONARY_BEGIN = 'YES'
  AND STATUS = 'A'
  AND STANDBY_DEST = 'NO'
  AND FIRST_CHANGE# <= <SCN>;`,
        description: 'Verify dictionary build availability:',
        results: [
          { status: 'No rows returned', description: 'Dictionary build not found at specified SCN' },
          { status: 'SCN returned', description: 'Dictionary build exists' }
        ],
        note: 'Check SYSAUX tablespace usage and network connectivity'
      },
      solution: {
        title: 'How to fix?',
        description: 'Ensure dictionary build exists and system resources are available.',
        command: `-- Check SYSAUX tablespace
SELECT tablespace_name,
       ROUND(used_space*8192/1024/1024/1024,2) used_gb,
       ROUND(tablespace_size*8192/1024/1024/1024,2) size_gb
FROM dba_tablespace_usage_metrics
WHERE tablespace_name = 'SYSAUX';`,
        example: `-- If SYSAUX is full, add datafile or resize existing`
      }
    },
    {
      id: 7,
      title: 'DBMS_LOGMNR_D.BUILD hangs',
      icon: AlertTriangle,
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      reason: `Dictionary build process is hanging, usually due to blocking sessions or locks on system tables.`,
      diagnosis: {
        command: `SELECT CAPTURE_NAME, STATUS FROM DBA_CAPTURE;`,
        description: 'Check for blocking sessions:',
        results: [
          { status: 'Capture exists', description: 'Old capture process may be blocking' },
          { status: 'No capture', description: 'Safe to proceed with build' }
        ],
        note: 'Check for locks on SYSTEM tables'
      },
      solution: {
        title: 'How to fix?',
        description: 'Drop blocking capture process and rebuild dictionary.',
        command: `-- 1. Kill the Capture blocking session
BEGIN
  dbms_capture_adm.drop_capture('<capture_name>', TRUE);
END;
/

-- 2. Start dictionary build again (on CDB)
exec DBMS_LOGMNR_D.BUILD(OPTIONS => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS);

-- 3. Get dump SCN and start new OJET from this SCN`,
        example: `BEGIN
  dbms_capture_adm.drop_capture('STRIIM$C$OLD_CAPTURE', TRUE);
END;
/`
      }
    },
    {
      id: 8,
      title: 'OJET Restart SCN is not moving',
      icon: RefreshCw,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      reason: `The RecoverySCN (Restart SCN) is not moving even though the app is capturing events. This is a known Oracle bug that occurs with specific database version combinations.

Example scenario:
- Primary database Version: 19.29.0.0.0 (38322923)
- Downstream database Version: 21.20.0.0.251021

Oracle Support (SR 4-0001826122) identified this as Bug 18228645 - XStream capture REQUIRED_CHECKPOINT_SCN does not change (KI15056).`,
      diagnosis: {
        command: `-- Check if Restart SCN is stuck
show <Ojet_Source> status <details>;

-- Verify capture is working but SCN not moving
SELECT CAPTURE_NAME, STATUS, REQUIRED_CHECKPOINT_SCN
FROM DBA_CAPTURE;`,
        description: 'Symptoms of this issue:',
        results: [
          { status: 'REQUIRED_CHECKPOINT_SCN', description: 'Not changing/moving forward' },
          { status: 'Events captured', description: 'App is capturing events normally' },
          { status: 'Version mismatch', description: 'Primary DB 19.x and Downstream DB 21.x' }
        ],
        note: 'This is Bug 18228645: XSTREAM CAPTURE REQUIRED_CHECKPOINT_SCN DOES NOT CHANGE'
      },
      solution: {
        title: 'How to fix?',
        description: 'Restart the apply process on the downstream database. The OJET app will stop automatically and needs to be restarted manually.',
        command: `-- 1. Stop Apply process in Downstream DB
BEGIN
  DBMS_APPLY_ADM.STOP_APPLY(apply_name => '<ojet_source_name>');
END;
/

-- 2. Start Apply process in Downstream DB
BEGIN
  DBMS_APPLY_ADM.START_APPLY(apply_name => '<ojet_source_name>');
END;
/

-- 3. OJET App will stop automatically
-- 4. Start app manually from Striim UI
-- 5. Restart SCN will now move (both in APP and DB Capture)
-- 6. App starts capturing events normally`
      }
    },
    {
      id: 9,
      title: 'Archive Log Shipping Issues - OJET Waiting for Redo on DOWNSTREAM',
      icon: Database,
      iconBg: '#dbeafe',
      iconColor: '#3b82f6',
      reason: `The OJET application shows "WAITING FOR REDO: FILE NA" status, indicating that archive log files are not being shipped properly from the Primary database to the Downstream database. This is commonly caused by connection issues between the Primary and Downstream databases, or missing/unregistered archive log files on the Downstream side.`,
      diagnosis: {
        command: `-- You will see the following message with status command:
show <OJET_SOURCE> status;

-- Example:
show admin.OJE_TEST status

╒═════════════════╤═════════════════╤═════════════════╤═════════════════╤════════════════════════════════╤════════════╤═════════════════╤══════════════════════╕
│ ServerStatus    │ Enqueue         │ Dequeue         │ CaptureStatus   │ CaptureState                   │ SpillCount │ Progress        │ Error                │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼────────────────────────────────┼────────────┼─────────────────┼──────────────────────┤
│ STRIIM$OJET$ADM │ STRIIM$Q$ADMIN$ │ STRIIM$Q$ADMIN$ │ STRIIM$C$ADMIN$ │ WAITING FOR REDO: FILE NA,     │ None       │ 01/21/2026 16:3 │ None                 │
│ IN$OJE_TEST is  │ OJE_TEST is ena │ OJE_TEST is ena │ OJE_TEST is ena │ THREAD 1, SEQUENCE 562, SCN 0  │            │ 8:19            │                      │
│ atached         │ bled            │ bled            │ bled            │ x0000000000f613fe              │            │                 │                      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┴────────────────────────────────┴────────────┴─────────────────┴──────────────────────┘

-- Then verify Status of Arch Log shipping on Primary DB:
SELECT DEST_ID, STATUS, GAP_STATUS, ERROR, DESTINATION
FROM V$ARCHIVE_DEST_STATUS
WHERE DEST_ID IN (1,2,3);

-- Expected output showing the issue:
DEST_ID  STATUS  GAP_STATUS       Destination                               ERROR
1        VALID                    /opt/oracle/product/19c/dbhome_1/dbs/ARCH
2        ERROR   RESOLVABLE GAP   DOWNS                                     ORA-16191: Primary log shipping client not logged on standby
3        ERROR   RESOLVABLE GAP   DOWNS                                     ORA-12541: TNS:no listener
`,
        description: 'Symptoms of this issue:',
        results: [
          { status: 'DEST_ID 2 shows ERROR', description: 'Archive log destination to Downstream is in ERROR state' },
          { status: 'ORA-16191 error', description: 'Primary log shipping client not logged on standby' },
          { status: 'OJET shows WAITING FOR REDO', description: 'Application is waiting for archive log files' }
        ],
        note: 'This issue occurs when the connection between Primary and Downstream databases is broken and/or Primary is not able to send Arch Log Files'
      },
      solution: {
        title: 'How to fix?',
        description: 'Assuming that the SYS password didn\'t change, perform the following steps:',
        command: `-- STEP 1: Reset the destination state to force a reconnection on Primary DB
ALTER SYSTEM SET LOG_ARCHIVE_DEST_STATE_2 = DEFER;
ALTER SYSTEM SET LOG_ARCHIVE_DEST_STATE_2 = ENABLE;

-- STEP 2: Validate shipping status again
-- If that is OK, check: show admin.OJE_TEST status
-- If you still see "WAITING FOR REDO:....." then:

-- 2.1: Validate that the ARCH Log files are in Downstream Location
    --Compare Arch Log files in Primary and Downstream, you should have all files

-- 2.2: If not, copy Arch log files from Primary to Downstream

-- 2.3: Validate that ownership of the files is correct on Downstream directory

-- 2.4: Connect to Downstream DB (CDB$ROOT if applicable) and Manually Register the Arch log Files to the Capture process using ALTER DATABASE REGISTER LOGFILE...... FOR <CAPTURE_PROCESS>
--Example:
ALTER DATABASE REGISTER LOGFILE '/home/oracle/FROMPROD/1_559_1218022277.dbf' FOR 'STRIIM$C$ADMIN$OJE_TEST';
ALTER DATABASE REGISTER LOGFILE '/home/oracle/FROMPROD/1_560_1218022277.dbf' FOR 'STRIIM$C$ADMIN$OJE_TEST';
ALTER DATABASE REGISTER LOGFILE '/home/oracle/FROMPROD/1_561_1218022277.dbf' FOR 'STRIIM$C$ADMIN$OJE_TEST';

-- 2.5: If it still shows "Waiting for Sequence 562," restart the Striim Capture process
    --Stop the Striim App (from the Striim UI)
    --Start the Striim App

-- HELPFUL QUERY: Gap Finder Query. Run this in Downstream DB (CDB$ROOT if applicable)
-- This identifies missing sequence numbers in archived logs
SELECT thread#, low_sequence AS "Gap Start",
       high_sequence AS "Gap End", (high_sequence - low_sequence + 1) AS "Missing Count"
FROM ( SELECT thread#, sequence# + 1 AS low_sequence, next_seq - 1 AS high_sequence
         FROM (SELECT thread#, sequence#, LEAD(sequence#) OVER (PARTITION BY thread# ORDER BY sequence#) AS next_seq
               FROM v$archived_log)
         WHERE next_seq IS NOT NULL
           AND next_seq != sequence# + 1)
ORDER BY thread#, low_sequence;

-- OR to find "Holes"
SELECT SOURCE_DATABASE, THREAD#, SEQUENCE# + 1 AS MISSING_START,
       NEXT_SEQ - 1 AS MISSING_END, (NEXT_SEQ - SEQUENCE# - 1) AS TOTAL_MISSING_IN_HOLE
FROM (SELECT DISTINCT SOURCE_DATABASE, THREAD#, SEQUENCE# ,
            LEAD(SEQUENCE#) OVER (PARTITION BY SOURCE_DATABASE, THREAD# ORDER BY SEQUENCE#) AS NEXT_SEQ
        FROM DBA_REGISTERED_ARCHIVED_LOG)
WHERE NEXT_SEQ - SEQUENCE# > 1;`
      }
    },
    {
      id: 10,
      title: 'OJet app failed with "ORA-26914: Unable to communicate with OJetServer capture process"',
      icon: XCircle,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      reason: `The OJET application fails with ORA-26914 error. 
      In the DB alert log file, it also shows: ORA-01341: LogMiner out-of-memory

This occurs when the MAX_SGA_SIZE of the capture process is set to Infinite by default, which can cause memory allocation issues.`,
      diagnosis: {
        command: `-- Check the alert log for the error
tail -f /path/to/alert_log.log | grep -i "ORA-01341\\|ORA-26914"

-- Check current MAX_SGA_SIZE setting
SELECT CAPTURE_NAME,
       SUBSTR(CAPTURE_USER, 1, 20) AS CAPTURE_USER,
       MAX_SGA_SIZE
FROM DBA_CAPTURE;`,
        description: 'Symptoms of this issue:',
        results: [
          { status: 'ORA-26914 error', description: 'Unable to communicate with OJetServer capture process' },
          { status: 'ORA-01341 in alert log', description: 'LogMiner out-of-memory error appears in database alert log' },
          { status: 'MAX_SGA_SIZE = INFINITE', description: 'Capture process has unlimited memory allocation' }
        ],
        note: 'The default MAX_SGA_SIZE setting of Infinite can cause memory management issues'
      },
      solution: {
        title: 'How to fix?',
        description: 'Configure the max_sga_size for capture and apply process in OJetConfig instead of using Infinite.',
        command: `-- Set MAX_SGA_SIZE to a specific value (e.g., 2048 MB) in OJetConfig
-- Example configuration:
OJetConfig: '{"CAPTURE":["MAX_SGA_SIZE:2048"],"APPLY":["MAX_SGA_SIZE:2048"]}',

-- After updating the configuration, restart the OJET application
-- The capture and apply processes will now use the specified memory limit`
      }
    },
    {
      id: 11,
      title: 'OJet app hangs with Apply Reader in "Waiting for memory" state',
      icon: AlertTriangle,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      reason: `Symptom:
OJet app hangs with Apply Reader in "Waiting for memory" state.

Oracle trace file showing:
knanrpeos: WARNING couldn't free enough streams pool

Cause:
Streams pool size issue during CDC replication, even after increasing the streams_pool_size. The error message "knanrpeos: WARNING couldn't free enough streams pool" is being displayed.

Oracle Bug 37621721 - XSTREAM CAPTURE PROCESS IN STATE PAUSED FOR FLOW CONTROL`,
      diagnosis: {
        command: `-- Check Apply Reader state
SELECT r.APPLY_NAME, r.STATE,  r.TOTAL_MESSAGES_DEQUEUED,
       ROUND(r.SGA_USED / 1024 / 1024, 2) AS USED_MB,
       ROUND(r.SGA_ALLOCATED / 1024 / 1024, 2) AS ALLOC_MB
FROM GV$XSTREAM_APPLY_READER r;

-- Check Streams Pool usage
SELECT ROUND(CURRENT_SIZE / 1024 / 1024, 2) AS STREAM_POOL_TOTAL_MB,
       ROUND((CURRENT_SIZE - TOTAL_MEMORY_ALLOCATED) / 1024 / 1024, 2) AS STREAM_POOL_FREE_MB,
       ROUND((TOTAL_MEMORY_ALLOCATED / NULLIF(CURRENT_SIZE, 0)) * 100, 2) AS STREAM_POOL_USAGE_PCT
FROM V$STREAMS_POOL_STATISTICS;

-- Check trace file for the warning
-- Location: $ORACLE_BASE/diag/rdbms/<db_name>/<instance_name>/trace/
grep -i "knanrpeos: WARNING" *.trc`,
        description: 'Symptoms of this issue:',
        results: [
          { status: 'Apply Reader state', description: 'Apply Reader shows "Waiting for memory" state' },
          { status: 'Trace file warning', description: 'knanrpeos: WARNING couldn\'t free enough streams pool' },
          { status: 'Streams pool exhausted', description: 'Issue persists even after increasing streams_pool_size' }
        ],
        note: 'This is caused by Oracle Bug 37621721 - XSTREAM CAPTURE PROCESS IN STATE PAUSED FOR FLOW CONTROL'
      },
      solution: {
        title: 'How to fix?',
        description: 'Apply Oracle patch 38120771 to resolve the Xstream capture flow control issue.',
        command: `-- Solution: Apply Oracle patch 38120771
-- Note: This patch is not included in any patchset currently, including 19.29

-- Steps:
-- 1. Download patch 38120771 from My Oracle Support
-- 2. Apply the patch to your Oracle database
-- 3. Restart the database and OJET application

-- Reference Support Note:
-- https://support.striim.com/hc/en-us/articles/36763952229271-OJET-HANGS-ONCE-APPLY-READER-CONSUMES-ALL-STREAMS-POOL

-- Verify patch installation:
SELECT PATCH_ID, PATCH_UID, STATUS, DESCRIPTION
FROM DBA_REGISTRY_SQLPATCH
WHERE PATCH_ID = 38120771;`
      }
    },
    {
      id: 12,
      title: 'Ojet Recovery SCN not moving due to Oracle bug',
      icon: RefreshCw,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      reason: `Problem: Observed the RecoverySCN is not changing for long period.

The min-SCN in Open transaction 11136291188463
Application RecoverySCN 11135193075254

From the above example, we can see the RecoverySCN does not change due below Oracle bug.

Bug: 34470389: XSTREAM CLIENT STOPS RETRIEVING CHANGES WITH PROPAGATION RECEIVER WAITING FOR MEMORY
Bug 18228645 - XStream capture REQUIRED_CHECKPOINT_SCN does not change`,
      diagnosis: {
        command: `-- Check Recovery SCN and open transactions
SELECT CAPTURE_NAME,
       REQUIRED_CHECKPOINT_SCN AS RECOVERY_SCN,
       CAPTURE_TIME,
       STATUS
FROM DBA_CAPTURE;

-- Check for long-running open transactions
SELECT XIDUSN || '.' || XIDSLT || '.' || XIDSQN AS TRANSACTION_ID,
       FIRST_SCN,
       CUMULATIVE_MESSAGE_COUNT,
       TOTAL_MESSAGE_COUNT
FROM V$XSTREAM_TRANSACTION
ORDER BY FIRST_SCN;

-- Check min SCN in open transactions
SELECT MIN(FIRST_SCN) AS MIN_OPEN_TRANSACTION_SCN
FROM V$XSTREAM_TRANSACTION;`,
        description: 'Symptoms of this issue:',
        results: [
          { status: 'RecoverySCN not moving', description: 'RecoverySCN remains unchanged for a long period' },
          { status: 'SCN gap detected', description: 'Min-SCN in open transaction is higher than Application RecoverySCN' },
          { status: 'Oracle bug impact', description: 'Caused by Oracle bugs 34470389 or 18228645' }
        ],
        note: 'This issue is caused by known Oracle bugs affecting XStream capture checkpoint SCN'
      },
      solution: {
        title: 'How to fix?',
        description: 'Refer to Oracle support to get fix for the bugs. Pre-requisite: Periodically take dictionary dumps using scheduled jobs.',
        command: `-- Solution: Contact Oracle support for patches related to:
-- Bug 34470389: XSTREAM CLIENT STOPS RETRIEVING CHANGES WITH PROPAGATION RECEIVER WAITING FOR MEMORY
-- Bug 18228645: XStream capture REQUIRED_CHECKPOINT_SCN does not change

-- Workaround: Refer to Support note
-- https://support.striim.com/hc/en-us/articles/38105282943767-Ojet-Recovery-SCN-not-moving-due-to-Oracle-bug`
      }
    }



  ]

  const scrollToIssue = (issueId) => {
    const element = document.getElementById(`issue-${issueId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="main-content">
      <div className="header">
        <h1>OJET Troubleshooting</h1>
        <p>Common Issues and Solutions</p>
      </div>

      {/* Index/Table of Contents */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <Terminal size={20} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Quick Index - Common Issues
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px'
        }}>
          {issues.map(issue => {
            const Icon = issue.icon
            return (
              <div
                key={issue.id}
                onClick={() => scrollToIssue(issue.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#3b82f6'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f9fafb'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: issue.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={16} color={issue.iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151',
                    lineHeight: '1.4'
                  }}>
                    {issue.id}. {issue.title}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {issues.map(issue => {
          const Icon = issue.icon
          return (
            <div
              key={issue.id}
              id={`issue-${issue.id}`}
              className="card"
              style={{ maxWidth: '100%', scrollMarginTop: '20px' }}
            >
              {/* Header */}
              <div className="card-header">
                <div className="card-icon" style={{ background: issue.iconBg }}>
                  <Icon size={24} color={issue.iconColor} />
                </div>
                <div>
                  <h3 className="card-title">{issue.title}</h3>
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <AlertTriangle size={16} color="#f59e0b" />
                  Reason
                </div>
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#6b7280',
                  margin: 0,
                  paddingLeft: '24px',
                  whiteSpace: 'pre-line'
                }}>
                  {issue.reason}
                </p>
              </div>

              {/* Diagnosis */}
              <div style={{ 
                marginBottom: '20px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <Terminal size={16} color="#2563eb" />
                  Diagnosis
                </div>
                
                <div style={{ paddingLeft: '24px' }}>
                  <div style={{
                    background: '#1f2937',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  }}>
                    <code style={{
                      color: '#10b981',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {issue.diagnosis.command}
                    </code>
                  </div>

                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                    {issue.diagnosis.description}
                  </p>

                  <ul style={{ 
                    margin: '0 0 12px 0',
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    {issue.diagnosis.results.map((result, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{result.status}</strong> - {result.description}
                      </li>
                    ))}
                  </ul>

                  <p style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    fontStyle: 'italic',
                    margin: 0
                  }}>
                    {issue.diagnosis.note}
                  </p>
                </div>
              </div>

              {/* Solution */}
              <div style={{ 
                padding: '16px',
                background: '#d1fae5',
                borderRadius: '8px',
                border: '1px solid #10b981'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#065f46'
                }}>
                  <Wrench size={16} color="#10b981" />
                  {issue.solution.title}
                </div>

                <div style={{ paddingLeft: '24px' }}>
                  <p style={{ fontSize: '13px', color: '#065f46', marginBottom: '8px' }}>
                    {issue.solution.description}
                  </p>

                  <div style={{
                    background: '#1f2937',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <code style={{
                      color: '#10b981',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {issue.solution.command}
                    </code>
                  </div>

                  {issue.solution.example && (
                    <div style={{ fontSize: '12px', color: '#065f46' }}>
                      <strong>Example:</strong>
                      <div style={{
                        background: '#1f2937',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        marginTop: '4px'
                      }}>
                        <code style={{
                          color: '#34d399',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {issue.solution.example}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Troubleshooting

