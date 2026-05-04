import { GitBranch, Plus, Minus, AlertCircle } from 'lucide-react'

function AddRemoveTables() {
  const removeSteps = [
    {
      step: 1,
      title: 'Stop the OJET App (suggestion: Check that there are not OLD Open Transactions)',
      description: 'Stop the OJET application',
      color: '#ef4444'
    },
    {
      step: 2,
      title: 'Alter OJET removing table(s)',
      description: 'For simplicity, you can remove the Table(s) from Source Only',
      color: '#ef4444'
    },
    {
       step: '3',
      title: 'Start OJET App',
      description: 'Restart the OJET application with new configuration',
      color: '#ef4444'
    }
  ]

  const addStepsDisabled = [
    {
      step: 1,
      title: 'Stop OJET App (suggestion: Check that there are not OLD Open Transactions)',
      description: 'Stop OJET application',
      color: '#3b82f6'
    },
    {
      step: 2,
      title: 'Run Dictionary Build',
      description: 'Execute dictionary build process. exec DBMS_LOGMNR_D.BUILD( options => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS);',
      color: '#3b82f6'
    },
    {
      step: 3,
      title: 'Perform Table Instantiation for ALL the tables',
      description: 'Prepare tables for CDC. exec DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION(table_name => \'OWNER.TABLE_NAME\', supplemental_logging => \'NONE\', container=> \'CURRENT\')',
      color: '#3b82f6'
    },
    {
      step: 4,
      title: 'Get the MAX (SCN) of latest Instantiation Process',
      description: 'SELECT max(SCN) from DBA_CAPTURE_PREPARED_TABLES where TABLE_OWNER = ... and TABLE_NAME = ....',
      color: '#3b82f6'
    },
    {
      step: 5,
      title: 'Perform IL for the new Tables',
      description: 'Execute IL, remember to Enable Quiesce On IL Completion',
      color: '#3b82f6'
    },
    {
      step: 6,
      title: 'Alter OJET Application and add the new tables. Add IgnorableExceptionCodes',
      description: 'Update OJET App to include new tables in Source and Target. Also add IgnorableExceptionCode: DUPLICATE_ROW_EXISTS,NO_OP_UPDATE,NO_OP_PKUPDATE,NO_OP_DELETE to the Target  ',
      color: '#3b82f6'
    },
    {
      step: '7',
      title: 'Once IL is completd, Start OJET App',
      description: 'Restart the OJET application with new configuration',
      color: '#3b82f6'
    },
    {
      step: '8',
      title: 'Later, Remove IgnorableExceptionCodes (optional)',
      description: 'Once RECOVERY_SCN is higher than the MAX(SCN) value collected before, you can remove the IgnorableExceptionCodes',
      color: '#3b82f6'
    }
  ]

  const addStepsEnabled = [
    {
      step: 1,
      title: 'Run Dictionary Build',
      description: 'Execute Dictionary Build. execute DBMS_LOGMNR_D.BUILD( options => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS);',
      color: '#10b981'
    },
    {
      step: 2,
      title: 'Perform Table Instantiation for ALL the tables',
      description: 'Prepare CDC tables. exec DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION(table_name => \'OWNER.TABLE_NAME\', supplemental_logging => \'NONE\', container=> \'CURRENT\')',
      color: '#10b981'
    },
    {
      step: 3,
      title: 'Get Max(SCN) of latest Instantiation Process',
      description: 'SELECT max(SCN) from DBA_CAPTURE_PREPARED_TABLES where TABLE_OWNER = ... and TABLE_NAME = ....',
      color: '#10b981'
    },
    {
      step: 4,
      title: 'Get Recovery SCN from OJET App',
      description: 'Get RECOVERY_SCN using describe <Source> command',
      color: '#10b981'
    },
    {
      step: 5,
      title: 'Is RecoverySCN higher than Max(SCN) from step 3?',
      description: 'CRITICAL STEP: Wait for RecoverySCN to be ahead of Max(SCN)',
      color: '#f59e0b',
      isDecision: true,
      hasExclamation: true
    },
    {
      step: 6,
      title: 'Stop, Get RecoverySCN, Undeploy, Export and Drop the OJET App (suggestion: Check that there are not OLD Open Transactions)',
      description: 'This step will clean up existing OJET deployment. Take a note of the RECOVERYSCN',
      color: '#10b981'
    },
    {
      step: 7,
      title: 'Perform IL for the new Tables',
      description: 'Execute IL, remember to Enable Quiesce On IL Completion',
      color: '#10b981'
    },
    {
      step: 8,
      title: 'Alter OJET TQL and add the new tables. For StartSCN, use the number captured on Step 6. Add IgnorableExceptionCodes',
      descriptionLines: [
        'Update TQL Code to include new tables in Source and Target.',
        'Modify StartSCN with the value captured on Step 6.',
        'Also add IgnorableExceptionCode: DUPLICATE_ROW_EXISTS,NO_OP_UPDATE,NO_OP_PKUPDATE,NO_OP_DELETE to the Target'
      ],
      color: '#10b981'
    },
    {
      step: 8,
      title: 'Import, Deploy and Start OJET Application',
      description: 'Import, Deploy and Start updated application',
      color: '#10b981'
    }
  ]

  return (
    <div className="main-content">
      <div className="header">
        <h1>Add/Remove Tables</h1>
        <p>Step-by-step guide for adding or removing tables from OJET</p>
      </div>

      {/* Process Flow Diagram */}
      <div style={{
        marginBottom: '32px',
        padding: '24px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <GitBranch size={20} color="#2563eb" />
          Process Flow Diagram
        </h2>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <img
            src="/add-remove-tables-flow.png"
            alt="Add/Remove Tables Process Flow"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>



      {/* Remove Tables Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Minus size={20} color="#ef4444" />
          Remove Tables from OJET
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {removeSteps.map((item, idx) => (
            <div key={idx} className="card" style={{
              borderLeft: `4px solid ${item.color}`,
              background: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {item.step && (
                  <div style={{
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.step}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Tables Section - OJET Disabled */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Plus size={20} color="#3b82f6" />
          Add Tables to OJET (CDDL Disabled)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {addStepsDisabled.map((item, idx) => (
            <div key={idx} className="card" style={{
              borderLeft: `4px solid ${item.color}`,
              background: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {item.step && (
                  <div style={{
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.step}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Tables Section - OJET Enabled */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Plus size={20} color="#10b981" />
          Add Tables to OJET (CDDL Enabled)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {addStepsEnabled.map((item, idx) => (
            <div key={idx} className="card" style={{
              borderLeft: `4px solid ${item.color}`,
              background: item.isDecision ? '#fffbeb' : 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {item.step && (
                  <div style={{
                    minWidth: '32px',
                    height: '32px',
                    borderRadius: item.isDecision ? '4px' : '50%',
                    background: item.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    transform: item.isDecision ? 'rotate(45deg)' : 'none',
                    position: 'relative'
                  }}>
                    <span style={{ transform: item.isDecision ? 'rotate(-45deg)' : 'none' }}>
                      {item.step}
                    </span>
                    {item.hasExclamation && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#dc2626',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transform: 'none',
                        border: '2px solid white'
                      }}>
                        !
                      </span>
                    )}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {item.title}
                  </h3>
                  {item.descriptionLines ? (
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {item.descriptionLines.map((line, lineIdx) => (
                        <div key={lineIdx} style={{ marginBottom: lineIdx < item.descriptionLines.length - 1 ? '4px' : '0' }}>
                          • {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Important Notes */}
      <div style={{
        padding: '16px',
        background: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #f59e0b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertCircle size={20} color="#f59e0b" />
          <strong style={{ color: '#92400e' }}>Important Notes</strong>
        </div>
        <ul style={{ margin: 0, paddingLeft: '28px', fontSize: '13px', color: '#92400e' }}>
          <li>Ensure proper table instantiation before adding tables to OJET</li>
          <li>Verify SCN consistency when adding tables to a running OJET instance</li>
          <li>Back up your configuration before making changes</li>
          <li>Test changes in a non-production environment first</li>
        </ul>
      </div>
    </div>
  )
}

export default AddRemoveTables

