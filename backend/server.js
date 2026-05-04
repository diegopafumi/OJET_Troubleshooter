import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import oracledb from 'oracledb';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Function to wrap text to fit within a maximum width
function wrapText(text, maxWidth) {
  if (text.length <= maxWidth) {
    return [text];
  }

  const lines = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxWidth) {
      lines.push(remaining);
      break;
    }

    // Try to find a space to break at
    let breakPoint = maxWidth;
    const substring = remaining.substring(0, maxWidth + 1);
    const lastSpace = substring.lastIndexOf(' ');

    if (lastSpace > 0 && lastSpace < maxWidth) {
      // Break at the last space within maxWidth
      breakPoint = lastSpace;
      lines.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint + 1); // Skip the space
    } else {
      // No space found, check if there's a $ or _ to break at
      const lastDollar = substring.lastIndexOf('$');
      const lastUnderscore = substring.lastIndexOf('_');
      const breakChar = Math.max(lastDollar, lastUnderscore);

      if (breakChar > 0 && breakChar < maxWidth) {
        // Break after $ or _
        breakPoint = breakChar + 1;
        lines.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint);
      } else {
        // Force break at maxWidth
        lines.push(remaining.substring(0, maxWidth));
        remaining = remaining.substring(maxWidth);
      }
    }
  }

  return lines;
}

// Function to convert JSON object to ASCII table with text wrapping
function jsonToTable(data) {
  if (!data || typeof data !== 'object') {
    return JSON.stringify(data, null, 2);
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return 'No data';
  }

  // Get headers and values
  const headers = entries.map(([key]) => key);
  const values = entries.map(([, value]) => String(value));

  // Set maximum column width (adjust as needed)
  const MAX_COL_WIDTH = 30;

  // Calculate column widths with maximum limit
  const colWidths = headers.map((header, i) => {
    const headerLen = header.length;
    const valueLen = values[i].length;
    return Math.min(Math.max(headerLen, valueLen), MAX_COL_WIDTH);
  });

  // Wrap text for each cell
  const wrappedHeaders = headers.map((header, i) => wrapText(header, colWidths[i]));
  const wrappedValues = values.map((value, i) => wrapText(value, colWidths[i]));

  // Find maximum number of lines needed for values
  const maxValueLines = Math.max(...wrappedValues.map(lines => lines.length));

  // Helper function to create a line
  const createLine = (left, mid, right, fill) => {
    return left + colWidths.map(w => fill.repeat(w + 2)).join(mid) + right;
  };

  // Helper function to create a multi-line row
  const createMultiLineRow = (wrappedCells, separator) => {
    const maxLines = Math.max(...wrappedCells.map(lines => lines.length));
    const rowLines = [];

    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      const cells = wrappedCells.map((lines, colIdx) => {
        const text = lines[lineIdx] || '';
        return ' ' + text.padEnd(colWidths[colIdx]) + ' ';
      });
      rowLines.push(separator + cells.join(separator) + separator);
    }

    return rowLines.join('\n');
  };

  // Build the table
  const lines = [];
  lines.push(createLine('╒', '╤', '╕', '═')); // Top border
  lines.push(createMultiLineRow(wrappedHeaders, '│')); // Header row(s)
  lines.push(createLine('├', '┼', '┤', '─')); // Middle border
  lines.push(createMultiLineRow(wrappedValues, '│')); // Data row(s)
  lines.push(createLine('└', '┴', '┘', '─')); // Bottom border

  return lines.join('\n');
}

// Middleware
app.use(cors());
app.use(express.json());

// Log level helper — only verbose in development
const isDev = process.env.NODE_ENV !== 'production';
const log = {
  info:  (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => { if (isDev) console.log('[DEBUG]', ...args); }
};

// Validate Oracle identifier (schema/table name)
function isValidOracleIdentifier(name) {
  return /^[A-Z_$#][A-Z0-9_$#]*$/i.test(name);
}

// Oracle connection pools - support multiple connections
let pool = null; // Legacy pool for backward compatibility
const connectionPools = new Map(); // Map to store multiple connection pools

// Generate a unique key for a database configuration
function getPoolKey(config) {
  return `${config.host}:${config.port}/${config.sid}/${config.username}`;
}

// Initialize Oracle connection pool
async function initializePool(config) {
  try {
    if (pool) {
      await pool.close(0);
    }

    pool = await oracledb.createPool({
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${config.port}/${config.sid}`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1
    });

    return { success: true, message: 'Connection pool created successfully' };
  } catch (error) {
    log.error('Error creating connection pool:', error.message);
    return { success: false, message: error.message };
  }
}

// Get or create a connection pool for a specific database configuration
async function getOrCreatePool(config) {
  const poolKey = getPoolKey(config);

  // Check if pool already exists
  if (connectionPools.has(poolKey)) {
    return connectionPools.get(poolKey);
  }

  // Create new pool
  try {
    const newPool = await oracledb.createPool({
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${config.port}/${config.sid}`,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1
    });

    connectionPools.set(poolKey, newPool);
    log.info(`Created new connection pool for ${poolKey}`);
    return newPool;
  } catch (error) {
    log.error('Error creating connection pool:', error.message);
    throw error;
  }
}

// Test database connection
app.post('/api/test-connection', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });
    connection = await poolToUse.getConnection();
    await connection.execute('SELECT 1 FROM DUAL');

    log.info(`Connection test successful: ${host}:${port}/${sid}`);
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    log.error('Connection test failed:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { log.error('Error closing connection:', e.message); }
    }
  }
});

// Execute query endpoint
app.post('/api/execute-query', async (req, res) => {
  let connection;
  try {
    const { query, params = {} } = req.body;
    
    if (!pool) {
      return res.status(400).json({ 
        success: false, 
        message: 'Database connection not initialized. Please connect first.' 
      });
    }
    
    connection = await pool.getConnection();
    const result = await connection.execute(query, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 1000
    });
    
    res.json({ 
      success: true, 
      data: result.rows,
      columns: result.metaData?.map(col => col.name) || []
    });
  } catch (error) {
    console.error('Query execution failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Existing Dictionary Dumps check - Page 8 from PDF
app.post('/api/check/dictionary-dumps', async (req, res) => {
  let connection;
  try {
    const { dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized. Please connect first.'
      });
    }

    connection = await poolToUse.getConnection();
    // If Arch Log Files are "crossed" (BEGIN = Y in 1 row and END=Y on the previous row),
    // that is fine, perhaps BUILD was not able to fit in 1 ARCH LOG FILE
    const query = `
      SELECT name, thread#, sequence# as SEQ, status, first_time, next_time,
             FIRST_CHANGE#, NEXT_CHANGE#, DICTIONARY_BEGIN, DICTIONARY_END, deleted
      FROM v$archived_log
      WHERE standby_dest = 'NO'
        AND COMPLETION_TIME > sysdate - 3
        AND (DICTIONARY_BEGIN = 'YES' OR DICTIONARY_END = 'YES')
      ORDER BY SEQUENCE# DESC
    `;

    const result = await connection.execute(query, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Dictionary dumps check failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Table Instantiation check - Page 11 from PDF
app.post('/api/check/table-instantiation', async (req, res) => {
  let connection;
  try {
    const { tables, dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    const parsedPairs = tables.split(';').map(t => {
      const [owner, table] = t.trim().split('.');
      return { owner: (owner || '').trim().toUpperCase(), table: (table || '').trim().toUpperCase() };
    }).filter(p => p.owner && p.table);

    const invalidPairs = parsedPairs.filter(p => !isValidOracleIdentifier(p.owner) || !isValidOracleIdentifier(p.table));
    if (invalidPairs.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid identifier(s): ${invalidPairs.map(p => `${p.owner}.${p.table}`).join(', ')}` });
    }

    const tablePairs = parsedPairs.map(p => `('${p.owner}', '${p.table}')`).join(', ');

    const query = `
      SELECT TABLE_OWNER, TABLE_NAME, TIMESTAMP, scn as SCN_TO_START_TABLE
      FROM dba_capture_prepared_tables
      WHERE (TABLE_OWNER, TABLE_NAME) IN (${tablePairs})
    `;

    connection = await poolToUse.getConnection();
    const result = await connection.execute(query, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 1000
    });

    res.json({
      success: true,
      data: result.rows,
      columns: result.metaData?.map(col => col.name) || []
    });
  } catch (error) {
    console.error('Table instantiation check failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// SCN Validation check - Page 13 from PDF
app.post('/api/check/scn-validation', async (req, res) => {
  let connection;
  try {
    const { tables, dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    const parsedPairs2 = tables.split(';').map(t => {
      const [owner, table] = t.trim().split('.');
      return { owner: (owner || '').trim().toUpperCase(), table: (table || '').trim().toUpperCase() };
    }).filter(p => p.owner && p.table);

    const invalidPairs2 = parsedPairs2.filter(p => !isValidOracleIdentifier(p.owner) || !isValidOracleIdentifier(p.table));
    if (invalidPairs2.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid identifier(s): ${invalidPairs2.map(p => `${p.owner}.${p.table}`).join(', ')}` });
    }

    const tablePairs2 = parsedPairs2.map(p => `('${p.owner}', '${p.table}')`).join(', ');

    const query = `
      SELECT MAX(SCN) as MAX_SCN
      FROM DBA_CAPTURE_PREPARED_TABLES
      WHERE (TABLE_OWNER, TABLE_NAME) IN (${tablePairs2})
    `;

    connection = await poolToUse.getConnection();
    const result = await connection.execute(query, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    // Also get MIN_REQUIRED_CAPTURE_CHANGE#
    const minScnQuery = `SELECT "MIN_REQUIRED_CAPTURE_CHANGE#" FROM V$DATABASE`;
    const minScnResult = await connection.execute(minScnQuery, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json({
      success: true,
      data: {
        maxInstantiationScn: result.rows[0]?.MAX_SCN || null,
        minRequiredCaptureScn: minScnResult.rows[0]?.["MIN_REQUIRED_CAPTURE_CHANGE#"] || null
      }
    });
  } catch (error) {
    console.error('SCN validation check failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// Open Transactions check
app.post('/api/check/open-transactions', async (req, res) => {
  let connection;
  try {
    const { dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    const query = `
      SELECT MIN(START_TIME) as MIN_START_TIME,
             MIN(START_SCN) as MIN_START_SCN,
             COUNT(*) as OPEN_TXN_COUNT
      FROM GV$TRANSACTION
    `;

    connection = await poolToUse.getConnection();
    const result = await connection.execute(query, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json({
      success: true,
      data: result.rows,
      columns: result.metaData?.map(col => col.name) || []
    });
  } catch (error) {
    console.error('Open transactions check failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// Check Other DB Values
app.post('/api/check/db-values', async (req, res) => {
  let connection;
  try {
    const { dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    const query = `
      SELECT name, value
      FROM v$parameter
      WHERE name IN (
        'db_name',
        'db_unique_name',
        'log_archive_dest_1',
        'enable_goldengate_replication',
        'log_archive_dest_2',
        'log_archive_dest_state_1',
        'log_archive_dest_state_2',
        'fal_client',
        'fal_server',
        'standby_file_management',
        'dg_broker_start',
        'dg_broker_config_file1',
        'dg_broker_config_file2',
        'log_archive_config',
        'service_names',
        'streams_pool_size'
      )
      AND value IS NOT NULL
      UNION
      SELECT 'global_name' as name, GLOBAL_NAME as value
      FROM global_name
      ORDER BY name
    `;

    connection = await poolToUse.getConnection();
    const result = await connection.execute(query, {}, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    res.json({
      success: true,
      data: result.rows,
      columns: result.metaData?.map(col => col.name) || []
    });
  } catch (error) {
    console.error('DB values check failed:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// Action: Build Dictionary Dumps
app.post('/api/action/build-dictionary', async (req, res) => {
  let connection;
  try {
    const { dbConfig } = req.body;

    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    connection = await poolToUse.getConnection();

    // Execute the dictionary build procedure
    await connection.execute(
      `BEGIN DBMS_LOGMNR_D.BUILD(OPTIONS => DBMS_LOGMNR_D.STORE_IN_REDO_LOGS); END;`
    );

    res.json({
      success: true,
      message: 'Dictionary build executed successfully'
    });
  } catch (error) {
    console.error('Dictionary build failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Action: Prepare Table Instantiation
app.post('/api/action/prepare-tables', async (req, res) => {
  let connection;
  const { tables, dbConfig } = req.body; // Expected format: [{ schema: 'SCHEMA1', table: 'TABLE1' }, ...]

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Tables array is required'
    });
  }

  try {
    // Use the provided dbConfig or fall back to the legacy pool
    let poolToUse = pool;
    if (dbConfig) {
      poolToUse = await getOrCreatePool(dbConfig);
    }

    if (!poolToUse) {
      return res.status(400).json({
        success: false,
        message: 'Database connection not initialized'
      });
    }

    connection = await poolToUse.getConnection();
    const results = [];

    // Execute PREPARE_TABLE_INSTANTIATION for each table
    for (const tableInfo of tables) {
      const { schema, table } = tableInfo;
      const fullTableName = `${schema}.${table}`;

      try {
        await connection.execute(
          `BEGIN
             DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION(
               table_name           => :tableName,
               supplemental_logging => 'NONE',
               container            => 'CURRENT'
             );
           END;`,
          { tableName: fullTableName }
        );

        results.push({
          table: fullTableName,
          success: true,
          message: 'Table prepared successfully'
        });
      } catch (tableError) {
        results.push({
          table: fullTableName,
          success: false,
          message: tableError.message
        });
      }
    }

    const allSuccess = results.every(r => r.success);

    res.json({
      success: allSuccess,
      message: allSuccess
        ? 'All tables prepared successfully'
        : 'Some tables failed to prepare',
      results
    });
  } catch (error) {
    console.error('Table preparation failed:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Monitor OJET Source endpoint
app.post('/api/monitor-source', async (req, res) => {
  try {
    let { striimUrl, username, password, namespace, sourceName } = req.body;

    // Validation
    if (!striimUrl || !username || !password || !namespace || !sourceName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: striimUrl, username, password, namespace, sourceName'
      });
    }

    // Clean up the URL - remove trailing slash if present
    striimUrl = striimUrl.trim().replace(/\/+$/, '');

    console.log(`Cleaned Striim URL: ${striimUrl}`);

    // Step 1: First, try to check if the server is reachable
    let baseUrlReachable = false;
    try {
      console.log(`Checking if ${striimUrl} is reachable...`);
      const healthCheck = await axios.get(striimUrl, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      baseUrlReachable = true;
      log.debug(`Server responded with status: ${healthCheck.status}`);
    } catch (healthError) {
      log.error(`Server not reachable:`, healthError.message);

      if (healthError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: `Cannot connect to server at ${striimUrl}`,
          details: 'Connection refused. Please verify:\n' +
                  '1. The server is running\n' +
                  '2. The URL and port are correct (e.g., http://10.142.0.46:9080)\n' +
                  '3. There are no firewall rules blocking the connection'
        });
      } else if (healthError.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: `Cannot resolve hostname: ${striimUrl}`,
          details: 'DNS lookup failed. Please verify the hostname/IP address is correct.'
        });
      }
    }

    // Step 2: Authenticate with Striim
    let authToken;
    try {
      const authUrl = `${striimUrl}/security/authenticate`;
      const authData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

      log.debug(`Authenticating with Striim: ${authUrl} (user: ${username})`);

      const authResponse = await axios.post(
        authUrl,
        authData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000, // 10 second timeout
          maxRedirects: 0 // Don't follow redirects
        }
      );

      authToken = authResponse.data.token;

      if (!authToken) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed: No token received from Striim'
        });
      }

      log.info('Striim authentication successful');
    } catch (authError) {
      log.error(`Striim authentication failed: ${authError.message} (code: ${authError.code})`);
      if (authError.response) {
        log.debug(`Auth error response status: ${authError.response.status}`);
      }

      let errorMessage = 'Authentication failed';

      if (authError.code === 'ECONNREFUSED') {
        errorMessage = `Cannot connect to Striim at ${striimUrl}. Please check the URL and ensure Striim is running.`;
      } else if (authError.response?.status === 404) {
        errorMessage = `Authentication endpoint not found. Please verify the Striim URL: ${striimUrl}`;
      } else if (authError.response?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (authError.response?.data?.message) {
        errorMessage = authError.response.data.message;
      } else {
        errorMessage = authError.message;
      }

      return res.status(401).json({
        success: false,
        message: errorMessage
      });
    }

    // Step 3: Execute monitoring commands
    const fullSourceName = `${namespace}.${sourceName}`;
    const commands = [
      `show ${fullSourceName} status;`,
      `show ${fullSourceName} status details;`,
      `show ${fullSourceName} memory;`,
      `show ${fullSourceName} memory details;`,
      `mon ${fullSourceName};`
    ];

    const results = [];

    for (const command of commands) {
      try {
        const commandResponse = await axios.post(
          `${striimUrl}/api/v2/tungsten`,
          command,
          {
            headers: {
              'Authorization': `STRIIM-TOKEN ${authToken}`,
              'Content-Type': 'text/plain'
            }
          }
        );

        // Extract only the Status or Memory data from the response
        let output = commandResponse.data;
        let extractedData = null;

        // Check if this is a 'mon' command
        const isMonCommand = command.trim().toLowerCase().startsWith('mon ');

        if (Array.isArray(output) && output.length > 0) {
          const firstItem = output[0];

          if (isMonCommand) {
            // For 'mon' command, the output is directly an object (not an array)
            if (firstItem.output && typeof firstItem.output === 'object') {
              const dataItem = firstItem.output;

              // Map camelCase field names to display names and extract only specific fields
              const fieldMapping = {
                'lastEventPosition': 'Last Event Position',
                'lastEventReadAge': 'Last Event Read Age',
                'latestActivity': 'Latest Activity',
                'memoryUsageApplySession': 'Memory Usage Apply Session',
                'memoryUsageCaptureSession': 'Memory Usage Capture Session',
                'memoryUsageLogminerSession': 'Memory Usage LogMiner Session',
                'memoryUsageStreamsPool': 'Memory Usage Streams Pool',
                'readTimestamp': 'Read Timestamp',
                'timestamp': 'Timestamp'
              };

              extractedData = {};
              Object.entries(fieldMapping).forEach(([camelKey, displayName]) => {
                if (dataItem[camelKey] !== undefined) {
                  extractedData[displayName] = dataItem[camelKey];
                }
              });
            }
          } else {
            // For 'show' commands, extract Status or Memory object
            if (firstItem.output && Array.isArray(firstItem.output) && firstItem.output.length > 0) {
              const dataItem = firstItem.output[0];
              if (dataItem.Status) {
                extractedData = dataItem.Status;
              } else if (dataItem.Memory) {
                extractedData = dataItem.Memory;
              }
            }
          }
        }

        // Convert to ASCII table
        const formattedOutput = extractedData
          ? jsonToTable(extractedData)
          : JSON.stringify(output, null, 2);

        results.push({
          command: command,
          output: formattedOutput,
          success: true
        });
      } catch (cmdError) {
        console.error(`Error executing command "${command}":`, cmdError.message);

        // Convert error response to string if it's an object
        let errorOutput = cmdError.response?.data || cmdError.message || 'Failed to execute command';
        if (typeof errorOutput === 'object') {
          errorOutput = JSON.stringify(errorOutput, null, 2);
        }

        results.push({
          command: command,
          output: errorOutput,
          success: false
        });
      }
    }

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error('Error monitoring source:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to monitor source'
    });
  }
});

// Striim Authentication endpoint
app.post('/api/striim-authenticate', async (req, res) => {
  try {
    let { striimUrl, username, password } = req.body;

    // Validation
    if (!striimUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: striimUrl, username, password'
      });
    }

    // Clean up the URL - remove trailing slash if present
    striimUrl = striimUrl.trim().replace(/\/+$/, '');

    console.log(`Authenticating to Striim at: ${striimUrl}`);

    // Authenticate with Striim
    const authUrl = `${striimUrl}/security/authenticate`;
    const authData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    console.log(`Authentication URL: ${authUrl}`);

    const authResponse = await axios.post(
      authUrl,
      authData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    const authToken = authResponse.data.token;

    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No token received from Striim'
      });
    }

    console.log('Authentication successful');

    res.json({
      success: true,
      token: authToken
    });

  } catch (error) {
    console.error('Authentication error:', error.message);

    let errorMessage = 'Authentication failed';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Cannot connect to Striim. Please check the URL and ensure Striim is running.`;
    } else if (error.response?.status === 404) {
      errorMessage = `Authentication endpoint not found. Please verify the Striim URL.`;
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid username or password';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else {
      errorMessage = error.message;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Striim Mon Command endpoint
app.post('/api/striim-mon-command', async (req, res) => {
  try {
    let { striimUrl, token, namespace, sourceName } = req.body;

    // Validation
    if (!striimUrl || !token || !namespace || !sourceName) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: striimUrl, token, namespace, sourceName'
      });
    }

    // Clean up the URL - remove trailing slash if present
    striimUrl = striimUrl.trim().replace(/\/+$/, '');

    const fullSourceName = `${namespace}.${sourceName}`;
    const monCommand = `mon ${fullSourceName};`;

    console.log(`Executing mon command: ${monCommand}`);

    // Execute mon command
    const commandResponse = await axios.post(
      `${striimUrl}/api/v2/tungsten`,
      monCommand,
      {
        headers: {
          'Authorization': `STRIIM-TOKEN ${token}`,
          'Content-Type': 'text/plain'
        },
        timeout: 15000
      }
    );

    console.log('Mon command response:', JSON.stringify(commandResponse.data, null, 2));

    // Extract metrics from response
    let metrics = {};

    if (Array.isArray(commandResponse.data) && commandResponse.data.length > 0) {
      const firstItem = commandResponse.data[0];
      if (firstItem.output && Array.isArray(firstItem.output) && firstItem.output.length > 0) {
        const dataItem = firstItem.output[0];

        // Extract the specific metrics we want
        const metricsToExtract = [
          'Last Event Position',
          'Last Event Read Age',
          'Latest Activity',
          'Memory Usage Apply Session',
          'Memory Usage Capture Session',
          'Memory Usage LogMiner Session',
          'Memory Usage Streams Pool',
          'Read Timestamp',
          'Timestamp'
        ];

        metricsToExtract.forEach(metricName => {
          if (dataItem[metricName] !== undefined) {
            metrics[metricName] = dataItem[metricName];
          }
        });
      }
    }

    if (Object.keys(metrics).length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No metrics found in response',
        rawResponse: commandResponse.data
      });
    }

    res.json({
      success: true,
      metrics: metrics
    });

  } catch (error) {
    console.error('Mon command error:', error.message);

    let errorMessage = 'Failed to execute mon command';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = `Cannot connect to Striim. Please check the URL.`;
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication token expired or invalid';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else {
      errorMessage = error.message;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage
    });
  }
});

// OJET Queries - Recovery Checkpoint and SCN Tracking
app.post('/api/ojet-queries/checkpoint-scn', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
WHERE client_status = 'ATTACHED'`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing checkpoint SCN query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Capture Process Status
app.post('/api/ojet-queries/capture-status', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    // Create a temporary pool for this query
    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
ORDER BY ROUND((vc.capture_time - vc.capture_message_create_time) * 86400) DESC`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing capture status query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Interested LCR (Capture Process Memory Usage)
app.post('/api/ojet-queries/interested-lcr', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
)`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing interested LCR query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Outbound Server (Dispatcher)
app.post('/api/ojet-queries/outbound-server', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
JOIN v$xstream_outbound_server vo ON dxo.server_name = vo.server_name`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing outbound server query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Long Running Transactions
app.post('/api/ojet-queries/long-running-transactions', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
    s.username,
    s.machine,
    xt.transaction_id,
    xt.total_message_count,
    TO_CHAR(xt.first_message_time, 'YYYY-MM-DD HH24:MI:SS') AS start_time
FROM v$xstream_transaction xt
JOIN v$transaction t ON xt.transaction_id = t.xidusn || '.' || t.xidslot || '.' || t.xidsqn
JOIN v$session s ON t.ses_addr = s.saddr
WHERE xt.total_message_count > 1000`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing long running transactions query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Propagation Receiver
app.post('/api/ojet-queries/propagation-receiver', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
FROM GV$PROPAGATION_RECEIVER`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing propagation receiver query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Streams Pool Memory Usage
app.post('/api/ojet-queries/streams-pool', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
    STREAM_POOL_TOTAL_MB,
    STREAM_POOL_FREE_MB,
    STREAM_POOL_USAGE_PCT,
    CASE
        -- 🔴 RED FLAGS
        WHEN STREAM_POOL_USAGE_PCT > 95 THEN '🔴 RED: MEMORY EXHAUSTION (DANGER)'
        WHEN STREAM_POOL_FREE_MB < 50 THEN '🔴 RED: CRITICAL FREE SPACE'
        -- 🟡 YELLOW FLAGS
        WHEN STREAM_POOL_USAGE_PCT > 80 THEN '🟡 YELLOW: HIGH UTILIZATION (MONITOR)'
        WHEN STREAM_POOL_TOTAL_MB < 512 THEN '🟡 YELLOW: POOL MAY BE TOO SMALL FOR XSTREAM'
        -- 🟢 GREEN
        ELSE '🟢 GREEN: HEALTHY BUFFER'
    END AS POOL_HEALTH_STATUS
FROM (
    SELECT ROUND(CURRENT_SIZE / 1024 / 1024, 2) AS STREAM_POOL_TOTAL_MB,
           ROUND((CURRENT_SIZE - TOTAL_MEMORY_ALLOCATED) / 1024 / 1024, 2) AS STREAM_POOL_FREE_MB,
           ROUND((TOTAL_MEMORY_ALLOCATED / NULLIF(CURRENT_SIZE, 0)) * 100, 2) AS STREAM_POOL_USAGE_PCT
    FROM V$STREAMS_POOL_STATISTICS
)`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing streams pool query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Database Memory Parameters
app.post('/api/ojet-queries/db-memory-params', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT NAME, VALUE
FROM V$PARAMETER
WHERE NAME IN ('sga_target','sga_max_size','shared_pool_size','large_pool_size',
               'java_pool_size','streams_pool_size','memory_max_target','memory_target','db_cache_size')
ORDER BY NAME`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing db memory params query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Finding "Holes" on Arch Log Shipping
app.post('/api/ojet-queries/arch-log-holes', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
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
WHERE NEXT_SEQ - SEQUENCE# > 1`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing arch log holes query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// OJET Queries - Archive Logs Safe to Delete
app.post('/api/ojet-queries/arch-log-cleanup', async (req, res) => {
  let connection;
  try {
    const { host, port, sid, username, password } = req.body;

    const poolToUse = await getOrCreatePool({ host, port, sid, username, password });

    connection = await poolToUse.getConnection();

    const query = `SELECT
    l.SEQUENCE#,
    l.NAME,
    l.NEXT_SCN,c.CAPTURE_NAME,
    CASE
        WHEN l.NEXT_SCN < c.REQUIRED_CHECKPOINT_SCN THEN 'SAFE_TO_DELETE'
        ELSE 'KEEP_-_CAPTURE_NEEDS_THIS'
    END AS ACTION
FROM DBA_REGISTERED_ARCHIVED_LOG l, DBA_CAPTURE c
ORDER BY l.SEQUENCE# DESC
FETCH FIRST 100 ROWS ONLY`;

    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

    res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error('Error executing arch log cleanup query:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    connected: pool !== null,
    timestamp: new Date().toISOString()
  });
});

// Cleanup endpoint - called when browser/tab is closed
app.post('/api/cleanup', async (req, res) => {
  console.log('Cleanup request received from client');

  try {
    // Close all connection pools
    if (connectionPools.size > 0) {
      console.log(`Closing ${connectionPools.size} connection pool(s) due to client disconnect...`);

      const closePromises = [];
      for (const [key, poolInstance] of connectionPools.entries()) {
        console.log(`Closing pool: ${key}`);
        closePromises.push(
          poolInstance.close(5).catch(err => {
            console.error(`Error closing pool ${key}:`, err.message);
          })
        );
      }

      await Promise.all(closePromises);
      connectionPools.clear();
      console.log('All connection pools closed successfully');
    }

    // Close legacy pool if it exists
    if (pool) {
      console.log('Closing legacy connection pool...');
      await pool.close(5);
      pool = null;
      console.log('Legacy pool closed successfully');
    }

    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Cleanup failed'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`OJET Troubleshooter API running on port ${PORT}`);
  console.log(`Listening on 0.0.0.0:${PORT} (accessible externally)`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown function
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, closing all database connections...`);

  try {
    // Close all connection pools in the Map
    if (connectionPools.size > 0) {
      console.log(`Closing ${connectionPools.size} connection pool(s)...`);

      const closePromises = [];
      for (const [key, poolInstance] of connectionPools.entries()) {
        console.log(`Closing pool: ${key}`);
        closePromises.push(
          poolInstance.close(10).catch(err => {
            console.error(`Error closing pool ${key}:`, err.message);
          })
        );
      }

      await Promise.all(closePromises);
      connectionPools.clear();
      console.log('All connection pools closed successfully');
    }

    // Close legacy pool if it exists
    if (pool) {
      console.log('Closing legacy connection pool...');
      await pool.close(10);
      pool = null;
      console.log('Legacy pool closed successfully');
    }

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));  // Ctrl+C
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));   // Terminal closed

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await gracefulShutdown('UNHANDLED_REJECTION');
});


