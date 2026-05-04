# Database Setup Guide

This guide covers the Oracle user creation and privilege grants required to use OJET Troubleshooter.

---

## Prerequisites

- Oracle Database 12c or higher (non-CDB or CDB with appropriate PDB access)
- DBA or SYSDBA access to create users and grant privileges
- OJET/XStream configured on the database

---

## 1. Create Monitoring User

```sql
-- Create the dedicated monitoring user
CREATE USER ojet_monitor IDENTIFIED BY "<strong_password>"
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;
```

> You can reuse an existing application user if preferred — just apply the grants below.

---

## 2. Grant Required Privileges

### Session

```sql
GRANT CREATE SESSION TO ojet_monitor;
```

### V$ / GV$ System Views

```sql
-- Core capture and XStream views
GRANT SELECT ON v_$archived_log           TO ojet_monitor;
GRANT SELECT ON v_$database               TO ojet_monitor;
GRANT SELECT ON v_$parameter              TO ojet_monitor;
GRANT SELECT ON v_$xstream_capture        TO ojet_monitor;
GRANT SELECT ON v_$xstream_outbound_server TO ojet_monitor;
GRANT SELECT ON v_$xstream_transaction    TO ojet_monitor;
GRANT SELECT ON v_$transaction            TO ojet_monitor;
GRANT SELECT ON v_$session                TO ojet_monitor;
GRANT SELECT ON v_$sgastat               TO ojet_monitor;

-- RAC / multi-instance views (required for GV$ queries)
GRANT SELECT ON gv_$transaction           TO ojet_monitor;
GRANT SELECT ON gv_$session               TO ojet_monitor;
GRANT SELECT ON gv_$propagation_receiver  TO ojet_monitor;
```

### DBA Views

```sql
GRANT SELECT ON dba_capture               TO ojet_monitor;
GRANT SELECT ON dba_capture_prepared_tables TO ojet_monitor;
GRANT SELECT ON dba_xstream_outbound      TO ojet_monitor;
```

### Additional View

```sql
GRANT SELECT ON global_name               TO ojet_monitor;
```

---

## 3. Corrective Action Privileges (Optional)

The **Build Dictionary** and **Prepare Tables** corrective actions require execute privileges on Oracle-supplied packages. Only grant these if you intend to use automated corrective actions.

```sql
-- Build Dictionary (DBMS_LOGMNR_D.BUILD)
GRANT EXECUTE ON dbms_logmnr_d            TO ojet_monitor;

-- Prepare Tables (DBMS_CAPTURE_ADM.PREPARE_TABLE_INSTANTIATION)
GRANT EXECUTE ON dbms_capture_adm         TO ojet_monitor;
```

---

## 4. Verify Grants

Run this query to confirm all privileges are in place:

```sql
SELECT privilege, table_name
FROM   dba_tab_privs
WHERE  grantee = 'OJET_MONITOR'
ORDER BY table_name;
```

Expected output should include all V$, GV$, and DBA_ objects listed in Section 2.

---

## 5. CDB / Multitenant Considerations

If the database is a CDB and OJET is configured at the PDB level, connect directly to the target PDB:

```
Host: <pdb_scan_or_host>
Port: 1521
SID/Service: <pdb_service_name>
```

Creating the user inside the PDB (not at CDB root) is the recommended approach. All grants above apply at the PDB level.

For captures running at the CDB root (common user), prefix the username with `C##`:

```sql
CREATE USER c##ojet_monitor IDENTIFIED BY "<password>" CONTAINER=ALL;
GRANT CREATE SESSION TO c##ojet_monitor CONTAINER=ALL;
-- Apply V$ grants at CDB root level
```

---

## 6. Test Connection

After setup, use the **OJET Troubleshooter** sidebar connection form to verify:

1. Enter Host, Port, SID/Service, Username (`ojet_monitor`), Password
2. Click **"Connect to Database"**
3. Confirm the green success message appears

If you receive `ORA-01031: insufficient privileges`, re-verify the grants in Section 2 were applied to the correct user in the correct container.

---

## Related Documentation

- [Installation Guide](INSTALLATION.md)
- [OJET Queries Guide](OJET_QUERIES_GUIDE.md)
- [README](README.md)
