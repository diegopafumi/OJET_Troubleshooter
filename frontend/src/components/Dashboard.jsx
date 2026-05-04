import { useState } from 'react'
import { FileText, Database, Activity, GitBranch, Settings, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import axios from 'axios'
import CheckCard from './CheckCard'

function Dashboard({ dbConfig, setDbConfig, isConnected, setIsConnected }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [calcAvgRowLength, setCalcAvgRowLength] = useState('')
  const [calcRowChanges, setCalcRowChanges] = useState('')

  const avgRowLength = parseFloat(calcAvgRowLength) || 0
  const rowChanges = parseFloat(calcRowChanges) || 0
  const hasCalcInputs = avgRowLength > 0 && rowChanges > 0
  const rawDataSizeGB = hasCalcInputs
    ? Math.round((2.16 * (rowChanges / 1000000) + (avgRowLength * rowChanges) / (1024 * 1024 * 1024)) * 10) / 10
    : null
  const minStreamsPoolGB = rawDataSizeGB !== null ? rawDataSizeGB * 1.10 : null
  const txBufferSpillover = rowChanges > 0 ? Math.round(rowChanges * 1.25) : null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setDbConfig(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleConnect = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await axios.post('/api/test-connection', dbConfig)

      if (response.data.success) {
        setIsConnected(true)
        setMessage('Connection successful!')
      } else {
        setIsConnected(false)
        setMessage(response.data.message || 'Connection failed')
      }
    } catch (error) {
      setIsConnected(false)
      setMessage(error.response?.data?.message || error.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }
  const checks = [
    {
      id: 'dictionary-dumps',
      title: 'Existing Dictionary Dumps',
      description: 'Verify LogMiner dictionary builds are present and valid.',
      icon: FileText,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      endpoint: '/api/check/dictionary-dumps',
      requiresParams: false,
      query: `-- If Arch Log Files are "crossed" (BEGIN = Y in 1 row and END=Y on the previous row),
-- that is fine, perhaps BUILD was not able to fit in 1 ARCH LOG FILE

SELECT name, thread#, sequence# as SEQ, status, first_time, next_time,
       FIRST_CHANGE#, NEXT_CHANGE#, DICTIONARY_BEGIN, DICTIONARY_END, deleted
FROM v$archived_log
WHERE standby_dest = 'NO'
  AND COMPLETION_TIME > sysdate - 3
  AND (DICTIONARY_BEGIN = 'YES' OR DICTIONARY_END = 'YES')
ORDER BY SEQUENCE# DESC;`
    },
    {
      id: 'take-dictionary-dump',
      title: 'Take Dictionary Dump',
      description: 'Execute DBMS_LOGMNR_D.BUILD to create a new dictionary dump. If this is RAC, Execute the BUILD and INSTANTIATION on the node with the highest sequence number',
      icon: FileText,
      iconBg: '#e0e7ff',
      iconColor: '#6366f1',
      endpoint: '/api/action/build-dictionary',
      requiresParams: false,
      isAction: true,
      query: `-- This will be executed:
EXECUTE DBMS_LOGMNR_D.BUILD(
  options => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS
);`,
      actions: [
        {
          type: 'build-dictionary',
          label: 'Execute Dictionary Build'
        }
      ]
    },
    {
      id: 'table-instantiation',
      title: 'Table Instantiation',
      description: 'Check if tables are properly instantiated and ready for CDC.',
      icon: Database,
      iconBg: '#d1fae5',
      iconColor: '#10b981',
      endpoint: '/api/check/table-instantiation',
      requiresParams: true,
      params: [
        { name: 'tables', label: 'Tables (owner.table separated by ;)', placeholder: 'SCHEMA1.TABLE1;SCHEMA1.TABLE2', uppercase: true }
      ],
      query: `SELECT TABLE_OWNER, TABLE_NAME, TIMESTAMP, scn as SCN_TO_START_TABLE
FROM dba_capture_prepared_tables
WHERE (TABLE_OWNER, TABLE_NAME) IN (:tables);`,
      actions: [
        {
          type: 'prepare-tables',
          label: 'Prepare Tables'
        }
      ]
    },
    {
      id: 'scn-validation',
      title: 'SCN Validation',
      description: 'Validate SCN consistency for dictionary dumps and table instantiation.',
      icon: GitBranch,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      endpoint: '/api/check/scn-validation',
      requiresParams: true,
      params: [
        { name: 'tables', label: 'Tables (owner.table separated by ;)', placeholder: 'SCHEMA1.TABLE1;SCHEMA1.TABLE2', uppercase: true }
      ],
      query: `SELECT MAX(SCN) as MAX_SCN
FROM DBA_CAPTURE_PREPARED_TABLES
WHERE (TABLE_OWNER, TABLE_NAME) IN (:tables);`
    },
    {
      id: 'open-transactions',
      title: 'Open Transactions',
      description: 'Identify long-running open transactions that can block OJET operations',
      icon: Activity,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      endpoint: '/api/check/open-transactions',
      requiresParams: false,
      query: `SELECT MIN(START_TIME) as MIN_START_TIME,
       MIN(START_SCN) as MIN_START_SCN,
       COUNT(*) as OPEN_TXN_COUNT
FROM GV$TRANSACTION;`
    },
    {
      id: 'check-db-values',
      title: 'Check Other DB Values',
      description: 'Review critical database parameters and configuration values for OJET',
      icon: Settings,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      endpoint: '/api/check/db-values',
      requiresParams: false,
      query: `SELECT name,value from v$parameter
where name in ('db_name','db_unique_name','log_archive_dest_1','enable_goldengate_replication', 'log_archive_dest_2','log_archive_dest_state_1','log_archive_dest_state_2','log_archive_dest_state_3','log_archive_dest_state_4','fal_client','fal_server','standby_file_management','dg_broker_start','dg_broker_config_file1','dg_broker_config_file2','log_archive_config','service_names','streams_pool_size')
and value is not null
union
select 'global_name' as name, GLOBAL_NAME  FROM global_name
order by name;`
    }
  ]

  return (
    <div className="main-content">
      <div className="header">
        <h1>OJET Validation PROD</h1>
        <p>Validation & Diagnostics Dashboard for OJET Running in PROD DB Server</p>
      </div>

      {/* Documentation Link */}
      <div style={{
        margin: '20px 0',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <ExternalLink size={18} color="#0284c7" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '14px', color: '#0c4a6e' }}>
          For more detailed information and additional commands, please refer to the{' '}
          <a
            href="https://www.striim.com/docs/platform/en/oracle-database-operational-considerations.html#runtime-considerations-when-using-ojet"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0284c7',
              textDecoration: 'underline',
              fontWeight: '500'
            }}
          >
            official OJET documentation
          </a>
        </span>
      </div>

      {/* Database Connection Form */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            Database Connection
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Enter Oracle database credentials
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="form-group">
            <label htmlFor="host" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Host
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={dbConfig.host}
              onChange={handleInputChange}
              placeholder="localhost"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="port" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Port
            </label>
            <input
              type="text"
              id="port"
              name="port"
              value={dbConfig.port}
              onChange={handleInputChange}
              placeholder="1521"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sid" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              SID / Service Name
            </label>
            <input
              type="text"
              id="sid"
              name="sid"
              value={dbConfig.sid}
              onChange={handleInputChange}
              placeholder="ORCL"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="username" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={dbConfig.username}
              onChange={handleInputChange}
              placeholder="OJET_USER"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={dbConfig.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={loading || !dbConfig.host || !dbConfig.username || !dbConfig.password}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Connecting...
              </>
            ) : (
              <>
                <Database size={18} />
                Connect to Database
              </>
            )}
          </button>

          {message && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: isConnected ? '#d1fae5' : '#fee2e2',
              color: isConnected ? '#065f46' : '#991b1b'
            }}>
              {isConnected ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {message}
            </div>
          )}
        </div>

        {isConnected && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#d1fae5',
            color: '#065f46'
          }}>
            <CheckCircle size={16} />
            Connected to {dbConfig.host}:{dbConfig.port}/{dbConfig.sid}
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="error-message">
          Please connect to the Oracle database using the form above to run checks.
        </div>
      )}

      <div className="dashboard-grid">
        {checks.map(check => (
          <CheckCard
            key={check.id}
            check={check}
            isConnected={isConnected}
          />
        ))}
      </div>

      {/* OJET Estimated Parameters */}
      <div style={{ marginTop: '40px' }}>
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            OJET Estimated Parameters
          </h2>
        </div>
        <div className="card" style={{ maxWidth: '680px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Average Row Length (Bytes)</label>
              <input
                type="number"
                min="0"
                value={calcAvgRowLength}
                onChange={e => setCalcAvgRowLength(e.target.value)}
                placeholder="e.g. 512"
                style={{ fontSize: '13px' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: '600' }}># of Row Changes per Tx</label>
              <input
                type="number"
                min="0"
                value={calcRowChanges}
                onChange={e => setCalcRowChanges(e.target.value)}
                placeholder="e.g. 1000000"
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Raw Data Size (GB)</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#15803d' }}>
                {rawDataSizeGB !== null ? rawDataSizeGB.toFixed(1) : '—'}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min STREAMS_POOL_SIZE (GB)</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#1d4ed8' }}>
                {minStreamsPoolGB !== null ? minStreamsPoolGB.toFixed(1) : '—'}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TransactionBufferSpilloverCount</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#b45309' }}>
                {txBufferSpillover !== null ? txBufferSpillover.toLocaleString() : '—'}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#fdf4ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TransactionAgeSpilloverLimit (2 hrs)</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#7c3aed' }}>8,000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

