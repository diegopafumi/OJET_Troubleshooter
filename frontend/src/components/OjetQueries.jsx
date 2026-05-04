import { useState, useEffect } from 'react'
import { Database, Play, Loader, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'

function OjetQueries() {
  // Load saved values from localStorage or use defaults
  const [dbConfig, setDbConfig] = useState(() => {
    const saved = localStorage.getItem('ojet_queries_dbConfig')
    return saved ? JSON.parse(saved) : { host: '', port: '1521', sid: '', username: '', password: '' }
  })
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connectMessage, setConnectMessage] = useState('')
  const [queryResults, setQueryResults] = useState({})
  const [queryLoading, setQueryLoading] = useState({})
  const [queryErrors, setQueryErrors] = useState({})

  // Save values to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ojet_queries_dbConfig', JSON.stringify(dbConfig))
  }, [dbConfig])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setDbConfig(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Function to determine cell color based on query and column
  const getCellColor = (queryId, columnName, value) => {
    if (value === null || value === undefined || value === '-') {
      return null
    }

    const valueStr = String(value).toUpperCase()

    // Recovery Checkpoint and SCN Tracking
    if (queryId === 'checkpoint-scn') {
      // CHECKPOINT_HEALTH column - color based on emoji or text
      if (columnName === 'CHECKPOINT_HEALTH') {
        if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN')) {
          return '#00ff00' // Green
        }
      }
      // CHECKPOINT_GAP column - yellow if > 2,000,000
      if (columnName === 'CHECKPOINT_GAP') {
        const gap = parseFloat(value)
        if (!isNaN(gap) && gap > 2000000) {
          return '#ffff00' // Yellow - Stale checkpoint
        }
      }
    }

    // Check Capture Process Status
    if (queryId === 'capture-status') {
      // CAPTURE_HEALTH column - color based on emoji or text
      if (columnName === 'CAPTURE_HEALTH') {
        if (valueStr.includes('🔴') || valueStr.includes('RED')) {
          return '#ff0000' // Red
        } else if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN')) {
          return '#00ff00' // Green
        }
      }
      // STATUS column - not ENABLED
      if (columnName === 'STATUS') {
        if (valueStr !== 'ENABLED') {
          return '#ff0000' // Red - Process not enabled
        }
      }
      // ERROR column - not null
      if (columnName === 'ERROR' && value !== null && value !== '' && valueStr !== 'NULL') {
        return '#ff0000' // Red - Error detected
      }
      // LAG_SEC column - color based on value
      if (columnName === 'LAG_SEC') {
        const lagSec = parseFloat(value)
        if (!isNaN(lagSec)) {
          if (lagSec > 1800) {
            return '#ff0000' // Red - Critical lag (over 30 minutes)
          } else if (lagSec > 300) {
            return '#ffff00' // Yellow - High lag (over 5 minutes)
          }
        }
      }
      // CAPTURED_APPLY_DIFF column - no color coding
    }

    // Interested LCR (Capture Process Memory Usage)
    if (queryId === 'interested-lcr') {
      // ENGINE_HEALTH_STATUS column - color based on emoji or text
      if (columnName === 'ENGINE_HEALTH_STATUS') {
        if (valueStr.includes('🔴') || valueStr.includes('RED')) {
          return '#ff0000' // Red
        } else if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN')) {
          return '#00ff00' // Green
        }
      }
      // STATE column
      if (columnName === 'STATE') {
        if (valueStr === 'ABORTED') {
          return '#ff0000' // Red - Process dead
        } else if (valueStr === 'PAUSED') {
          return '#ffff00' // Yellow - Paused
        }
      }
      // LAG_SEC column
      if (columnName === 'LAG_SEC') {
        const lagSec = parseFloat(value)
        if (!isNaN(lagSec)) {
          if (lagSec > 1800) {
            return '#ff0000' // Red - Critical lag (over 30 minutes)
          } else if (lagSec > 300) {
            return '#ffff00' // Yellow - Latency detected (over 5 minutes)
          }
        }
      }
      // MEM_UTIL_PCT column
      if (columnName === 'MEM_UTIL_PCT') {
        const memUtil = parseFloat(value)
        if (!isNaN(memUtil)) {
          if (memUtil > 95) {
            return '#ff0000' // Red - Memory exhaustion
          } else if (memUtil > 80) {
            return '#ffff00' // Yellow - High memory load
          }
        }
      }
      // DIFF_CAPTURE_ENQ column - no color coding (removed - not a good problem detector)
      // USED_MB column
      if (columnName === 'USED_MB') {
        const memUsed = parseFloat(value)
        if (!isNaN(memUsed)) {
          if (memUsed > 5000) {
            return '#ff0000' // Red - Very high memory usage
          } else if (memUsed > 2000) {
            return '#ffff00' // Yellow - High memory usage
          }
        }
      }
      // ALLOCATED_MB column
      if (columnName === 'ALLOCATED_MB') {
        const memAlloc = parseFloat(value)
        if (!isNaN(memAlloc)) {
          if (memAlloc > 5000) {
            return '#ff0000' // Red - Very high memory allocation
          } else if (memAlloc > 2000) {
            return '#ffff00' // Yellow - High memory allocation
          }
        }
      }
    }

    // Outbound Server (Dispatcher)
    if (queryId === 'outbound-server') {
      // OUTBOUND_HEALTH column - color based on emoji or text
      if (columnName === 'OUTBOUND_HEALTH') {
        if (valueStr.includes('🔴') || valueStr.includes('RED')) {
          return '#ff0000' // Red
        } else if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN') || valueStr.includes('HEALTHY')) {
          return '#00ff00' // Green
        }
      }
      // OUT_STATE column
      if (columnName === 'OUT_STATE') {
        if (valueStr === 'ABORTED' || valueStr === 'DISABLED') {
          return '#ff0000' // Red - Outbound server crashed
        } else if (valueStr.includes('FLOW CONTROL')) {
          return '#ffff00' // Yellow - Flow control
        } else if (valueStr.includes('WAITING FOR CLIENT')) {
          return '#ffff00' // Yellow - Client slow
        }
      }
      // LAG_SEC column - color based on value
      if (columnName === 'LAG_SEC') {
        const lagSec = parseFloat(value)
        if (!isNaN(lagSec)) {
          if (lagSec > 1800) {
            return '#ff0000' // Red - Critical lag (over 30 minutes)
          } else if (lagSec > 300) {
            return '#ffff00' // Yellow - High lag (over 5 minutes)
          }
        }
      }
      // IN_TRANSIT column - color based on value (huge backlog when > 500k)
      if (columnName === 'IN_TRANSIT') {
        const inTransit = parseFloat(value)
        if (!isNaN(inTransit) && inTransit > 500000) {
          return '#ffff00' // Yellow - Huge backlog
        }
      }
    }

    // Long Running Transactions
    if (queryId === 'long-running-transactions') {
      // TOTAL_MESSAGE_COUNT column
      if (columnName === 'TOTAL_MESSAGE_COUNT') {
        const msgCount = parseFloat(value)
        if (!isNaN(msgCount)) {
          if (msgCount > 100000) {
            return '#ff0000' // Red - Huge transaction
          } else if (msgCount > 10000) {
            return '#ffff00' // Yellow - Large transaction
          }
        }
      }
    }

    // Check Streams Pool Memory Usage
    if (queryId === 'streams-pool') {
      // POOL_HEALTH_STATUS column - color based on emoji or text
      if (columnName === 'POOL_HEALTH_STATUS') {
        if (valueStr.includes('🔴') || valueStr.includes('RED')) {
          return '#ff0000' // Red
        } else if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN')) {
          return '#00ff00' // Green
        }
      }
      // STREAM_POOL_USAGE_PCT column
      if (columnName === 'STREAM_POOL_USAGE_PCT') {
        const poolUsage = parseFloat(value)
        if (!isNaN(poolUsage)) {
          if (poolUsage > 95) {
            return '#ff0000' // Red - Memory exhaustion
          } else if (poolUsage > 80) {
            return '#ffff00' // Yellow - High utilization
          }
        }
      }
      // STREAM_POOL_FREE_MB column
      if (columnName === 'STREAM_POOL_FREE_MB') {
        const freeMb = parseFloat(value)
        if (!isNaN(freeMb) && freeMb < 50) {
          return '#ff0000' // Red - Critical free space
        }
      }
      // STREAM_POOL_TOTAL_MB column
      if (columnName === 'STREAM_POOL_TOTAL_MB') {
        const totalMb = parseFloat(value)
        if (!isNaN(totalMb) && totalMb < 512) {
          return '#ffff00' // Yellow - Pool may be too small
        }
      }
    }

    // Check Data Transport (Propagation Receiver)
    if (queryId === 'propagation-receiver') {
      // NETWORK_HEALTH_STATUS column - color based on emoji or text
      if (columnName === 'NETWORK_HEALTH_STATUS') {
        if (valueStr.includes('🔴') || valueStr.includes('RED')) {
          return '#ff0000' // Red
        } else if (valueStr.includes('🟡') || valueStr.includes('YELLOW')) {
          return '#ffff00' // Yellow
        } else if (valueStr.includes('🟢') || valueStr.includes('GREEN')) {
          return '#00ff00' // Green
        }
      }
      // UNACKNOWLEDGED_SCN_GAP column - no color coding (removed - not a good problem detector)
      // STATE column - color based on state
      if (columnName === 'STATE') {
        if (valueStr.includes('Waiting for Memory')) {
          return '#ff0000' // Red - Memory pressure
        } else if (valueStr.includes('Waiting for Client')) {
          return '#ffff00' // Yellow - Downstream busy
        }
      }
    }

    // Finding "Holes" on Arch Log Shipping
    if (queryId === 'arch-log-holes') {
      // TOTAL_MISSING_IN_HOLE column - color based on number of missing logs
      if (columnName === 'TOTAL_MISSING_IN_HOLE') {
        const missingCount = parseFloat(value)
        if (!isNaN(missingCount)) {
          if (missingCount > 10) {
            return '#ff0000' // Red - Critical gap
          } else if (missingCount > 5) {
            return '#ffff00' // Yellow - Moderate gap
          } else if (missingCount > 0) {
            return '#ffa500' // Orange - Small gap
          }
        }
      }
    }

    // Archive Logs Safe to Delete
    if (queryId === 'arch-log-cleanup') {
      // ACTION column - color based on action
      if (columnName === 'ACTION') {
        if (valueStr === 'SAFE_TO_DELETE') {
          return '#90EE90' // Light green - Safe to delete
        } else if (valueStr.includes('KEEP')) {
          return '#ffff00' // Yellow - Keep, capture needs this
        }
      }
    }

    return null // No color
  }

  const handleConnect = async () => {
    setLoading(true)
    setConnectMessage('')

    // Clear all previous query results when establishing a new connection
    setQueryResults({})
    setQueryErrors({})

    try {
      const response = await axios.post('/api/test-connection', dbConfig)

      if (response.data.success) {
        setIsConnected(true)
        setConnectMessage('Connection successful!')
      } else {
        setIsConnected(false)
        setConnectMessage(response.data.message || 'Connection failed')
      }
    } catch (error) {
      setIsConnected(false)
      setConnectMessage(error.response?.data?.message || error.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setConnectMessage('')
    setQueryResults({})
    setQueryErrors({})
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && dbConfig.host && dbConfig.username && dbConfig.password) {
      handleConnect()
    }
  }

  const executeQuery = async (queryId, endpoint) => {
    if (!isConnected) {
      setQueryErrors(prev => ({ ...prev, [queryId]: 'Please connect to database first' }))
      return
    }

    setQueryLoading(prev => ({ ...prev, [queryId]: true }))
    setQueryErrors(prev => ({ ...prev, [queryId]: '' }))
    setQueryResults(prev => ({ ...prev, [queryId]: null }))

    try {
      const response = await axios.post(endpoint, dbConfig)
      
      if (response.data.success) {
        setQueryResults(prev => ({ ...prev, [queryId]: response.data.results }))
      } else {
        setQueryErrors(prev => ({ ...prev, [queryId]: response.data.message || 'Query failed' }))
      }
    } catch (error) {
      setQueryErrors(prev => ({ 
        ...prev, 
        [queryId]: error.response?.data?.message || error.message || 'Query failed' 
      }))
    } finally {
      setQueryLoading(prev => ({ ...prev, [queryId]: false }))
    }
  }

  const queries = [
    {
      id: 'checkpoint-scn',
      title: 'Recovery Checkpoint and SCN Tracking',
      description: 'Monitor how far the capture process checkpoint is behind the current captured SCN - identifies long-running transactions preventing checkpoint advancement',
      endpoint: '/api/ojet-queries/checkpoint-scn',
      query: `SELECT
    capture_name,
    captured_scn,
    applied_scn,
    (captured_scn - applied_scn) AS captured_apply_diff,
    required_checkpoint_scn,
    (captured_scn - required_checkpoint_scn) AS checkpoint_gap,
    CASE
        -- If GAP is > 2000000, checkpoint is way behind
        WHEN (captured_scn - required_checkpoint_scn) > 2000000 THEN '🟡 YELLOW: STALE CHECKPOINT (LONG TXN?)'
        ELSE '🟢 GREEN: CHECKPOINT MOVING'
    END AS checkpoint_health
FROM dba_capture
WHERE client_status = 'ATTACHED';`
    },
    {
      id: 'capture-status',
      title: 'Check Capture Process Status (Extraction Process)',
      description: 'Monitor the capture process status, latency, SCN progression, and extraction health',
      endpoint: '/api/ojet-queries/capture-status',
      query: `set linesize 300
COL capture_name         FOR a45           HEAD 'Capture Name'
COL capture_health       FOR a30           HEAD 'Capture Health'
COL status               FOR a10           HEAD 'Status'
COL state                FOR a30           HEAD 'Real-Time State'
COL lag_sec              FOR 999,999       HEAD 'Lag (s)'
COL start_scn            FOR 9999999999999 HEAD 'Start SCN'
COL captured_scn         FOR 9999999999999 HEAD 'Captured SCN'
COL applied_scn          FOR 9999999999999 HEAD 'Applied SCN'
COL captured_apply_diff  FOR 999,999,999   HEAD 'Captured_Apply_Diff'
COL tot_lcr              FOR 999,999,999   HEAD 'Total_LCR'
COL redo_mined_mb        FOR 999,999       HEAD 'Redo_Mined(MB)'
COL error                FOR a40           HEAD 'Error Message'

SELECT
    cp.capture_name,
    cp.status,
    vc.state,
    ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) AS lag_sec,
    cp.start_scn,
    cp.captured_scn,
    cp.applied_scn,
    (cp.captured_scn - cp.applied_scn) AS captured_apply_diff,
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
ORDER BY ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) DESC;`
    },
    {
      id: 'interested-lcr',
      title: 'Interested LCR ( Capture Process Memory Usage)',
      description: 'Monitor the filtering efficiency of the capture process - shows how many captured messages are actually interested (enqueued) vs. discarded',
      endpoint: '/api/ojet-queries/interested-lcr',
      query: `SELECT
    CAPTURE_NAME,
    STATE,
    TOTAL_MESSAGES_CAPTURED, total_messages_enqueued AS total_enqueued,
    diff_capture_enq,
    ALLOCATED_MB,
    USED_MB,
    MEM_UTIL_PCT,
    LAG_SEC,
    CASE
        -- 🔴 RED FLAGS
        WHEN STATE = 'ABORTED' THEN '🔴 RED: PROCESS DEAD'
        WHEN LAG_SEC > 1800 THEN '🔴 RED: CRITICAL EXTRACTION LAG'
        WHEN MEM_UTIL_PCT > 95 THEN '🔴 RED: MEMORY EXHAUSTION (SPILLING)'
        -- 🟡 YELLOW FLAGS
        WHEN STATE = 'PAUSED' THEN '🟡 YELLOW: FLOW CONTROL (BACKPRESSURE)'
        WHEN LAG_SEC > 300 THEN '🟡 YELLOW: LATENCY DETECTED'
        WHEN MEM_UTIL_PCT > 80 THEN '🟡 YELLOW: HIGH MEMORY LOAD'
        -- 🟢 GREEN
        WHEN LAG_SEC < 60 AND STATE LIKE 'WAITING%' THEN '🟢 GREEN: IDLE and CURRENT'
        ELSE '🟢 GREEN: ACTIVE'
    END AS ENGINE_HEALTH_STATUS
FROM (
    SELECT CAPTURE_NAME, STATE, TOTAL_MESSAGES_CAPTURED, total_messages_enqueued,
         -- The Difference is Messages not sent to Enqueued
         (total_messages_captured - total_messages_enqueued) AS diff_capture_enq,
           -- Memory Reserved in Streams Pool
           ROUND(SGA_ALLOCATED / 1024 / 1024, 2) AS ALLOCATED_MB,
           ---- Real Memory used for this Process
           ROUND(SGA_USED / 1024 / 1024, 2) AS USED_MB,
           ROUND((SGA_USED / NULLIF(SGA_ALLOCATED, 0)) * 100, 2) AS MEM_UTIL_PCT,
           ROUND((CAPTURE_TIME - CAPTURE_MESSAGE_CREATE_TIME) * 86400) AS LAG_SEC
    FROM V$XSTREAM_CAPTURE
);`
    },
    {
      id: 'outbound-server',
      title: 'Outbuound Server (Dispatcher)',
      description: 'Monitor the complete OJET pipeline from capture to outbound - identifies crashes, lag, bottlenecks, and backpressure',
      endpoint: '/api/ojet-queries/outbound-server',
      query: `set linesize 300
COL pipeline        FOR a45 HEAD 'Pipeline (Outbound)'
COL outbound_health FOR a35 HEAD 'Outbound Health'
COL cap_state       FOR a25 HEAD 'Capture_State'
COL out_state       FOR a20 HEAD 'Outbound State'
COL enqueued        FOR 999,999,999 HEAD 'Enqueued LCR'
COL sent            FOR 999,999,999 HEAD 'Sent LCR'
COL in_transit      FOR 999,999 HEAD 'In Transit (Gap)'
COL mb_sent         FOR 999,999 HEAD 'MB Sent'
COL last_msg        FOR a18 HEAD 'Last Sent'

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
JOIN v$xstream_outbound_server vo ON dxo.server_name = vo.server_name;`
    },
    {
      id: 'long-running-transactions',
      title: 'Long Running Transactions & Errors',
      description: 'Identify long-running transactions that may be blocking replication - Stream cannot send data until COMMIT is issued',
      endpoint: '/api/ojet-queries/long-running-transactions',
      query: `-- Checks for transactions that have been open for too long.
-- Stream cannot send data to Striim until a COMMIT is issued.
-- If a transaction is huge, it will stay in "In Transit" forever.
-- JOINs with v$transaction and v$session to identify the DB user and machine.
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
WHERE xt.total_message_count > 1000;`
    },
    {
      id: 'propagation-receiver',
      title: 'Check Data Transport (Downstream Status)',
      description: 'Monitor data transport and propagation status',
      endpoint: '/api/ojet-queries/propagation-receiver',
      query: `SELECT
    INST_ID,
    TO_CHAR(HIGH_WATER_MARK) AS HIGHEST_MESS_SCN_RECEIVED,
    TO_CHAR(ACKNOWLEDGEMENT) AS HIGHEST_MESS_ACKNOWLEDGE_TO_SENDER,
    (HIGH_WATER_MARK - ACKNOWLEDGEMENT) AS UNACKNOWLEDGED_SCN_GAP,
    STATE,
    CASE
        -- 1. Memory and client errors first (Highest priority)
        WHEN STATE LIKE '%Waiting for Memory%' THEN '🔴 RED: MEMORY PRESSURE'
        WHEN STATE LIKE '%Waiting for Client%' THEN '🟡 YELLOW: DOWNSTREAM BUSY'
        -- 2. THE FIX: If it's idle and waiting, it is GREEN regardless of the SCN GAP (Ignores Phantom Gap)
        WHEN STATE = 'Waiting for message from propagation sender' THEN '🟢 GREEN: HEALTHY (IDLE)'
        -- 3. If it is NOT idle and actively processing, THEN we check if the gap is too high
        WHEN (HIGH_WATER_MARK - ACKNOWLEDGEMENT) > 150000 THEN '🔴 RED: CRITICAL BACKLOG'
        WHEN (HIGH_WATER_MARK - ACKNOWLEDGEMENT) > 80000 THEN '🟡 YELLOW: NETWORK LATENCY'
        -- 4. If it's actively processing and the gap is low/normal
        WHEN STATE IN ('Waiting for message', 'Processing message') THEN '🟢 GREEN: HEALTHY (ACTIVE)'
        ELSE '⚪ UNKNOWN STATE'
    END AS NETWORK_HEALTH_STATUS
FROM GV$PROPAGATION_RECEIVER;`
    },
    {
      id: 'streams-pool',
      title: 'Check Streams Pool Memory Usage',
      description: 'Monitor overall streams pool allocation and usage',
      endpoint: '/api/ojet-queries/streams-pool',
      query: `SELECT
    STREAM_POOL_TOTAL_MB,
    STREAM_POOL_FREE_MB,
    STREAM_POOL_USAGE_PCT,
    CASE
        -- 🔴 RED FLAGS
        WHEN STREAM_POOL_USAGE_PCT > 95 THEN '🔴 RED: MEMORY EXHAUSTION (DANGER)'
        WHEN STREAM_POOL_FREE_MB < 50 THEN '🔴 RED: CRITICAL FREE SPACE'
        -- 🟡 YELLOW FLAGS
        WHEN STREAM_POOL_USAGE_PCT > 80 THEN '🟡 YELLOW: HIGH UTILIZATION (MONITOR)'
        WHEN STREAM_POOL_TOTAL_MB < 512 THEN '🟡 YELLOW: POOL MAY BE TOO SMALL FOR STREAM'
        -- 🟢 GREEN
        ELSE '🟢 GREEN: HEALTHY BUFFER'
    END AS POOL_HEALTH_STATUS
FROM (
    SELECT ROUND(CURRENT_SIZE / 1024 / 1024, 2) AS STREAM_POOL_TOTAL_MB,
           ROUND((CURRENT_SIZE - TOTAL_MEMORY_ALLOCATED) / 1024 / 1024, 2) AS STREAM_POOL_FREE_MB,
           ROUND((TOTAL_MEMORY_ALLOCATED / NULLIF(CURRENT_SIZE, 0)) * 100, 2) AS STREAM_POOL_USAGE_PCT
    FROM V$STREAMS_POOL_STATISTICS
);`
    },
    {
      id: 'db-memory-params',
      title: 'Check Database Memory Parameters',
      description: 'View key Oracle memory configuration parameters',
      endpoint: '/api/ojet-queries/db-memory-params',
      query: `SELECT NAME, VALUE
FROM V$PARAMETER
WHERE NAME IN ('sga_target','sga_max_size','shared_pool_size','large_pool_size',
               'java_pool_size','streams_pool_size','memory_max_target','memory_target','db_cache_size')
ORDER BY NAME;`
    },
    {
      id: 'arch-log-holes',
      title: 'Finding "Holes" on Arch Log Shipping',
      description: 'Identify missing archive log sequences (gaps) in registered archive logs',
      endpoint: '/api/ojet-queries/arch-log-holes',
      query: `SELECT
    SOURCE_DATABASE,
    THREAD#,
    SEQUENCE# + 1 AS MISSING_START,
    NEXT_SEQ - 1 AS MISSING_END,
    (NEXT_SEQ - SEQUENCE# - 1) AS TOTAL_MISSING_IN_HOLE
FROM (
    SELECT DISTINCT SOURCE_DATABASE, THREAD#, SEQUENCE# ,
           LEAD(SEQUENCE#) OVER (PARTITION BY SOURCE_DATABASE, THREAD# ORDER BY SEQUENCE#) AS NEXT_SEQ
    FROM DBA_REGISTERED_ARCHIVED_LOG
)
WHERE NEXT_SEQ - SEQUENCE# > 1;`
    },
    {
      id: 'arch-log-cleanup',
      title: 'Archive Logs Safe to Delete',
      description: 'Identify which archive logs can be safely deleted based on capture checkpoint (Last 100 logs)',
      endpoint: '/api/ojet-queries/arch-log-cleanup',
      query: `SELECT
    l.SEQUENCE#,
    l.NAME,
    l.NEXT_SCN,c.CAPTURE_NAME,
    CASE
        WHEN l.NEXT_SCN < c.REQUIRED_CHECKPOINT_SCN THEN 'SAFE_TO_DELETE'
        ELSE 'KEEP_-_CAPTURE_NEEDS_THIS'
    END AS ACTION
FROM DBA_REGISTERED_ARCHIVED_LOG l, DBA_CAPTURE c
WHERE c.CAPTURE_NAME like 'STRIIM$%'
ORDER BY l.SEQUENCE# DESC
FETCH FIRST 100 ROWS ONLY;`
    }
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar for credentials */}
      <div style={{
        width: '280px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '20px 16px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
            Connection to DB Running OJET
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Enter Oracle credentials (CDB if used)
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="host" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
              Host
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={dbConfig.host}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="localhost"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div>
            <label htmlFor="port" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
              Port
            </label>
            <input
              type="text"
              id="port"
              name="port"
              value={dbConfig.port}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="1521"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div>
            <label htmlFor="sid" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
              SID / Service Name
            </label>
            <input
              type="text"
              id="sid"
              name="sid"
              value={dbConfig.sid}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="ORCL"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={dbConfig.username}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="OJET_USER"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={dbConfig.password}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={loading || !dbConfig.host || !dbConfig.username || !dbConfig.password}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading || !dbConfig.host || !dbConfig.username || !dbConfig.password ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading || !dbConfig.host || !dbConfig.username || !dbConfig.password ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Database size={18} />
                Connect to Database
              </>
            )}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                marginTop: '8px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              <XCircle size={18} />
              Disconnect
            </button>
          )}

          {connectMessage && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: isConnected ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: isConnected ? '#065f46' : '#991b1b'
            }}>
              {isConnected ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {connectMessage}
            </div>
          )}

          {isConnected && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              backgroundColor: '#d1fae5',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#065f46',
              marginTop: '12px'
            }}>
              <CheckCircle size={16} />
              Connected to {dbConfig.host}:{dbConfig.port}/{dbConfig.sid}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
              OJET Queries
            </h1>
            <div style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '12px' }}>Ojet Components are:</p>

              <p style={{ marginBottom: '10px' }}>
                - <strong>CAPTURE PROCESS</strong> (Mine Process): This background process "mines" the Redo Logs (or Archive Logs). Checks for Interested Tables and transforms the physical change into a structured LCR (Logical Change Records)
              </p>

              <p style={{ marginBottom: '10px' }}>
                - <strong>LCR</strong> (Logical Change Records): It contains the operation type, the SCN, and the Before and After values of the columns involved in the change
              </p>

              <p style={{ marginBottom: '10px' }}>
                - <strong>STREAM POOL</strong>: Before the data leaves the database, the LCRs are stored in a specific memory area called the Streams Pool (part of the SGA). This acts as a high-speed buffer so the Capture Process doesn't have to wait for the external app to be ready.
              </p>

              <p style={{ marginBottom: '10px' }}>
                - <strong>OUTBOUND SERVER</strong> (Dispatcher): It interacts with the Streams Pool and prepares the LCRs to be sent out. It tracks which LCRs have been successfully acknowledged by the client.
              </p>

              <p style={{ marginBottom: '10px' }}>
                - <strong>PROPAGATION / TRANSFER</strong>: The Outbound Server pushes (or the client pulls) the LCRs across the network.
              </p>

              <p style={{ marginTop: '16px' }}>Execute these Queries to Monitor OJET Processes</p>
            </div>
          </div>

          {/* Query Cards */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {queries.map((query) => (
              <div
                key={query.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                    {query.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    {query.description}
                  </p>

                  {/* Column Descriptions & Health Metrics */}
                  {/* Recovery Checkpoint and SCN Tracking Documentation */}
                  {query.id === 'checkpoint-scn' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Explanation</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURE_NAME</td>
                                <td style={{ padding: '8px' }}>The name of the Capture Process.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURED_SCN</td>
                                <td style={{ padding: '8px' }}>The highest SCN that the capture process has successfully captured and processed.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>APPLIED_SCN</td>
                                <td style={{ padding: '8px' }}>The highest SCN that has been applied (consumed) by the downstream client.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURED_APPLY_DIFF</td>
                                <td style={{ padding: '8px' }}>The difference between CAPTURED_SCN and APPLIED_SCN. Shows how many SCNs have been captured but not yet applied by the downstream client. A growing gap may indicate the client is falling behind.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>REQUIRED_CHECKPOINT_SCN</td>
                                <td style={{ padding: '8px' }}>
                                  The SCN up to which the capture process can safely purge redo logs. This is held back by long-running transactions.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Key Concept:</strong> If a transaction started at SCN 1000 and is still open, the checkpoint cannot advance beyond SCN 1000, even if the capture process has already captured up to SCN 5000.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CHECKPOINT_GAP</td>
                                <td style={{ padding: '8px' }}>
                                  <strong>🎯 PRIMARY METRIC</strong> - The difference between CAPTURED_SCN and REQUIRED_CHECKPOINT_SCN. Shows how far behind the checkpoint is.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 Warning:</strong> Gap &gt; 2,000,000 indicates a stale checkpoint, likely caused by a long-running transaction preventing redo log purging.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CHECKPOINT_HEALTH</td>
                                <td style={{ padding: '8px' }}>
                                  Overall health status based on the checkpoint gap:
                                  <ul style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                                    <li><strong>🟡 YELLOW: STALE CHECKPOINT (LONG TXN?)</strong> - Gap &gt; 2,000,000. Check for long-running transactions.</li>
                                    <li><strong>🟢 GREEN: CHECKPOINT MOVING</strong> - Gap is normal. Checkpoint is advancing properly.</li>
                                  </ul>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            This query monitors the recovery checkpoint position relative to the current captured SCN. A large gap indicates that the capture process cannot purge old redo logs because of long-running transactions.
                          </p>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>CHECKPOINT_GAP (Primary Indicator):</strong> This is the most important metric. It shows how far behind the checkpoint is from the current captured SCN.
                            
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#10b981' }}>🟢 Healthy State:</strong> CHECKPOINT_HEALTH shows "GREEN: CHECKPOINT MOVING" and CHECKPOINT_GAP is low (&lt; 2,000,000).
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#f59e0b' }}>🟡 Warning State:</strong> CHECKPOINT_HEALTH shows "YELLOW: STALE CHECKPOINT (LONG TXN?)" and CHECKPOINT_GAP &gt; 2,000,000. Investigate long-running transactions using the "Long Running Transactions & Errors" query.
                          </div>

                          <div>
                            <strong style={{ color: '#111827' }}>Why This Matters:</strong> If the checkpoint cannot advance, the capture process cannot purge old redo logs, which can lead to disk space issues and performance degradation. Identifying and resolving long-running transactions is critical for maintaining a healthy environment.
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {query.id === 'capture-status' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Significance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURE_NAME</td>
                                <td style={{ padding: '8px' }}>The unique name of the capture process.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>STATUS</td>
                                <td style={{ padding: '8px' }}>
                                  The current administrative state of the process:
                                  <ul style={{ marginTop: '4px', marginBottom: '0', paddingLeft: '20px' }}>
                                    <li><strong>ENABLED:</strong> Running (or attempting to run).</li>
                                    <li><strong>DISABLED:</strong> Manually stopped by an administrator.</li>
                                    <li><strong>ABORTED:</strong> Crashed due to an error (check ERROR).</li>
                                  </ul>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If not ENABLED, the capture process is not running.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>STATE</td>
                                <td style={{ padding: '8px' }}>
                                  The current activity of the capture process (e.g., CAPTURING CHANGES, WAITING FOR TRANSACTION, WAITING FOR REDO, PAUSED FOR FLOW CONTROL).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Note:</strong> If you see WAITING FOR TRANSACTION and the Source DB is quiet, this is normal. The process is idling, waiting for new changes.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>LAG_SEC</td>
                                <td style={{ padding: '8px' }}>
                                  Lag in seconds (Capture Time - Message Create Time). This is the most critical metric for replication latency.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 1800 seconds (30 minutes), the capture is severely lagging.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 300 seconds (5 minutes), monitor closely.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>START_SCN</td>
                                <td style={{ padding: '8px' }}>The SCN where OJET was started capturing data.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURED_SCN</td>
                                <td style={{ padding: '8px' }}>The highest SCN that the capture process has successfully captured from redo.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>APPLIED_SCN</td>
                                <td style={{ padding: '8px' }}>The highest SCN already consumed/applied by the downstream client.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURED_APPLY_DIFF</td>
                                <td style={{ padding: '8px' }}>
                                  The difference between CAPTURED_SCN and APPLIED_SCN. This tells you how many changes are sitting in the queue waiting to be processed at the destination.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If this number is large and growing, the downstream consumer (Striim) is falling behind.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>TOT_LCR</td>
                                <td style={{ padding: '8px' }}>Total messages (LCRs - Logical Change Records) captured by this process since it started. This is a cumulative counter and it is including interested and non-interested tables.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>REDO_MINED_MB</td>
                                <td style={{ padding: '8px' }}>
                                  Redo throughput in MB (How much data is actually being processed). This shows the total amount of redo data mined by the capture process.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Note:</strong> This is a cumulative counter. A high value indicates heavy transaction volume.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURE_HEALTH</td>
                                <td style={{ padding: '8px' }}>
                                  Overall health status of the capture process based on STATUS, ERROR, LAG_SEC, and STATE.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>🟢 GREEN: HEALTHY (IDLE):</strong> Process is enabled, no errors, lag &lt; 300 seconds, waiting for transactions.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>🟢 GREEN: HEALTHY (ACTIVE):</strong> Process is enabled, no errors, lag &lt; 300 seconds, actively capturing.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW: HIGH LAG:</strong> Lag between 300-1800 seconds (5-30 minutes).
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED: CRITICAL LAG:</strong> Lag over 1800 seconds (30 minutes).
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED: ERROR DETECTED:</strong> Process has an error message.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED: PROCESS ABORTED/DISABLED:</strong> Process is not running.
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>ERROR</td>
                                <td style={{ padding: '8px' }}>
                                  If the capture process crashes or stops, the reason (e.g., "Log file not found") appears here (first 35 characters).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> Any error message here indicates a critical problem that needs immediate attention.
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            Use these metrics to monitor the health and performance of your capture process:
                          </p>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>CAPTURE_HEALTH (Overall Status):</strong> This is the primary health indicator. It automatically evaluates STATUS, ERROR, LAG_SEC, and STATE to provide an at-a-glance health assessment:
                            <ul style={{ marginTop: '4px', marginBottom: '0', paddingLeft: '20px' }}>
                              <li>🟢 <strong>GREEN: HEALTHY (IDLE/ACTIVE)</strong> - Process is running normally with lag &lt; 300 seconds</li>
                              <li>🟡 <strong>YELLOW: HIGH LAG</strong> - Lag between 300-1800 seconds (5-30 minutes)</li>
                              <li>🔴 <strong>RED: CRITICAL LAG</strong> - Lag over 1800 seconds (30 minutes)</li>
                              <li>🔴 <strong>RED: ERROR DETECTED</strong> - Process has an error message</li>
                              <li>🔴 <strong>RED: PROCESS ABORTED/DISABLED</strong> - Process is not running</li>
                            </ul>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>LAG_SEC (Processing Latency):</strong> This is the most critical metric. It shows the delay between when a change occurred in the database and when it was captured. 🔴 RED if over 1800 seconds (30 minutes), 🟡 YELLOW if over 300 seconds (5 minutes).
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>STATE (Current Activity):</strong> Shows what the capture process is doing right now. "WAITING FOR TRANSACTION" means the process is idle and current. Other states like "CAPTURING CHANGES" indicate active processing.
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>CAPTURED_SCN / APPLIED_SCN:</strong> These two columns show how far the extraction side has progressed versus what the downstream client has already consumed.
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>CAPTURED_APPLY_DIFF (Apply Backlog):</strong> The gap between captured and applied SCNs. This tells you how many changes are waiting to be processed at the destination. If this number is large and growing, the downstream consumer (Striim) is falling behind.
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>REDO_MINED_MB (Throughput):</strong> Shows how much redo data has been processed. A high value indicates heavy transaction volume. This is a cumulative counter that grows over time.
                          </div>
                          <div>
                            <strong style={{ color: '#111827' }}>ERROR:</strong> Any error message here indicates a critical problem that needs immediate attention. Common errors include "Archive log not found" or "ORA-01341: LogMiner out-of-memory".
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Interested LCR Documentation */}
                  {query.id === 'interested-lcr' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Significance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAPTURE_NAME</td>
                                <td style={{ padding: '8px' }}>The unique name of the capture process.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>STATE</td>
                                <td style={{ padding: '8px' }}>
                                  Current operational state of the capture process (e.g., CAPTURING CHANGES, WAITING FOR TRANSACTIONS, PAUSED, ABORTED).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If ABORTED, the process has crashed and needs to be restarted.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If PAUSED, the process is experiencing backpressure (flow control).
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>TOTAL_MESSAGES_CAPTURED</td>
                                <td style={{ padding: '8px' }}>
                                  Total number of LCRs captured from redo logs since the process started. Includes ALL changes (interested and non-interested).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Note:</strong> Cumulative counter that continuously grows.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>TOTAL_ENQUEUED</td>
                                <td style={{ padding: '8px' }}>
                                  Total number of interested LCRs enqueued to the Streams Pool (after filtering).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>✅ Key Metric:</strong> This is the actual data being replicated downstream.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>DIFF_CAPTURE_ENQ</td>
                                <td style={{ padding: '8px' }}>
                                  Difference between TOTAL_MESSAGES_CAPTURED and TOTAL_ENQUEUED. Shows how many messages were filtered out.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 1,000,000, review capture rules - you may be over-capturing.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>ALLOCATED_MB</td>
                                <td style={{ padding: '8px' }}>
                                  Memory allocated (reserved) in the Streams Pool for this capture process in MB.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 5000 MB, excessive memory reservation.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 2000 MB, monitor closely.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>USED_MB</td>
                                <td style={{ padding: '8px' }}>
                                  Actual memory currently being used by the capture process in MB.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 5000 MB, consuming excessive memory.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 2000 MB, monitor closely.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>MEM_UTIL_PCT</td>
                                <td style={{ padding: '8px' }}>
                                  Memory utilization percentage (USED_MB / ALLOCATED_MB × 100).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 95%, memory exhaustion - process may be spilling to disk.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 80%, high memory load.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>LAG_SEC</td>
                                <td style={{ padding: '8px' }}>
                                  Lag in seconds (current time vs. last capture time). Shows how far behind the capture process is.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 1800 seconds (30 minutes), critical extraction lag.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 300 seconds (5 minutes), latency detected.
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>ENGINE_HEALTH_STATUS</td>
                                <td style={{ padding: '8px' }}>
                                  Overall health status of the capture process based on STATE, LAG_SEC, and MEM_UTIL_PCT.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>🟢 GREEN:</strong> Process is healthy and operating normally.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW:</strong> Warning condition detected (backpressure, latency, or high memory).
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED:</strong> Critical condition (process dead, critical lag, or memory exhaustion).
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            Monitor these critical metrics for capture process health:
                          </p>

                          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                            <strong style={{ color: '#111827' }}>🟢 Healthy State:</strong>
                            <ul style={{ marginTop: '6px', marginLeft: '20px' }}>
                              <li>STATE = "WAITING FOR TRANSACTIONS" or "CAPTURING CHANGES"</li>
                              <li>LAG_SEC &lt; 60 seconds</li>
                              <li>MEM_UTIL_PCT &lt; 80%</li>
                              <li>ENGINE_HEALTH_STATUS = "🟢 GREEN: IDLE & CURRENT" or "🟢 GREEN: ACTIVE"</li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                            <strong style={{ color: '#111827' }}>🟡 Warning State:</strong>
                            <ul style={{ marginTop: '6px', marginLeft: '20px' }}>
                              <li>STATE = "PAUSED" (backpressure from downstream)</li>
                              <li>LAG_SEC between 300-1800 seconds (5-30 minutes)</li>
                              <li>MEM_UTIL_PCT between 80-95% (high memory load)</li>
                              <li>DIFF_CAPTURE_ENQ &gt; 1,000,000 (review capture rules)</li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                            <strong style={{ color: '#111827' }}>🔴 Critical State:</strong>
                            <ul style={{ marginTop: '6px', marginLeft: '20px' }}>
                              <li>STATE = "ABORTED" (process dead - restart required)</li>
                              <li>LAG_SEC &gt; 1800 seconds (over 30 minutes)</li>
                              <li>MEM_UTIL_PCT &gt; 95% (memory exhaustion - spilling to disk)</li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>Filtering Efficiency:</strong> Calculate the filtering ratio as (DIFF_CAPTURE_ENQ / TOTAL_MESSAGES_CAPTURED) × 100%. A high percentage means most captured changes are being discarded. This could be normal (many non-interested tables) or indicate over-capturing (review capture rules).
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>Memory Utilization:</strong> MEM_UTIL_PCT shows how efficiently the capture process is using its allocated memory. If consistently &gt; 95%, the process may be spilling LCRs to disk (severe performance impact). If consistently &lt; 50%, you may have over-allocated memory.
                          </div>

                          <div>
                            <strong style={{ color: '#111827' }}>Replication Activity:</strong> TOTAL_ENQUEUED should grow steadily if replication is active. If stagnant while TOTAL_MESSAGES_CAPTURED grows, check your capture rules - you may be capturing tables that aren't configured for replication.
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Outbound Server Documentation */}
                  {query.id === 'outbound-server' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Significance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>PIPELINE</td>
                                <td style={{ padding: '8px' }}>The name of the Stream Outbound Server (pipeline) that dispatches LCRs to the Target.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>CAP_STATE</td>
                                <td style={{ padding: '8px' }}>The current state of the associated capture process (e.g., CAPTURING CHANGES, WAITING FOR TRANSACTION).</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>OUT_STATE</td>
                                <td style={{ padding: '8px' }}>
                                  The current state of the outbound server (e.g., SENDING EVENTS, WAITING FOR CLIENT, FLOW CONTROL, IDLE).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If ABORTED or DISABLED, the outbound server has crashed or is stopped.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If WAITING FOR CLIENT or FLOW CONTROL, Striim is slow or applying backpressure.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>ENQUEUED</td>
                                <td style={{ padding: '8px' }}>Total number of interested LCRs that have been enqueued (placed in the Streams Pool) by the capture process.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>SENT</td>
                                <td style={{ padding: '8px' }}>Total number of LCRs that have been successfully sent to the downstream client by the outbound server.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>IN_TRANSIT</td>
                                <td style={{ padding: '8px' }}>
                                  The difference between ENQUEUED and SENT. This shows how many LCRs are waiting in the Streams Pool to be sent to the client.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 500,000, there's a huge backlog. The client may be slow or disconnected.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>MB_SENT</td>
                                <td style={{ padding: '8px' }}>Total amount of data (in MB) sent to the downstream client. This is a cumulative counter.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>LAG_SEC</td>
                                <td style={{ padding: '8px' }}>
                                  Capture lag in seconds (Capture Time - Message Create Time). This shows how far behind the capture process is from real-time.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 1800 seconds (30 minutes), there's critical latency.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 300 seconds (5 minutes), there's high lag.
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>LAST_MSG</td>
                                <td style={{ padding: '8px' }}>The timestamp (DD-MON HH24:MI:SS) of the last message sent to the client. Use this to verify that data is flowing.</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>OUTBOUND_HEALTH</td>
                                <td style={{ padding: '8px' }}>
                                  Overall health status of the complete OJET pipeline (capture + outbound) with multi-tier priority logic.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>🟢 GREEN: HEALTHY (IDLE):</strong> Server is idle, waiting for new messages.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>🟢 GREEN: DATA FLOWING:</strong> Server is actively sending messages.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW: STRIIM IS SLOW:</strong> Waiting for client requests - Striim may be overloaded or network is slow.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW: BOTTLENECK / BACKPRESSURE:</strong> Flow control detected - Striim is applying backpressure.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW: HIGH LAG:</strong> Capture lag is over 300 seconds (5 minutes).
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW: HUGE BACKLOG:</strong> In-transit gap is over 500,000 LCRs.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED: SERVER DOWN:</strong> Outbound server is ABORTED or DISABLED.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED: CRITICAL LAG:</strong> Capture lag is over 1800 seconds (30 minutes).
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            Use these metrics to monitor the complete OJET pipeline from capture to outbound:
                          </p>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>OUTBOUND_HEALTH (Overall Status):</strong> This is the primary health indicator with multi-tier priority logic:
                            <ul style={{ marginTop: '4px', marginBottom: '0', paddingLeft: '20px' }}>
                              <li>🔴 <strong>Priority 1 - Hard Crashes:</strong> SERVER DOWN (ABORTED/DISABLED)</li>
                              <li>🔴 <strong>Priority 2 - Critical Latency:</strong> CRITICAL LAG (over 30 minutes)</li>
                              <li>🟡 <strong>Priority 3 - Communication Bottlenecks:</strong> STRIIM IS SLOW or BOTTLENECK / BACKPRESSURE</li>
                              <li>🟡 <strong>Priority 4 - Creeping Latency:</strong> HIGH LAG (over 5 minutes) or HUGE BACKLOG (over 500k LCRs)</li>
                              <li>🟢 <strong>Priority 5 - Healthy:</strong> HEALTHY (IDLE) or DATA FLOWING</li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>LAG_SEC (Capture Latency):</strong> Shows how far behind the capture process is from real-time. 🔴 RED if over 1800 seconds (30 minutes), 🟡 YELLOW if over 300 seconds (5 minutes). This is critical for understanding if the capture process is keeping up with database changes.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>IN_TRANSIT (Backlog):</strong> Shows how many LCRs are waiting to be sent to Striim. If this number is growing, Striim is not keeping up. 🟡 YELLOW if over 500,000.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>OUT_STATE:</strong> Monitor this to understand what the outbound server is doing. Key states: SENDING EVENTS (active), IDLE (waiting), WAITING FOR CLIENT (Striim slow), FLOW CONTROL (backpressure), ABORTED/DISABLED (crashed).
                          </div>

                          <div>
                            <strong style={{ color: '#111827' }}>LAST_MSG:</strong> Check this timestamp to verify that data is actively flowing. If it's stale (not updating), the outbound server may be idle or stuck.
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Long Running Transactions Documentation */}
                  {query.id === 'long-running-transactions' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Significance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>USERNAME</td>
                                <td style={{ padding: '8px' }}>The Oracle database user (schema) that owns the session executing this transaction. Helps identify the application or user responsible.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>MACHINE</td>
                                <td style={{ padding: '8px' }}>The hostname or IP of the client machine that initiated the session. Useful for identifying the application server or batch job origin.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>TRANSACTION_ID</td>
                                <td style={{ padding: '8px' }}>The unique identifier of the long-running transaction (XIDUSN.XIDSLOT.XIDSQN). Use this to investigate the transaction in the source database.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>TOTAL_MESSAGE_COUNT</td>
                                <td style={{ padding: '8px' }}>
                                  The number of LCRs (changes) pending in this transaction. Stream cannot send these LCRs until the transaction commits.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 RED FLAG:</strong> If over 100,000, this is a huge transaction that will cause significant replication delay when it commits.
                                  </div>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 YELLOW FLAG:</strong> If over 10,000, this is a large transaction. Monitor it closely.
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>START_TIME</td>
                                <td style={{ padding: '8px' }}>
                                  The timestamp (YYYY-MM-DD HH24:MI:SS) when the first change in this transaction was captured. Use this to calculate how long the transaction has been open.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Note:</strong> If this timestamp is very old (hours or days), the transaction may be stuck or abandoned. Investigate the source application.
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            Use these metrics to identify problematic long-running transactions:
                          </p>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>Why This Matters:</strong> Stream uses transactional consistency. It cannot send LCRs to the downstream client until the transaction commits. If a transaction stays open for a long time, all its changes will be held "In Transit" and will flood the downstream system when the COMMIT finally arrives.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>USERNAME & MACHINE (Session Origin):</strong> Identifies WHO is running the transaction and FROM WHERE. This is critical for contacting the right team or application owner when a long transaction is blocking replication.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>TOTAL_MESSAGE_COUNT (LCRs Pending):</strong> Shows how many changes are pending in the transaction. 🔴 RED if over 100,000 (huge transaction), 🟡 YELLOW if over 10,000 (large transaction). Large transactions can cause memory pressure and replication spikes.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>START_TIME (Transaction Age):</strong> Check how long the transaction has been open. If it's been hours or days, investigate the source application. The transaction may be stuck, abandoned, or part of a batch job that hasn't committed yet.
                          </div>

                          <div>
                            <strong style={{ color: '#111827' }}>Action Items:</strong> If you see long-running transactions: (1) Use USERNAME and MACHINE to identify the source application, (2) Check if the session is still active, (3) Consider breaking large batch operations into smaller commits, (4) If stuck, you may need to kill the session or wait for it to rollback/commit.
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Propagation Receiver Documentation */}
                  {query.id === 'propagation-receiver' && (
                    <details style={{ marginBottom: '16px' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#2563eb',
                        fontWeight: '500',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        📖 Column Descriptions & Health Metrics
                      </summary>
                      <div style={{
                        marginTop: '12px',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Column Descriptions
                        </h4>
                        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            backgroundColor: 'white'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6', width: '25%' }}>Column</th>
                                <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600', backgroundColor: '#f3f4f6' }}>Explanation</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>INST_ID</td>
                                <td style={{ padding: '8px' }}>The Oracle RAC instance ID where this propagation receiver is running.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>HIGHEST_MESS_SCN_RECEIVED</td>
                                <td style={{ padding: '8px' }}>The SCN of the very last message that physically arrived at the receiver</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>HIGHEST_MESS_ACKNOWLEDGE_TO_SENDER</td>
                                <td style={{ padding: '8px' }}>The SCN that the receiver has successfully acknowledged back to the sender. This tells the sender it's safe to purge these messages.</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>UNACKNOWLEDGED_SCN_GAP</td>
                                <td style={{ padding: '8px' }}>
                                  The difference between received and acknowledged SCNs. Shows how many messages are pending acknowledgment.
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '4px' }}>
                                    <strong>ℹ️ Important:</strong> This gap is ONLY evaluated when the receiver is actively processing. If STATE = "Waiting for message from propagation sender" (IDLE), the gap is ignored as it represents a "phantom gap" from the last session.
                                  </div>
                                  <div style={{ marginTop: '4px', padding: '8px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px' }}>
                                    <strong>🔴 Critical:</strong> Gap &gt; 150,000 (only when actively processing)
                                  </div>
                                  <div style={{ marginTop: '4px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>🟡 Warning:</strong> Gap &gt; 80,000 (only when actively processing)
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>STATE</td>
                                <td style={{ padding: '8px' }}>
                                  The current status of the receiver process (e.g., Waiting for message, Processing message, or Closing).
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '4px' }}>
                                    <strong>⚠️ Note:</strong> If you see "Waiting for Memory" consider increasing the streams_pool_size
                                  </div>
                                </td>
                              </tr>
                              <tr style={{ backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px', fontWeight: '500', fontFamily: 'monospace', fontSize: '11px' }}>NETWORK_HEALTH_STATUS</td>
                                <td style={{ padding: '8px' }}>
                                  <strong>🎯 PRIMARY HEALTH INDICATOR</strong> - Overall health status based on intelligent state and SCN gap analysis:
                                  <ul style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                                    <li><strong>🔴 RED: MEMORY PRESSURE</strong> - Waiting for memory allocation (increase streams_pool_size)</li>
                                    <li><strong>🔴 RED: CRITICAL BACKLOG</strong> - SCN gap &gt; 150,000 while actively processing</li>
                                    <li><strong>🟡 YELLOW: DOWNSTREAM BUSY</strong> - Waiting for client to consume messages</li>
                                    <li><strong>🟡 YELLOW: NETWORK LATENCY</strong> - SCN gap &gt; 80,000 while actively processing</li>
                                    <li><strong>🟢 GREEN: HEALTHY (IDLE)</strong> - Waiting for messages (gap is ignored - phantom gap from last session)</li>
                                    <li><strong>🟢 GREEN: HEALTHY (ACTIVE)</strong> - Actively processing with normal gap</li>
                                  </ul>
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #16a34a', borderRadius: '4px' }}>
                                    <strong>✅ Key Fix:</strong> The logic now correctly ignores "phantom gaps" when the receiver is idle (STATE = 'Waiting for message from propagation sender'). This prevents false alarms from residual SCN gaps left over from previous sessions.
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                          Key Health Metrics to Watch
                        </h4>
                        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                          <p style={{ marginBottom: '12px' }}>
                            This query provides intelligent health monitoring for the propagation receiver (downstream data transport). The NETWORK_HEALTH_STATUS column uses context-aware logic to avoid false alarms.
                          </p>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#111827' }}>NETWORK_HEALTH_STATUS (Primary Indicator):</strong> This is your main health indicator. It intelligently evaluates both STATE and UNACKNOWLEDGED_SCN_GAP:
                            <ul style={{ marginTop: '4px', marginLeft: '20px' }}>
                              <li><strong>Priority 1:</strong> Checks for memory pressure or client issues first</li>
                              <li><strong>Priority 2:</strong> If IDLE ("Waiting for message from propagation sender"), marks as GREEN regardless of gap (ignores phantom gap)</li>
                              <li><strong>Priority 3:</strong> If actively processing, evaluates gap thresholds (150k = RED, 80k = YELLOW)</li>
                              <li><strong>Priority 4:</strong> If actively processing with normal gap, marks as GREEN (ACTIVE)</li>
                            </ul>
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#10b981' }}>🟢 Healthy State:</strong> NETWORK_HEALTH_STATUS shows "GREEN: HEALTHY (IDLE)" or "GREEN: HEALTHY (ACTIVE)". The receiver is functioning normally.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#f59e0b' }}>🟡 Warning State:</strong> "YELLOW: DOWNSTREAM BUSY" means the client is slow. "YELLOW: NETWORK LATENCY" means gap &gt; 80k while actively processing. Monitor closely.
                          </div>

                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#ef4444' }}>🔴 Critical State:</strong> "RED: MEMORY PRESSURE" requires increasing streams_pool_size. "RED: CRITICAL BACKLOG" means gap &gt; 150k while actively processing - check downstream capacity.
                          </div>

                          <div>
                            <strong style={{ color: '#111827' }}>The Phantom Gap Fix:</strong> Previous versions would show false alarms when the receiver was idle with a residual SCN gap from the last session. The new logic correctly ignores this "phantom gap" when STATE = 'Waiting for message from propagation sender', preventing unnecessary alerts.
                          </div>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* SQL Query Display */}
                  <details style={{ marginBottom: '16px' }}>
                    <summary style={{
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#2563eb',
                      fontWeight: '500',
                      userSelect: 'none'
                    }}>
                      📋 View SQL Query
                    </summary>
                    <pre style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflowX: 'auto',
                      color: '#374151',
                      fontFamily: 'monospace'
                    }}>
                      {query.query}
                    </pre>
                  </details>

                  <button
                    onClick={() => executeQuery(query.id, query.endpoint)}
                    disabled={!isConnected || queryLoading[query.id]}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: !isConnected || queryLoading[query.id] ? '#9ca3af' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: !isConnected || queryLoading[query.id] ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {queryLoading[query.id] ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Execute Query
                      </>
                    )}
                  </button>
                </div>

                {/* Error Display */}
                {queryErrors[query.id] && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginTop: '16px'
                  }}>
                    <AlertCircle size={16} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#991b1b' }}>{queryErrors[query.id]}</span>
                  </div>
                )}

                {/* Results Display */}
                {queryResults[query.id] && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                      Results:
                    </h4>
                    <div style={{
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '16px'
                    }}>
                      {queryResults[query.id].length === 0 ? (
                        <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                          No results found
                        </p>
                      ) : (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <table style={{
                            borderCollapse: 'collapse',
                            fontSize: '11px',
                            width: '100%'
                          }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                                {Object.keys(queryResults[query.id][0]).map((key) => (
                                  <th
                                    key={key}
                                    style={{
                                      textAlign: 'left',
                                      padding: '6px 8px',
                                      fontWeight: '600',
                                      color: '#374151',
                                      backgroundColor: '#f3f4f6',
                                      whiteSpace: 'nowrap',
                                      fontSize: '9px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.3px'
                                    }}
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResults[query.id].map((row, idx) => (
                                <tr
                                  key={idx}
                                  style={{
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                                  }}
                                >
                                  {Object.entries(row).map(([columnName, value], vidx) => {
                                    const cellColor = getCellColor(query.id, columnName, value)
                                    return (
                                      <td
                                        key={vidx}
                                        style={{
                                          padding: '6px 8px',
                                          color: cellColor ? '#000000' : '#111827',
                                          backgroundColor: cellColor || 'transparent',
                                          fontWeight: cellColor ? '700' : 'normal',
                                          whiteSpace: 'nowrap'
                                        }}
                                        title={value !== null && value !== undefined ? String(value) : '-'}
                                      >
                                        {value !== null && value !== undefined ? String(value) : '-'}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OjetQueries

