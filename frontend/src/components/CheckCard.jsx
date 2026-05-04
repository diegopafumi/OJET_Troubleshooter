import { useState } from 'react'
import { Play, Code, ChevronDown, ChevronUp, Wrench, X } from 'lucide-react'
import axios from 'axios'

function CheckCard({ check, isConnected, dbConfigProd, dbConfigDownstream, isConnectedProd, isConnectedDownstream }) {
  // Return empty div for placeholder cards
  if (check.isPlaceholder) {
    return <div style={{ visibility: 'hidden' }}></div>
  }

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [showQuery, setShowQuery] = useState(false)
  const [params, setParams] = useState({})
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState(null)
  const [showResults, setShowResults] = useState(true)

  const Icon = check.icon

  const handleParamChange = (paramName, value) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const handleRunCheck = async () => {
    // If this is an action card, execute the action directly
    if (check.isAction) {
      if (check.actions && check.actions.length > 0) {
        handleAction(check.actions[0].type)
      }
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)
    setActionResult(null)
    setShowResults(true) // Show results when running a new check

    try {
      let response

      // Determine which database config to use
      let dbConfigToUse = null
      if (check.dbConnection === 'prod' && dbConfigProd) {
        dbConfigToUse = dbConfigProd
      } else if (check.dbConnection === 'downstream' && dbConfigDownstream) {
        dbConfigToUse = dbConfigDownstream
      }

      if (check.requiresParams) {
        // Validate required params
        const missingParams = check.params.filter(p => !params[p.name])
        if (missingParams.length > 0) {
          setError(`Please fill in: ${missingParams.map(p => p.label).join(', ')}`)
          setLoading(false)
          return
        }

        const payload = dbConfigToUse ? { ...params, dbConfig: dbConfigToUse } : params
        response = await axios.post(check.endpoint, payload)
      } else {
        const payload = dbConfigToUse ? { dbConfig: dbConfigToUse } : {}
        response = await axios.post(check.endpoint, payload)
      }

      if (response.data.success) {
        setResults(response.data)
      } else {
        setError(response.data.message || 'Check failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (actionType) => {
    if (!window.confirm(`Are you sure you want to execute this action?\n\n${getActionConfirmMessage(actionType)}`)) {
      return
    }

    setActionLoading(true)
    setActionResult(null)

    try {
      let response

      // Determine which database config to use
      let dbConfigToUse = null
      if (check.dbConnection === 'prod' && dbConfigProd) {
        dbConfigToUse = dbConfigProd
      } else if (check.dbConnection === 'downstream' && dbConfigDownstream) {
        dbConfigToUse = dbConfigDownstream
      }

      if (actionType === 'build-dictionary') {
        const payload = dbConfigToUse ? { dbConfig: dbConfigToUse } : {}
        response = await axios.post('/api/action/build-dictionary', payload)
      } else if (actionType === 'prepare-tables') {
        // Parse tables from params
        const rawTables = (params.tables || '').trim().toUpperCase()
        if (!rawTables) {
          setActionResult({
            success: false,
            message: 'Please provide Tables (owner.table separated by ;) first'
          })
          setActionLoading(false)
          return
        }

        const tableList = rawTables.split(';')
          .filter(entry => entry.trim())
          .map(entry => {
            const parts = entry.trim().split('.')
            return {
              schema: (parts[0] || '').trim(),
              table: (parts[1] || '').trim()
            }
          })
          .filter(t => t.schema && t.table)

        if (tableList.length === 0) {
          setActionResult({
            success: false,
            message: 'Invalid format. Use: SCHEMA1.TABLE1;SCHEMA2.TABLE2'
          })
          setActionLoading(false)
          return
        }

        const payload = dbConfigToUse ? { tables: tableList, dbConfig: dbConfigToUse } : { tables: tableList }
        response = await axios.post('/api/action/prepare-tables', payload)
      }

      setActionResult(response.data)
    } catch (err) {
      setActionResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Action failed'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getActionConfirmMessage = (actionType) => {
    if (actionType === 'build-dictionary') {
      return 'This will execute:\nDBMS_LOGMNR_D.BUILD(OPTIONS => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS)'
    } else if (actionType === 'prepare-tables') {
      return 'This will execute DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION for the specified tables'
    }
    return 'Execute this action?'
  }

  const renderResults = () => {
    if (!results) return null

    if (!showResults) {
      return (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={() => setShowResults(true)}
            className="btn"
            style={{
              width: '100%',
              background: '#f3f4f6',
              color: '#374151',
              fontSize: '13px'
            }}
          >
            <ChevronDown size={16} />
            Show Results ({Array.isArray(results.data) ? results.data.length : 1} row{Array.isArray(results.data) && results.data.length !== 1 ? 's' : ''})
          </button>
        </div>
      )
    }

    // Special handling for SCN Validation
    if (check.id === 'scn-validation' && results.data) {
      return (
        <div className="results-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
              SCN Validation Results
            </h4>
            <button
              onClick={() => setShowResults(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#6b7280',
                fontSize: '13px'
              }}
              title="Hide results"
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Max Instantiation SCN (This is the MIN value to use in StartSCN)
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                {results.data.maxInstantiationScn || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Standard table results
    if (results.data && Array.isArray(results.data) && results.data.length > 0) {
      const columns = results.columns || Object.keys(results.data[0])

      return (
        <div className="results-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
              Results ({results.data.length} row{results.data.length !== 1 ? 's' : ''})
            </h4>
            <button
              onClick={() => setShowResults(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#6b7280',
                fontSize: '13px'
              }}
              title="Hide results"
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.data.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map(col => (
                      <td key={col}>
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col])
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (results.data && Array.isArray(results.data) && results.data.length === 0) {
      return (
        <div className="results-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No results found</p>
            <button
              onClick={() => setShowResults(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#6b7280',
                fontSize: '13px'
              }}
              title="Hide results"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon" style={{ background: check.iconBg }}>
          <Icon size={24} color={check.iconColor} />
        </div>
        <div>
          <h3 className="card-title">{check.title}</h3>
        </div>
      </div>

      <p className="card-description">{check.description}</p>

      {check.requiresParams && (
        <div style={{ marginBottom: '16px' }}>
          {check.params.map(param => (
            <div key={param.name} className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor={`${check.id}-${param.name}`} style={{ fontSize: '13px' }}>
                {param.label}
              </label>
              <input
                type="text"
                id={`${check.id}-${param.name}`}
                value={params[param.name] || ''}
                onChange={(e) => handleParamChange(param.name, param.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={param.placeholder}
                style={{ fontSize: '13px' }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={handleRunCheck}
        disabled={!isConnected || loading || actionLoading}
        style={{ marginBottom: '12px' }}
      >
        {(loading || actionLoading) ? (
          <>
            <span className="loading-spinner"></span>
            {check.isAction ? 'Executing...' : 'Running Check...'}
          </>
        ) : (
          <>
            {check.isAction ? <Wrench size={16} /> : <Play size={16} />}
            {check.isAction ? 'Execute Action' : 'Run Check'}
          </>
        )}
      </button>

      <button
        className="btn"
        onClick={() => setShowQuery(!showQuery)}
        style={{
          width: '100%',
          background: '#f3f4f6',
          color: '#374151',
          fontSize: '13px'
        }}
      >
        <Code size={16} />
        {showQuery ? 'Hide' : 'Show'} SQL Query
        {showQuery ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showQuery && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#1f2937',
          borderRadius: '6px',
          overflow: 'auto'
        }}>
          <pre style={{
            margin: 0,
            fontSize: '12px',
            color: '#e5e7eb',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {check.query}
          </pre>
        </div>
      )}

      {/* Action Buttons - Only show for non-action cards */}
      {check.actions && check.actions.length > 0 && !check.isAction && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#6b7280' }}>
            <Wrench size={14} style={{ display: 'inline', marginRight: '6px' }} />
            {check.id === 'table-instantiation'
              ? 'Corrective Actions: ⚠️ SCN_TO_START_TABLE should be higher than a BUILD!'
              : 'Corrective Actions'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {check.actions.map(action => (
              <button
                key={action.type}
                className="btn"
                onClick={() => handleAction(action.type)}
                disabled={!isConnected || actionLoading}
                style={{
                  flex: '1',
                  minWidth: '150px',
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: '13px',
                  border: 'none'
                }}
              >
                {actionLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Executing...
                  </>
                ) : (
                  <>
                    <Wrench size={14} />
                    {action.label}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Result */}
      {actionResult && (
        <div className={actionResult.success ? 'success-message' : 'error-message'} style={{ marginTop: '12px' }}>
          <strong>{actionResult.success ? '✓ Success:' : '✗ Error:'}</strong> {actionResult.message}
          {actionResult.results && (
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              {actionResult.results.map((result, idx) => (
                <div key={idx} style={{
                  padding: '6px 8px',
                  background: result.success ? '#d1fae5' : '#fee2e2',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}>
                  <strong>{result.table}:</strong> {result.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {renderResults()}
    </div>
  )
}

export default CheckCard

