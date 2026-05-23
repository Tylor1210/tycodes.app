import { getAccessToken, requestAccessToken } from './googleAuth';

/**
 * Creates a new Tycodes Ambient Routine spreadsheet in the user's Drive,
 * sets up the required tabs, and returns the spreadsheet ID.
 */
export async function provisionDashboardSheet(): Promise<string> {
  let token = getAccessToken();
  if (!token) {
    token = await requestAccessToken();
  }

  // 1. Search for existing spreadsheet
  try {
    const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='Tycodes Ambient Routine' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        // Reuse existing sheet
        return searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Failed to search Drive, creating new sheet:', err);
  }

  // 2. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'Tycodes Ambient Routine'
      },
      sheets: [
        { properties: { title: 'ScheduleBlocks' } },
        { properties: { title: 'Backlog' } },
        { properties: { title: 'Metrics' } },
        { properties: { title: 'Portfolio' } }
      ]
    })
  });

  if (!createRes.ok) {
    throw new Error('Failed to create spreadsheet: ' + await createRes.text());
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 3. Setup Headers via batchUpdate
  const warningText = '⚠️ TYCODES AMBIENT SYSTEM DATA - DO NOT DELETE, RENAME, OR MODIFY THIS SHEET';
  
  const valuesReq = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        // Warnings for all 3 sheets
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[0].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            rows: [{ values: [{ userEnteredValue: { stringValue: warningText } }] }],
            fields: 'userEnteredValue'
          }
        },
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[1].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            rows: [{ values: [{ userEnteredValue: { stringValue: warningText } }] }],
            fields: 'userEnteredValue'
          }
        },
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[2].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            rows: [{ values: [{ userEnteredValue: { stringValue: warningText } }] }],
            fields: 'userEnteredValue'
          }
        },
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[3].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
            rows: [{ values: [{ userEnteredValue: { stringValue: warningText } }] }],
            fields: 'userEnteredValue'
          }
        },
        // ScheduleBlocks headers (Row 3): ['StartTime', 'EndTime', 'TaskName']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[0].properties.sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'StartTime' } }, { userEnteredValue: { stringValue: 'EndTime' } }, { userEnteredValue: { stringValue: 'TaskName' } }] }],
            fields: 'userEnteredValue'
          }
        },
        // Backlog headers (Row 3): ['TaskName', 'Status', 'Timestamp']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[1].properties.sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'TaskName' } }, { userEnteredValue: { stringValue: 'Status' } }, { userEnteredValue: { stringValue: 'Timestamp' } }] }],
            fields: 'userEnteredValue'
          }
        },
        // Metrics headers (Row 3): ['Key', 'Value']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[2].properties.sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 2 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'Key' } }, { userEnteredValue: { stringValue: 'Value' } }] }],
            fields: 'userEnteredValue'
          }
        },
        // Portfolio headers (Row 3): ['Ticker', 'Shares', 'Cost']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[3].properties.sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 3 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'Ticker' } }, { userEnteredValue: { stringValue: 'Shares' } }, { userEnteredValue: { stringValue: 'Cost' } }] }],
            fields: 'userEnteredValue'
          }
        }
      ]
    })
  });

  if (!valuesReq.ok) {
    throw new Error('Failed to setup headers: ' + await valuesReq.text());
  }

  // 4. Seed default data rows so the sheet isn't empty
  const now = new Date().toISOString();
  const seedRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'ScheduleBlocks!A4:D',
          values: [
            ['06:00', '07:00', 'Workout', '#10b981'],
            ['07:00', '08:00', 'Breakfast', '#f59e0b'],
            ['08:00', '12:00', 'Deep Work', '#6366f1'],
            ['12:00', '13:00', 'Lunch', '#f59e0b'],
            ['13:00', '17:00', 'Work Block 2', '#6366f1'],
            ['18:00', '19:00', 'Dinner', '#f59e0b'],
            ['22:00', '06:00', 'Sleep', '#06b6d4'],
          ]
        },
        {
          range: 'Backlog!A4:C',
          values: [
            ['Welcome to Tycodes! Edit or delete this row.', 'pending', now],
          ]
        },
        {
          range: 'Metrics!A4:B',
          values: [
            ['unsorted_files', '0'],
            ['unsorted_notes', '0'],
          ]
        }
      ]
    })
  });

  if (!seedRes.ok) {
    console.warn('Failed to seed default data:', await seedRes.text());
    // Non-fatal - sheet structure is still valid
  }

  return spreadsheetId;
}
