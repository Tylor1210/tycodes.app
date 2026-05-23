import { getAccessToken, requestAccessToken } from './googleAuth';

const LS_SHEET_ID = 'tycodes_sheet_id';

export function getSheetId(): string | null {
  try {
    return localStorage.getItem(LS_SHEET_ID);
  } catch {
    return null;
  }
}

export function setSheetId(id: string) {
  localStorage.setItem(LS_SHEET_ID, id);
}

export function clearSheetId() {
  localStorage.removeItem(LS_SHEET_ID);
}

/** Helper to get token with auto-prompt if missing */
async function getToken(): Promise<string | null> {
  let token = getAccessToken();
  if (!token) {
    try {
      token = await requestAccessToken();
    } catch {
      return null;
    }
  }
  return token;
}

// ── Dashboard Data Fetching ──────────────────────────────────────────

export async function fetchDashboardData() {
  const sheetId = getSheetId();
  if (!sheetId) return null;
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?ranges=ScheduleBlocks!A4:D&ranges=Backlog!A4:C&ranges=Metrics!A4:B`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();

    const scheduleRows = data.valueRanges[0].values || [];
    const backlogRows = data.valueRanges[1].values || [];
    const metricsRows = data.valueRanges[2].values || [];

    const schedule = scheduleRows
      .filter((r: any) => r && r[0] && r[2]) // Must have start time and name
      .map((r: any) => ({
        StartTime: r[0] || '', EndTime: r[1] || '', TaskName: r[2] || '', Color: r[3] || '#6366f1' // fallback color
      }));

    const backlog = backlogRows
      .filter((r: any) => r && r[0]) // Must have task name
      .map((r: any, i: number) => ({
        id: `sheet-${i}-${Date.now()}`,
        TaskName: r[0] || '', Status: r[1] || 'pending', Timestamp: r[2] || new Date().toISOString()
      }));

    const metrics: Record<string, number> = {};
    metricsRows.forEach((r: any) => {
      if (r && r[0]) {
        metrics[r[0]] = parseFloat(r[1]) || 0;
      }
    });

    return { schedule, backlog, metrics, status: 'ok', timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('fetchDashboardData error:', err);
    return null;
  }
}

// ── Backlog actions ────────────────────────────────────────────

export async function appendBacklogTask(
  taskName: string,
  status: string,
  timestamp?: string,
): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  const ts = timestamp ?? new Date().toISOString();

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Backlog!A:C:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[taskName, status, ts]]
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Updates the status of an existing task by name */
export async function markTask(taskName: string, status: string): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  try {
    // 1. Get all backlog rows
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Backlog!A:B`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    const rows = data.values || [];

    // 2. Find row index (1-based, plus header row)
    const rowIdx = rows.findIndex((r: any) => r[0] === taskName);
    if (rowIdx === -1) return false;

    const actualRow = rowIdx + 1; // API rows are 1-indexed

    // 3. Update just the status column (B)
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Backlog!B${actualRow}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [[status]]
      })
    });

    return updateRes.ok;
  } catch {
    return false;
  }
}

/** Deletes a task row from the Backlog sheet by name */
export async function deleteBacklogTask(taskName: string): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  try {
    // 1. Get sheet metadata to find Backlog sheetId
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!metaRes.ok) return false;
    const metaData = await metaRes.json();
    const backlogSheet = metaData.sheets.find((s: any) => s.properties.title === 'Backlog');
    if (!backlogSheet) return false;

    // 2. Get backlog rows
    const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Backlog!A:A`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!valRes.ok) return false;
    const valData = await valRes.json();
    const rows = valData.values || [];
    
    // 3. Find the row index (0-indexed for batchUpdate deleteDimension)
    const rowIdx = rows.findIndex((r: any) => r[0] === taskName);
    if (rowIdx === -1) return false;

    // 4. Delete the row
    const delRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: backlogSheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIdx,
                endIndex: rowIdx + 1
              }
            }
          }
        ]
      })
    });

    return delRes.ok;
  } catch {
    return false;
  }
}

// ── Schedule actions ──────────────────────────────────────────

/** Replaces the entire ScheduleBlocks sheet */
export async function updateSchedule(
  blocks: Array<{ StartTime: string; EndTime: string; TaskName: string; Color: string }>,
): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  try {
    // 1. Clear existing data (A4:D)
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ScheduleBlocks!A4:D:clear`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 2. Append new blocks
    if (blocks.length > 0) {
      const values = blocks.map(b => [b.StartTime, b.EndTime, b.TaskName]);
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ScheduleBlocks!A4:C:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });
      return res.ok;
    }
    return true;
  } catch {
    return false;
  }
}

// ── Metrics actions ───────────────────────────────────────────

/** Upserts a single key/value metric row */
export async function updateMetric(key: string, value: string | number): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  try {
    // 1. Get metrics rows
    const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Metrics!A:A`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!valRes.ok) return false;
    const valData = await valRes.json();
    const rows = valData.values || [];
    
    // 2. Find row index (1-indexed for direct cell update)
    const rowIdx = rows.findIndex((r: any) => r[0] === key);
    
    if (rowIdx !== -1) {
      // Update existing
      const actualRow = rowIdx + 1;
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Metrics!B${actualRow}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[value]] })
      });
      return res.ok;
    } else {
      // Append new
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Metrics!A:B:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[key, value]] })
      });
      return res.ok;
    }
  } catch {
    return false;
  }
}

// ── Portfolio actions ───────────────────────────────────────────

/** Replaces the entire Portfolio sheet */
export async function syncPortfolioToSheet(
  assets: Array<{ ticker: string; shares: string; cost: string }>,
): Promise<boolean> {
  const sheetId = getSheetId();
  if (!sheetId) return false;
  const token = await getToken();
  if (!token) return false;

  try {
    // 1. Clear ALL 4 columns including price formula column D
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Portfolio!A4:D:clear`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 2. Write new assets to a FIXED range (not :append) so row positions never drift
    if (assets.length > 0) {
      const values = assets.map((a) => {
        const ticker = a.ticker.trim().toUpperCase();
        return [
          ticker,
          a.shares || '0',
          a.cost || '0',
          `=IFERROR(GOOGLEFINANCE("${ticker}", "price"), "N/A")`
        ];
      });
      // Use PUT to exact range so data always starts at row 4 with no gaps
      const endRow = 4 + assets.length - 1;
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Portfolio!A4:D${endRow}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });
      return res.ok;
    }
    return true;
  } catch {
    return false;
  }
}

/** Fetches portfolio holdings and evaluated live prices from the Portfolio sheet */
export async function fetchPortfolioData(): Promise<{ holdings: Array<{id: string, ticker: string, shares: string, cost: string}>, prices: Record<string, number> } | null> {
  const sheetId = getSheetId();
  if (!sheetId) return null;
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Portfolio!A4:D?valueRenderOption=UNFORMATTED_VALUE`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.values || [];
    
    const holdings = [];
    const prices: Record<string, number> = {};
    
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0] || String(r[0]).trim() === '') continue;
      
      const ticker = String(r[0]).trim();
      const shares = r[1] != null ? String(r[1]) : '';
      const cost = r[2] != null ? String(r[2]) : '';
      
      holdings.push({
        id: `portfolio-${i}-${Date.now()}`,
        ticker,
        shares,
        cost
      });
      
      const rawPrice = r[3];
      if (rawPrice !== 'N/A' && rawPrice !== undefined) {
        const price = parseFloat(rawPrice);
        if (!isNaN(price)) {
          prices[ticker] = price;
        }
      }
    }
    return { holdings, prices };
  } catch {
    return null;
  }
}
