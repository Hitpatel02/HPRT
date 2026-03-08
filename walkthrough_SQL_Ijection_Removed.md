# SQL Injection Audit — Walkthrough

## Files Audited

| File | Queries | Status |
|---|---|---|
| [queries/authQueries.js](file:///H:/HPRT/backend/queries/authQueries.js) | 9 | ✅ All safe |
| [queries/logsQueries.js](file:///H:/HPRT/backend/queries/logsQueries.js) | 10 | ✅ All safe |
| [queries/whatsappQueries.js](file:///H:/HPRT/backend/queries/whatsappQueries.js) | 5 | ✅ All safe |
| [queries/reportQueries.js](file:///H:/HPRT/backend/queries/reportQueries.js) | 3 | ✅ All safe |
| [queries/documentQueries.js](file:///H:/HPRT/backend/queries/documentQueries.js) | 13 | ✅ All safe |
| [queries/clientQueries.js](file:///H:/HPRT/backend/queries/clientQueries.js) | 6 | ✅ All safe |
| [queries/groupQueries.js](file:///H:/HPRT/backend/queries/groupQueries.js) | 4 | ✅ All safe |
| [queries/reminderJobQueries.js](file:///H:/HPRT/backend/queries/reminderJobQueries.js) | 7 | ✅ All safe |
| [queries/settingsQueries.js](file:///H:/HPRT/backend/queries/settingsQueries.js) | 10 | 🔧 2 fixed |
| [queries/clientDocumentsQueries.js](file:///H:/HPRT/backend/queries/clientDocumentsQueries.js) | 4 | 🔧 1 fixed |
| [services/whatsappService.js](file:///H:/HPRT/backend/services/whatsappService.js) | 3 | 🔧 1 fixed |
| All controllers, workers, jobs | — | ✅ No SQL |

---

## Vulnerabilities Found & Fixed

All 4 vulnerabilities were **column-name interpolation** — internal type strings (not raw user input) were being concatenated into SQL SET/WHERE clauses without a whitelist guard.

### Fix 1 — `settingsQueries.getClientsForReminder`

`documentField` and `reminderField` are interpolated into `WHERE cd.${documentField}` and `WHERE cd.${reminderField}`.

**Fix:** Added explicit allow-lists; throws immediately if the value is not in the list.

```diff
+  const ALLOWED_DOCUMENT_FIELDS = ['gst_1_received', 'bank_statement_received', 'tds_received'];
+  const ALLOWED_REMINDER_FIELDS = ['gst_1_reminder_1_sent', 'gst_1_reminder_2_sent', ...];
+  if (!ALLOWED_DOCUMENT_FIELDS.includes(documentField)) throw new Error(...);
+  if (!ALLOWED_REMINDER_FIELDS.includes(reminderField)) throw new Error(...);
```

### Fix 2 — `settingsQueries.markReminderSent`

`reminderField` and `reminderDateField` interpolated into `SET ${reminderField} = true, ${reminderDateField} = NOW()`.

**Fix:** Replaced with a static map of 6 hardcoded SQL snippets keyed by `"field|dateField"`. Invalid combos throw.

```diff
+  const COLUMN_QUERIES = {
+    'gst_1_reminder_1_sent|gst_1_reminder_1_sent_date': 'SET gst_1_reminder_1_sent = true, ...',
+    ...
+  };
+  const setClause = COLUMN_QUERIES[key];
+  if (!setClause) throw new Error(...);
```

### Fix 3 — `clientDocumentsQueries.updateReminderStatus`

`column_prefix` + `reminder_number` interpolated into `SET ${column_prefix}${reminder_number}_sent`.

**Fix:** Static `COLUMN_MAP` keyed by `"prefix_number"` → `{ sent, date }` column names. Invalid key throws.

### Fix 4 — `whatsappService.updateReminderStatus`

Same pattern as Fix 3 — `prefix` + `reminderNumber` interpolated into SET.

**Fix:** Same static `COLUMN_MAP` approach. Unknown `documentType` now logs a warning and returns instead of silently falling through to `'reminder_'` prefix.

---

## Verification Grep Results

After all 4 fixes, a grep for unsafe interpolation patterns across the 3 changed files returned only safe hits:

| Match | Reason it's safe |
|---|---|
| `settingsQueries.js:220` — `SET ${updateFields.join(', ')}` | `updateFields` built from a `validFields` whitelist array |
| `settingsQueries.js:298-299` — `cd.${documentField/reminderField}` | Now guarded by explicit whitelists above it |
| `settingsQueries.js:331` — `${reminderField}\|${reminderDateField}` | Building the map lookup key (not in SQL) |
| `clientDocumentsQueries.js:42` — `SET ${cols.sent}` | `cols` comes from static `COLUMN_MAP`, never from input |
| `clientDocumentsQueries.js:130` — `SET ${columnName}` | `columnName` assigned only from a `switch` with hardcoded literals |
| `whatsappService.js:294` — `SET ${cols.sent}` | `cols` from static `COLUMN_MAP` |

**Zero remaining unsafe interpolations.**
