# Backend API Reference

Base URL: `http://localhost:3001`

All endpoints accept and return `application/json`. The backend uses Oracle connection pools — you must call `/api/connect` (or `/api/connect-downstream`) before invoking query endpoints.

---

## Authentication / Connection

### POST /api/connect

Creates or reuses an Oracle connection pool for the primary database.

**Request body**
```json
{
  "host":     "10.0.0.1",
  "port":     "1521",
  "sid":      "ORCL",
  "username": "ojet_monitor",
  "password": "secret"
}
```

**Response 200**
```json
{ "message": "Successfully connected to Oracle database" }
```

**Response 500**
```json
{ "error": "Connection failed: ORA-12154: ..." }
```

---

### POST /api/connect-downstream

Creates or reuses an Oracle connection pool for the downstream database. Identical body/response shape to `/api/connect`. Downstream pools are managed independently from the primary pool.

---

### POST /api/test-connection

Tests that an existing primary connection pool is alive by executing `SELECT 1 FROM DUAL`.

**Request body**: same as `/api/connect`

**Response 200**
```json
{ "success": true, "message": "Connection successful" }
```

---

### POST /api/disconnect

Closes the primary connection pool.

**Response 200**
```json
{ "message": "Disconnected successfully" }
```

---

## Query Endpoints

All query endpoints require an active connection pool (established via `/api/connect`).

### POST /api/query/:queryName

Executes one of the 10 pre-configured OJET monitoring queries.

**URL parameter**: `queryName` — one of:
| queryName | Description |
|---|---|
| `recovery-checkpoint` | Recovery Checkpoint and SCN Tracking |
| `capture-status` | Check Capture Process Status |
| `interested-lcr` | Interested LCR / Memory Usage |
| `outbound-server` | Outbound Server (Dispatcher) |
| `long-running-transactions` | Long Running Transactions & Errors |
| `data-transport` | Check Data Transport |
| `streams-pool` | Check Streams Pool Memory Usage |
| `memory-parameters` | Check Database Memory Parameters |
| `arch-log-holes` | Finding Holes on Arch Log Shipping |
| `safe-archive-logs` | Archive Logs Safe to Delete |

**Request body** (optional params, only needed for some queries):
```json
{
  "captureId": "STRIIM$CAP1"
}
```

**Response 200**
```json
{
  "columns": ["CAPTURE_NAME", "CAPTURED_SCN", "APPLIED_SCN", "..."],
  "rows":    [["CAP1", "12345678", "12345600", "..."]]
}
```

**Response 400**
```json
{ "error": "Connection pool not initialized. Please connect first." }
```

---

## Validation Endpoints

### POST /api/run-check

Executes a validation check SQL query.

**Request body**
```json
{
  "checkId":    "table-instantiation",
  "params":     { "tables": "SCHEMA1.TABLE1;SCHEMA2.TABLE2" },
  "dbType":     "primary"
}
```

`dbType` is `"primary"` (default) or `"downstream"`. Routes the query to the correct connection pool.

**Response 200**
```json
{
  "columns": ["TABLE_NAME", "INSTANTIATION_SCN", "..."],
  "rows":    [["SCHEMA1.TABLE1", "9876543", "..."]]
}
```

---

### POST /api/execute-action

Executes a corrective action (Build Dictionary or Prepare Tables).

**Request body**
```json
{
  "action":  "prepare-tables",
  "params":  { "tables": "SCHEMA1.TABLE1;SCHEMA1.TABLE2" },
  "dbType":  "primary"
}
```

Supported `action` values:
- `build-dictionary` — executes `DBMS_LOGMNR_D.BUILD` and `DBMS_LOGMNR_D.STORE_IN_REDO_LOGS`
- `prepare-tables` — executes `DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION` for each `owner.table` entry

Table names are validated against `^[A-Z_$#][A-Z0-9_$#]*$/i` before SQL execution. Invalid identifiers return HTTP 400.

**Response 200**
```json
{ "message": "Action completed successfully", "details": "..." }
```

**Response 400**
```json
{ "error": "Invalid Oracle identifier: DROP--TABLE" }
```

---

## Monitor Endpoints

### POST /api/striim-command

Forwards an OJET `show` command to the Striim REST API and returns the formatted output.

**Request body**
```json
{
  "striimUrl":  "http://10.0.0.20:9080",
  "username":   "admin",
  "password":   "striim",
  "namespace":  "admin",
  "sourceName": "OJET_SOURCE",
  "command":    "status"
}
```

`command` values: `status`, `status details`, `memory`, `memory details`

**Response 200**
```json
{
  "output": "┌──────────────┬────────────┐\n│ Field        │ Value      │\n..."
}
```

**Response 502**
```json
{ "error": "Cannot connect to Striim server: ECONNREFUSED" }
```

---

## Error Codes

| HTTP | Meaning |
|---|---|
| 400 | Bad request — missing params, invalid Oracle identifier, or malformed body |
| 500 | Oracle error or unhandled server exception — check backend logs |
| 502 | Striim server unreachable or returned unexpected response |

---

## Ports

| Service | Default Port | Configure In |
|---|---|---|
| Frontend | 3000 | `frontend/vite.config.js` |
| Backend  | 3001 | `backend/.env` (`PORT=3001`) |

---

## Related Documentation

- [Installation Guide](INSTALLATION.md)
- [Database Setup](DATABASE_SETUP.md)
- [README](README.md)
