# Google Sheets API Setup Guide

> **Ambient Dashboard — Backend Configuration**
>
> This guide walks you through turning a Google Sheet into a live REST API that powers the Ambient Dashboard frontend.

---

## Table of Contents

1. [Create the Google Sheet](#1-create-the-google-sheet)
2. [Set Up the Required Tabs](#2-set-up-the-required-tabs)
3. [Add Sample Data](#3-add-sample-data)
4. [Open the Apps Script Editor](#4-open-the-apps-script-editor)
5. [Paste the Code](#5-paste-the-code)
6. [Deploy as a Web App](#6-deploy-as-a-web-app)
7. [Get the Deployment URL](#7-get-the-deployment-url)
8. [Test with curl](#8-test-with-curl)
9. [Connect to the Frontend](#9-connect-to-the-frontend)

---

## 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com).
2. Click **Blank spreadsheet** (the `+` button).
3. Name the spreadsheet **`Ambient Dashboard Data`** (or any name you prefer — the name doesn't affect the API).

---

## 2. Set Up the Required Tabs

The Apps Script expects **exactly three** sheet tabs with these names (case-sensitive):

### Tab 1: `ScheduleBlocks`

| Column A | Column B | Column C | Column D |
| ----------- | ---------- | ----------- | ---------- |
| **StartTime** | **EndTime** | **TaskName** | **Color** |

- **StartTime** — 24-hour format string, e.g. `06:00`
- **EndTime** — 24-hour format string, e.g. `06:30`
- **TaskName** — Free-text label for the block
- **Color** — Any valid CSS color string (`#3B82F6`, `teal`, `rgb(59,130,246)`, etc.)

### Tab 2: `Backlog`

| Column A | Column B | Column C |
| ----------- | ---------- | ------------- |
| **TaskName** | **Status** | **Timestamp** |

- **TaskName** — Free-text label
- **Status** — One of: `pending`, `in-progress`, `done`, `blocked`
- **Timestamp** — ISO 8601 string, e.g. `2026-05-22T08:00:00Z`

### Tab 3: `Metrics`

| Column A | Column B |
| -------- | --------- |
| **Key** | **Value** |

- **Key** — A unique metric identifier string (e.g. `unsorted_files`)
- **Value** — Numeric or string value

> **Tip:** Right-click the default "Sheet1" tab at the bottom and select **Rename** to create the first tab. Click the **+** button to add the remaining two tabs.

---

## 3. Add Sample Data

### ScheduleBlocks — Full Daily Routine

| StartTime | EndTime | TaskName | Color |
| --------- | ------- | ----------------------- | --------- |
| 06:00 | 06:30 | Morning Meditation | #8B5CF6 |
| 06:30 | 07:00 | Exercise | #EF4444 |
| 07:00 | 07:30 | Breakfast & News | #F59E0B |
| 07:30 | 08:00 | Plan the Day | #3B82F6 |
| 08:00 | 10:00 | Deep Work — Coding | #10B981 |
| 10:00 | 10:15 | Break | #6B7280 |
| 10:15 | 12:00 | Deep Work — Coding | #10B981 |
| 12:00 | 13:00 | Lunch | #F59E0B |
| 13:00 | 14:00 | Meetings / Collaboration | #3B82F6 |
| 14:00 | 16:00 | Deep Work — Design | #8B5CF6 |
| 16:00 | 16:15 | Break | #6B7280 |
| 16:15 | 17:30 | Code Review & PRs | #10B981 |
| 17:30 | 18:00 | Daily Wrap-up & Journal | #3B82F6 |
| 18:00 | 19:00 | Dinner | #F59E0B |
| 19:00 | 20:30 | Side Projects / Learning | #EC4899 |
| 20:30 | 21:00 | Wind Down & Reading | #8B5CF6 |

### Backlog

| TaskName | Status | Timestamp |
| ---------------------------------- | ----------- | ---------------------- |
| Refactor authentication module | in-progress | 2026-05-20T09:00:00Z |
| Write unit tests for dashboard API | pending | 2026-05-21T14:30:00Z |
| Fix mobile nav hamburger bug | done | 2026-05-19T11:00:00Z |
| Design onboarding flow mockups | pending | 2026-05-22T08:00:00Z |
| Update README with deploy steps | blocked | 2026-05-18T16:45:00Z |

### Metrics

| Key | Value |
| ------------------- | ----- |
| unsorted_files | 12 |
| focus_hours_today | 4.5 |
| backlog_done_pct | 33 |

---

## 4. Open the Apps Script Editor

1. With your Google Sheet open, go to the menu bar.
2. Click **Extensions → Apps Script**.
3. A new browser tab opens with the Apps Script editor.
4. You'll see a default file called `Code.gs` with an empty `myFunction()` — **delete all of that content**.

---

## 5. Paste the Code

1. Open the file [`docs/Code.gs`](./Code.gs) in this repository (or copy the code from the project docs).
2. Paste the **entire** contents into the Apps Script editor, replacing everything.
3. Press **Ctrl + S** (or **⌘ + S** on Mac) to save.
4. If prompted, name the project **`Ambient Dashboard API`**.

The script provides two endpoints:
- **`doGet(e)`** — Returns schedule, backlog, and/or metrics as JSON.
- **`doPost(e)`** — Accepts JSON payloads to append backlog items, update metrics, update the full schedule, or mark tasks as done.

---

## 6. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment** (top-right).
2. Click the ⚙️ gear icon next to "Select type" and choose **Web app**.
3. Fill in:

   | Field | Value |
   | ---------------------- | ------------- |
   | **Description** | `v1 — initial` |
   | **Execute as** | **Me** (`your-email@gmail.com`) |
   | **Who has access** | **Anyone** |

4. Click **Deploy**.
5. The first time, Google will ask you to **authorize** the script:
   - Click **Authorize access**.
   - Choose your Google account.
   - If you see "Google hasn't verified this app", click **Advanced → Go to Ambient Dashboard API (unsafe)**.
   - Click **Allow**.
6. The deployment confirmation dialog appears with your **Web app URL**.

> **⚠️ Security Note:** "Anyone" means anyone with the URL can read/write your sheet data. For personal dashboards this is fine. For production, consider restricting access or adding an API key check in the script.

---

## 7. Get the Deployment URL

After deploying, you'll see a URL like:

```
https://script.google.com/macros/s/AKfycbx...YOUR_UNIQUE_ID.../exec
```

**Copy this URL.** You'll need it for testing and for the frontend configuration.

> **Tip:** You can always find your deployment URL later:
> **Deploy → Manage deployments** → click the URL under your active deployment.

### Updating the Deployment

When you edit the Apps Script code later:

1. **Deploy → Manage deployments**
2. Click the ✏️ **pencil icon** on your active deployment.
3. Under **Version**, select **New version**.
4. Click **Deploy**.

---

## 8. Test with curl

Replace `YOUR_URL` with the Web app URL you copied above.

### GET — Fetch All Data

```bash
curl -L "YOUR_URL"
```

Expected response:

```json
{
  "schedule": [
    { "StartTime": "06:00", "EndTime": "06:30", "TaskName": "Morning Meditation", "Color": "#8B5CF6" },
    ...
  ],
  "backlog": [
    { "TaskName": "Refactor authentication module", "Status": "in-progress", "Timestamp": "2026-05-20T09:00:00Z" },
    ...
  ],
  "metrics": {
    "unsorted_files": 12,
    "focus_hours_today": 4.5,
    "backlog_done_pct": 33
  },
  "status": "ok",
  "timestamp": "2026-05-22T15:30:00.000Z"
}
```

### GET — Fetch Only Schedule

```bash
curl -L "YOUR_URL?action=schedule"
```

### GET — Fetch Only Backlog

```bash
curl -L "YOUR_URL?action=backlog"
```

### GET — Fetch Only Metrics

```bash
curl -L "YOUR_URL?action=metrics"
```

### POST — Append a Backlog Task

```bash
curl -L -X POST "YOUR_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "append_backlog",
    "taskName": "Implement dark mode toggle",
    "status": "pending"
  }'
```

### POST — Update a Metric

```bash
curl -L -X POST "YOUR_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_metric",
    "key": "unsorted_files",
    "value": 7
  }'
```

### POST — Replace the Entire Schedule

```bash
curl -L -X POST "YOUR_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_schedule",
    "blocks": [
      { "StartTime": "09:00", "EndTime": "10:00", "TaskName": "Standup & Planning", "Color": "#3B82F6" },
      { "StartTime": "10:00", "EndTime": "12:00", "TaskName": "Feature Development", "Color": "#10B981" }
    ]
  }'
```

### POST — Mark a Task as Done

```bash
curl -L -X POST "YOUR_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "mark_task",
    "taskName": "Refactor authentication module",
    "status": "done"
  }'
```

> **Note:** The `-L` flag is required because Google Apps Script redirects requests (302) to the actual response. Without `-L`, curl won't follow the redirect and you'll get an HTML page instead of JSON.

---

## 9. Connect to the Frontend

### Step 1 — Create or Edit the `.env` File

In the root of the `tycodes_app` project, create (or edit) a file called `.env`:

```bash
# .env
VITE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycbx...YOUR_UNIQUE_ID.../exec
```

Replace the URL with your actual deployment URL.

### Step 2 — Access in Code

In any frontend file, reference the variable:

```javascript
const SHEETS_API = import.meta.env.VITE_SHEETS_API_URL;
```

### Step 3 — Example Fetch Call

```javascript
// Fetch all dashboard data
async function fetchDashboardData() {
  const res = await fetch(SHEETS_API);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  return res.json();
}

// Update a metric
async function updateMetric(key, value) {
  const res = await fetch(SHEETS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_metric', key, value }),
  });
  return res.json();
}
```

### Step 4 — Restart the Dev Server

```bash
npm run dev
```

Vite picks up `.env` changes only on server restart.

---

## Troubleshooting

| Symptom | Cause | Fix |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `TypeError: Cannot read properties of null` | Sheet tab name doesn't match exactly | Check tab names are `ScheduleBlocks`, `Backlog`, `Metrics` (case-sensitive) |
| HTML response instead of JSON | curl not following redirects | Add `-L` flag to curl |
| `401 Unauthorized` | Script permissions not granted | Re-authorize: **Run → Run function → doGet**, accept prompts |
| CORS errors in browser | Normal for Apps Script | Use `fetch()` with `mode: 'cors'` or `no-cors`; GAS sets CORS headers automatically on deployed web apps |
| Stale data after code change | Using old deployment version | **Deploy → Manage deployments → Edit → New version → Deploy** |
| `Exception: You do not have permission` | "Execute as" set to "User accessing" | Change to **Me** in deployment settings |

---

## Quick Reference — Payload Formats

### GET Parameters

| Parameter | Values | Default |
| --------- | ---------------------------------------- | ------- |
| `action` | `all`, `schedule`, `backlog`, `metrics` | `all` |

### POST Payloads

```jsonc
// Append a backlog task
{ "action": "append_backlog", "taskName": "string", "status": "string", "timestamp": "ISO8601 (optional)" }

// Update or create a metric
{ "action": "update_metric", "key": "string", "value": "string | number" }

// Replace entire schedule
{ "action": "update_schedule", "blocks": [{ "StartTime": "HH:MM", "EndTime": "HH:MM", "TaskName": "string", "Color": "CSS color" }] }

// Mark a backlog task with a new status
{ "action": "mark_task", "taskName": "string", "status": "string (default: done)" }
```
