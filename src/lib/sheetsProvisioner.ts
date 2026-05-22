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

  // 1. Create Spreadsheet
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
        { properties: { title: 'Metrics' } }
      ]
    })
  });

  if (!createRes.ok) {
    throw new Error('Failed to create spreadsheet: ' + await createRes.text());
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Setup Headers via batchUpdate
  const valuesReq = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        // ScheduleBlocks headers: ['StartTime', 'EndTime', 'TaskName']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[0].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'StartTime' } }, { userEnteredValue: { stringValue: 'EndTime' } }, { userEnteredValue: { stringValue: 'TaskName' } }] }],
            fields: 'userEnteredValue'
          }
        },
        // Backlog headers: ['TaskName', 'Status', 'Timestamp']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[1].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'TaskName' } }, { userEnteredValue: { stringValue: 'Status' } }, { userEnteredValue: { stringValue: 'Timestamp' } }] }],
            fields: 'userEnteredValue'
          }
        },
        // Metrics headers: ['Key', 'Value']
        {
          updateCells: {
            range: { sheetId: sheetData.sheets[2].properties.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
            rows: [{ values: [{ userEnteredValue: { stringValue: 'Key' } }, { userEnteredValue: { stringValue: 'Value' } }] }],
            fields: 'userEnteredValue'
          }
        }
      ]
    })
  });

  if (!valuesReq.ok) {
    throw new Error('Failed to setup headers: ' + await valuesReq.text());
  }

  return spreadsheetId;
}
