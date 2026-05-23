# Tycodes Ambient Dashboard

> **A personal command center built on a radical idea: what if your app had no backend?**

Tycodes is a fully-featured personal productivity dashboard — schedule tracking, task queue, stock portfolio, daily scripture, ambient media, quick notes, and accountability backlog — with **zero server costs, zero databases to manage, and zero vendor lock-in.**

All persistent data lives in a single Google Spreadsheet in **your** Google Drive.

---

## 🏗️ The Architecture: Google Sheets as Your Backend

This project is a working demonstration of a powerful, underutilized architecture pattern:

```
[React Frontend]  ←→  [Google Sheets API]  ←→  [Your Google Drive]
```

Your Google Sheet is simultaneously your **database**, your **API layer**, and your **formula engine** — and it costs nothing.

### How It Works

1. **On first sign-in**, the app provisions a spreadsheet called `Tycodes Ambient Routine` in your Google Drive via the Sheets API. It sets up structured tabs with headers and seeds default data.
2. **Reads and writes** go directly from the browser to the Google Sheets API using your OAuth access token — no middleman, no Lambda, no Express server.
3. **Live stock prices** are fetched via `=IFERROR(GOOGLEFINANCE("TICKER", "price"), "N/A")` formulas baked into the sheet. The browser reads the calculated result — **Google's servers crunch the number, you pay nothing.**
4. When you close the app and come back, your data is exactly where you left it — in your Drive, readable in a normal spreadsheet.

---

## ✅ Why This Architecture Wins

### 💰 Near-Zero Cost
| Traditional Stack | This Stack |
|---|---|
| Backend server (~$5–50/mo) | $0 |
| Database (Postgres, Mongo) | $0 |
| Auth service | $0 (Google OAuth) |
| Stock price API (~$30–200/mo) | $0 (GOOGLEFINANCE) |
| **Total** | **~$0** |

You only pay for your domain (optional) and static hosting (Netlify/Vercel free tier covers it).

### 🔐 Data Stays In Your Hands
- **No third-party database** ever touches your data.
- Your spreadsheet lives in your Google Drive, under your Google account, governed by Google's privacy policy — not some SaaS startup's.
- You can open the spreadsheet directly in Google Sheets, edit rows by hand, export it to CSV, or delete it entirely. No lock-in.
- If this app disappeared tomorrow, your data would still exist, readable, in your Drive.

### 🧩 No Backend to Maintain
- No server to patch, scale, or monitor.
- No Docker containers, no CI/CD pipelines for a backend service.
- No database migrations.
- **Deploys are a single `npm run build` + drag-and-drop to Netlify.**

### 📊 Built-in Formula Engine
Google Sheets has a powerful formula engine you can exploit for free:
- `GOOGLEFINANCE()` — live stock/ETF prices with ~20-min delay, no API key
- `IMPORTRANGE()` — cross-sheet data federation
- `SPARKLINE()` — inline mini-charts visible in the sheet itself
- Conditional formatting, pivot tables, charts — all free analytics on your data

### 🔄 Natural Audit Log
Since all writes go through the Sheets API, your spreadsheet is a human-readable audit log. Non-technical users can open it and understand exactly what the app stored.

### 🚀 Scales to Personal / Small-Team Use
Google Sheets API has a free quota of **500 requests per 100 seconds per project** and **60 requests per minute per user**. For a personal dashboard or small team tool, you will never come close to hitting these limits.

---

## 🗂️ Sheet Structure

The app auto-provisions a spreadsheet with 4 tabs:

| Tab | Columns | Purpose |
|-----|---------|---------|
| `ScheduleBlocks` | StartTime, EndTime, TaskName, Color | Daily timeline blocks |
| `Backlog` | TaskName, Status, Timestamp | Accountability task log |
| `Metrics` | Key, Value | Dashboard KPIs |
| `Portfolio` | Ticker, Shares, Cost, `=IFERROR(GOOGLEFINANCE(...))` | Live stock P&L |

Row 1 of each tab contains a warning banner so you don't accidentally corrupt it. Data starts on Row 4. **Do not delete Row 1 or rename the tabs.**

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google account
- A Google Cloud project with the **Sheets API** and **Drive API** enabled

### 1. Clone and Install

```bash
git clone https://github.com/Tylor1210/tycodes.app.git
cd tycodes.app
npm install
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Google Sheets API** and **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Set Application Type to **Web Application**
6. Add `http://localhost:5173` to **Authorized JavaScript Origins**
7. Copy your **Client ID**

### 3. Configure Environment

Create a `.env` file in the project root:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173`, click **Connect Google Sheets** in Settings, sign in — and a spreadsheet called **Tycodes Ambient Routine** will appear in your Google Drive automatically.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── TimelineBar.tsx        # Daily schedule with live NOW marker & progress ring
│   ├── TradingViewWidget.tsx  # Stock watchlist + portfolio P&L via GOOGLEFINANCE
│   ├── TaskQueue.tsx          # Focus task queue with live timer
│   ├── AccountabilityBacklog.tsx # Missed/pending/done task log
│   ├── QuickNotes.tsx         # Local sticky notes
│   ├── DailyScripture.tsx     # Daily verse
│   ├── AmbientVideo.tsx       # YouTube live/video embed (supports channel IDs)
│   └── SettingsPanel.tsx      # Auth, theme, YouTube URL config
├── lib/
│   ├── googleAuth.ts          # OAuth token management (persisted in localStorage)
│   ├── sheetsApi.ts           # All Sheets API read/write functions
│   └── sheetsProvisioner.ts   # First-run sheet creation + data seeding
├── data/
│   └── mockData.ts            # Shown only when NOT connected to Google Sheets
└── App.tsx                    # Dashboard grid (react-grid-layout drag & drop)
```

---

## 🎛️ Features

### Today's Schedule
- Drag-resize timeline blocks with color, start/end time
- Live **NOW** divider showing your position in the day
- Animated progress ring (% of day complete, from first to last block)
- Red glowing live bar sweeping across the 24h timeline
- Edit, delete, add blocks — all synced to Google Sheets

### Stock Watchlist & Portfolio
- TradingView tape for real-time market quotes
- Per-holding P&L (cost basis vs. live price via `GOOGLEFINANCE`)
- **Total portfolio banner** — green if up, red if down
- All data stored in your Portfolio sheet tab

### Task Queue
- Add tasks, start/pause/resume/finish with live elapsed timer
- Completed tasks show total time spent
- Integrates with the schedule: queue a task → schedule it on the timeline

### Accountability Backlog
- Synced with your Backlog sheet tab
- Tasks can be marked missed, pending, or done

### Ambient Feed
- Embeds any YouTube video or channel live stream
- Supports channel IDs (e.g. the Lofi Girl channel always plays their current live regardless of rotating video IDs)

### Dark / Day Mode
- Deep purple + ruby red night mode
- Warm off-white + amber glow day mode

---

## 🔌 Extending This Pattern

This architecture can back any lightweight SaaS-style app:

- **Personal CRM** — contacts, notes, follow-ups in a sheet
- **Habit tracker** — daily check-ins written to dated rows
- **Small business inventory** — editable by non-technical staff directly in Sheets
- **Budget tracker** — with `SUM()` formulas doing the math server-side for free
- **Waitlist / form collector** — use Google Forms to write, React to read

The pattern breaks down when you need:
- Multi-user real-time collaboration (use Firebase/Supabase instead)
- More than ~50k rows of data (Sheets has a 10M cell limit but performance degrades before that)
- Complex relational queries (use a proper DB)

For everything else — **this is the leanest path to a working product.**

---

## 🛡️ Security Notes

- OAuth tokens are stored in `localStorage` and refreshed via Google's token endpoint. **Never store tokens in a public repo.**
- The `.env` file is in `.gitignore` — your Client ID is safe.
- All API calls are made **client-side** with the user's own OAuth token. The app never sees your data — it flows directly from your browser to Google's servers.
- The Google Sheets API enforces per-user rate limits and OAuth scopes — unauthorized users literally cannot access your sheet.

---

## 📜 License

MIT — fork it, build on it, ship it. If you build something cool with this pattern, open a PR or drop a star ⭐

---

*Built by [@Tylor1210](https://github.com/Tylor1210) — demonstrating that the lightest architecture is often the most powerful one.*
