/**
 * Ambient Dashboard — Google Apps Script Middleware
 * Turns a Google Sheet into a lightweight JSON REST API.
 *
 * Sheet Tabs Required:
 *   - ScheduleBlocks: StartTime | EndTime | TaskName | Color
 *   - Backlog:        TaskName  | Status  | Timestamp
 *   - Metrics:        Key       | Value
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'all';
  let result = {};

  try {
    if (action === 'all' || action === 'schedule') {
      const sheet = ss.getSheetByName('ScheduleBlocks');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        result.schedule = data.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });
          return obj;
        });
      }
    }

    if (action === 'all' || action === 'backlog') {
      const sheet = ss.getSheetByName('Backlog');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        result.backlog = data.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });
          return obj;
        });
      }
    }

    if (action === 'all' || action === 'metrics') {
      const sheet = ss.getSheetByName('Metrics');
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        result.metrics = {};
        data.slice(1).forEach(row => { result.metrics[row[0]] = row[1]; });
      }
    }

    result.status    = 'ok';
    result.timestamp = new Date().toISOString();
  } catch (err) {
    result = { status: 'error', message: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let result = {};

  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;

    // ── BACKLOG: append ────────────────────────────────────────
    if (action === 'append_backlog') {
      const sheet     = ss.getSheetByName('Backlog');
      const taskName  = payload.taskName  || 'Untitled Task';
      const status    = payload.status    || 'pending';
      const timestamp = payload.timestamp || new Date().toISOString();
      sheet.appendRow([taskName, status, timestamp]);
      result = { status: 'ok', message: 'Task appended' };
    }

    // ── BACKLOG: mark / update status ──────────────────────────
    else if (action === 'mark_task') {
      const sheet     = ss.getSheetByName('Backlog');
      const taskName  = payload.taskName;
      const newStatus = payload.status || 'done';
      const data      = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === taskName) {
          sheet.getRange(i + 1, 2).setValue(newStatus);
          break;
        }
      }
      result = { status: 'ok', message: `'${taskName}' → ${newStatus}` };
    }

    // ── BACKLOG: delete a row ──────────────────────────────────
    else if (action === 'delete_backlog') {
      const sheet    = ss.getSheetByName('Backlog');
      const taskName = payload.taskName;
      const data     = sheet.getDataRange().getValues();
      // Iterate backwards so row indices stay valid after deletion
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === taskName) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      result = { status: 'ok', message: `'${taskName}' deleted` };
    }

    // ── SCHEDULE: replace all blocks ───────────────────────────
    else if (action === 'update_schedule') {
      const sheet   = ss.getSheetByName('ScheduleBlocks');
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
      const blocks = payload.blocks || [];
      blocks.forEach(b => sheet.appendRow([b.StartTime, b.EndTime, b.TaskName, b.Color]));
      result = { status: 'ok', message: `${blocks.length} blocks written` };
    }

    // ── METRICS: upsert ────────────────────────────────────────
    else if (action === 'update_metric') {
      const sheet = ss.getSheetByName('Metrics');
      const key   = payload.key;
      const value = payload.value;
      const data  = sheet.getDataRange().getValues();
      let found   = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }
      if (!found) sheet.appendRow([key, value]);
      result = { status: 'ok', message: `Metric '${key}' = ${value}` };
    }

    else {
      result = { status: 'error', message: `Unknown action: ${action}` };
    }

    result.timestamp = new Date().toISOString();
  } catch (err) {
    result = { status: 'error', message: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
