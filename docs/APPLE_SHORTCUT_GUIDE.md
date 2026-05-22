# Apple Shortcut — File Scanner & Dashboard Reporter

> Automate file scanning on your Mac, tally unsorted files by type, optionally get AI-powered categorization advice, and push the results to the Ambient Dashboard via the Google Sheets API.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Shortcut Architecture](#shortcut-architecture)
4. [Step-by-Step Build Guide](#step-by-step-build-guide)
5. [JSON Payload Reference](#json-payload-reference)
6. [Optional: LLM-Powered Categorization](#optional-llm-powered-categorization)
7. [Running the Shortcut](#running-the-shortcut)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This Apple Shortcut performs the following flow:

```
┌─────────────────────┐
│  Scan Downloads &   │
│  Desktop folders    │
├─────────────────────┤
│  Count files by     │
│  extension          │
├─────────────────────┤
│  (Optional) Send    │
│  metadata to LLM    │
│  for categorization │
├─────────────────────┤
│  POST tally to      │
│  Google Sheets API  │
└─────────────────────┘
```

The shortcut reports two key metrics to the dashboard:
- **`unsorted_files`** — Total count of files in Downloads + Desktop
- **`file_type_breakdown`** — JSON string of file counts by extension

---

## Prerequisites

- **macOS 13 Ventura** or later (or iOS 16+)
- **Shortcuts app** (pre-installed)
- The Google Sheets API deployed and working (see [`GOOGLE_SHEETS_SETUP.md`](./GOOGLE_SHEETS_SETUP.md))
- Your deployment URL ready (e.g., `https://script.google.com/macros/s/AKfycbx.../exec`)

---

## Shortcut Architecture

The shortcut is built from 12 blocks in the Shortcuts app. Here's the full map:

| # | Block Type | Purpose |
|---|--------------------------|------------------------------------------|
| 1 | Text | Store the API URL |
| 2 | Get Contents of Folder | Scan `~/Downloads` |
| 3 | Get Contents of Folder | Scan `~/Desktop` |
| 4 | Combine Lists | Merge both file lists |
| 5 | Count | Count total items |
| 6 | Set Variable | Save total count |
| 7 | Repeat with Each | Loop through files, build extension tally |
| 8 | Dictionary | Build the tally JSON |
| 9 | Get Contents of URL | POST `update_metric` — unsorted_files |
| 10 | Get Contents of URL | POST `update_metric` — file_type_breakdown |
| 11 | Get Contents of URL | (Optional) Send to LLM API |
| 12 | Show Notification | Confirm completion |

---

## Step-by-Step Build Guide

Open the **Shortcuts** app and tap **+** to create a new shortcut. Name it **"File Scanner & Dashboard Reporter"**.

---

### Block 1: Store the API URL

> 📸 **Screenshot description:** A "Text" action block containing the full Google Apps Script deployment URL.

1. Tap **Add Action** → search for **Text**.
2. Paste your Google Apps Script deployment URL:
   ```
   https://script.google.com/macros/s/AKfycbx...YOUR_UNIQUE_ID.../exec
   ```
3. Tap the block title and set the output variable name to **`API_URL`**.
   - (Tap the text output → **Set Name** → type `API_URL`)

---

### Block 2: Get Contents of Folder — Downloads

> 📸 **Screenshot description:** A "Get Contents of Folder" action block with the path set to the Downloads folder. "Recursive" is toggled OFF.

1. Add action → search for **Get Contents of Folder**.
2. Tap the folder placeholder → navigate to and select **Downloads**.
3. Ensure **Recursive** is toggled **OFF** (we only want top-level unsorted files).

---

### Block 3: Get Contents of Folder — Desktop

> 📸 **Screenshot description:** An identical "Get Contents of Folder" action block, this time pointing to the Desktop folder.

1. Add another **Get Contents of Folder** action.
2. Select **Desktop** as the folder.
3. **Recursive** → OFF.

---

### Block 4: Combine Lists

> 📸 **Screenshot description:** A "Combine Lists" action with two input variables — the output of Block 2 and the output of Block 3.

1. Add action → search for **Combine Lists** (or **Add to Variable**).
2. **First list**: tap and select the output of Block 2 (Downloads contents).
3. **Second list**: tap and select the output of Block 3 (Desktop contents).
4. Name the combined output **`AllFiles`**.

> **Alternative approach:** Instead of Combine Lists, you can use two consecutive **Add to Variable** blocks both targeting a variable called `AllFiles`.

---

### Block 5: Count

> 📸 **Screenshot description:** A "Count" action block. Input is the `AllFiles` variable. The count type is set to "Items".

1. Add action → **Count**.
2. Set input to **`AllFiles`** (the combined list from Block 4).
3. Count type: **Items**.

---

### Block 6: Set Variable — Total Count

> 📸 **Screenshot description:** A "Set Variable" action block. The variable is named `TotalFiles` and the input is the Count result from Block 5.

1. Add action → **Set Variable**.
2. Variable name: **`TotalFiles`**.
3. Input: the output of Block 5 (the count).

---

### Block 7: Repeat with Each — Build Extension Tally

> 📸 **Screenshot description:** A "Repeat with Each" block containing inner actions. The repeat input is `AllFiles`. Inside the loop, a "Get Details of Files" action extracts the file extension, followed by "If" logic and "Dictionary" value setting.

This is the most complex block. We loop over every file and build a tally of extensions.

1. Add action → **Repeat with Each**.
2. Set input to **`AllFiles`**.
3. Inside the loop, add:

   **a. Get Details of Files**
   - Detail: **File Extension**
   - Input: **Repeat Item**

   **b. Set Variable**
   - Variable: **`CurrentExt`**
   - Value: the file extension result

   **c. Get Variable** — `ExtensionCounts` (Dictionary)
   - The first time through, this will be empty.

   **d. If `ExtensionCounts` has key `CurrentExt`**
   - **Yes:** Get Dictionary Value for key `CurrentExt`, add 1, set it back.
   - **No:** Set Dictionary Value for key `CurrentExt` to `1`.

   **e. Set Variable** — `ExtensionCounts` to the updated dictionary.

4. After the **End Repeat**, the variable **`ExtensionCounts`** holds the complete tally.

> **Simplified alternative:** If the dictionary manipulation feels complex, use a **Text** action inside the loop to append each extension to a running text list (one per line), then after the loop use **Split Text** by new lines and count unique values with **Filter Files** / **Count**.

---

### Block 8: Dictionary — Build the Tally JSON

> 📸 **Screenshot description:** A "Dictionary" action displaying key-value pairs like `pdf: 3`, `png: 5`, `dmg: 1`, built from the ExtensionCounts variable.

1. If you used the dictionary approach in Block 7, your `ExtensionCounts` variable is already a dictionary — skip to Block 9.
2. If you used the text approach, add a **Dictionary** action and manually set it from the parsed data.
3. Name the output **`TallyJSON`**.

---

### Block 9: POST `update_metric` — unsorted_files

> 📸 **Screenshot description:** A "Get Contents of URL" action configured as a POST request. The URL field contains the `API_URL` variable. The request body is set to JSON with three fields: `action` = "update_metric", `key` = "unsorted_files", `value` = the `TotalFiles` variable.

1. Add action → **Get Contents of URL**.
2. **URL**: select the **`API_URL`** variable from Block 1.
3. Tap **Show More** to expand options:
   - **Method**: `POST`
   - **Headers**: Add header `Content-Type` = `application/json`
   - **Request Body**: **JSON**
4. Add these key-value pairs to the JSON body:

   | Key | Type | Value |
   |-----------|--------|-------------------------------|
   | `action` | Text | `update_metric` |
   | `key` | Text | `unsorted_files` |
   | `value` | Number | *`TotalFiles`* variable |

This sends the following payload to the API:

```json
{
  "action": "update_metric",
  "key": "unsorted_files",
  "value": 12
}
```

---

### Block 10: POST `update_metric` — file_type_breakdown

> 📸 **Screenshot description:** Another "Get Contents of URL" action, nearly identical to Block 9. The `key` field is "file_type_breakdown" and the `value` field contains the stringified `ExtensionCounts` dictionary.

1. Add action → **Get Contents of URL**.
2. **URL**: **`API_URL`**.
3. **Method**: `POST`
4. **Request Body**: **JSON**

   | Key | Type | Value |
   |-----------|--------|----------------------------------------------|
   | `action` | Text | `update_metric` |
   | `key` | Text | `file_type_breakdown` |
   | `value` | Text | *`ExtensionCounts`* variable (auto-stringified) |

Resulting payload:

```json
{
  "action": "update_metric",
  "key": "file_type_breakdown",
  "value": "{\"pdf\":3,\"png\":5,\"dmg\":1,\"zip\":2,\"jpg\":1}"
}
```

---

### Block 11: (Optional) Send to LLM API for Categorization

> 📸 **Screenshot description:** A "Get Contents of URL" action pointing to an LLM API endpoint (e.g., `https://api.groq.com/openai/v1/chat/completions`). The JSON body contains a messages array with a system prompt and user prompt containing the file tally.

See the [Optional: LLM-Powered Categorization](#optional-llm-powered-categorization) section below for full details.

---

### Block 12: Show Notification

> 📸 **Screenshot description:** A "Show Notification" action. The title reads "File Scan Complete" and the body shows "Found [TotalFiles] unsorted files. Metrics sent to dashboard."

1. Add action → **Show Notification**.
2. Title: `File Scan Complete`
3. Body: `Found ` + **`TotalFiles`** + ` unsorted files. Metrics sent to dashboard.`

---

## JSON Payload Reference

These are the exact JSON formats that `Code.gs` expects. Use them in the **Get Contents of URL** blocks.

### Update a Metric

```json
{
  "action": "update_metric",
  "key": "unsorted_files",
  "value": 12
}
```

### Append a Backlog Task

```json
{
  "action": "append_backlog",
  "taskName": "Sort 5 DMG files in Downloads",
  "status": "pending",
  "timestamp": "2026-05-22T15:00:00Z"
}
```

### Mark a Task as Done

```json
{
  "action": "mark_task",
  "taskName": "Sort 5 DMG files in Downloads",
  "status": "done"
}
```

### Replace the Full Schedule

```json
{
  "action": "update_schedule",
  "blocks": [
    {
      "StartTime": "09:00",
      "EndTime": "10:00",
      "TaskName": "File cleanup sprint",
      "Color": "#EF4444"
    },
    {
      "StartTime": "10:00",
      "EndTime": "12:00",
      "TaskName": "Deep Work",
      "Color": "#10B981"
    }
  ]
}
```

---

## Optional: LLM-Powered Categorization

You can add an optional step that sends file metadata to a free LLM API for smart categorization suggestions.

### Option A: Groq Free Tier (Cloud)

1. Sign up at [console.groq.com](https://console.groq.com) and get a free API key.
2. Add a **Get Contents of URL** block:

   - **URL**: `https://api.groq.com/openai/v1/chat/completions`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer gsk_YOUR_GROQ_API_KEY`
     - `Content-Type`: `application/json`
   - **Request Body** (JSON):

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "system",
      "content": "You are a file organization assistant. Given a list of file extensions and counts, suggest folder categories and which file types belong in each. Be concise."
    },
    {
      "role": "user",
      "content": "I have these unsorted files on my Desktop and Downloads: pdf: 3, png: 5, dmg: 1, zip: 2, jpg: 1, mov: 2, docx: 1. Suggest how to organize them into folders."
    }
  ],
  "temperature": 0.3,
  "max_tokens": 300
}
```

3. The `user` message `content` should be dynamically built using a **Text** action that interpolates the `ExtensionCounts` variable:

   ```
   I have these unsorted files on my Desktop and Downloads: [ExtensionCounts]. Suggest how to organize them into folders.
   ```

4. Add a **Get Dictionary Value** block to extract `.choices[0].message.content` from the response.

5. **(Optional)** POST the suggestion as a backlog task:

   - Add another **Get Contents of URL** block:

   ```json
   {
     "action": "append_backlog",
     "taskName": "AI suggestion: [LLM response text]",
     "status": "pending"
   }
   ```

### Option B: Local Ollama (Private, No API Key)

1. Install Ollama: `brew install ollama`
2. Pull a model: `ollama pull llama3.2`
3. Ensure Ollama is running: `ollama serve` (it runs on `http://localhost:11434`)
4. In the shortcut, use **Get Contents of URL**:

   - **URL**: `http://localhost:11434/api/chat`
   - **Method**: `POST`
   - **Request Body**:

```json
{
  "model": "llama3.2",
  "messages": [
    {
      "role": "system",
      "content": "You are a file organization assistant. Given file type tallies, suggest folder categories. Be concise."
    },
    {
      "role": "user",
      "content": "Unsorted files: pdf: 3, png: 5, dmg: 1, zip: 2. Suggest categories."
    }
  ],
  "stream": false
}
```

5. Extract the response from `.message.content` in the returned JSON.

> **Note:** Ollama only works when your Mac is on and the server is running. Groq works from anywhere, including iOS.

---

## Running the Shortcut

### Manual Run

- Open **Shortcuts** app → find **"File Scanner & Dashboard Reporter"** → tap ▶️ **Play**.

### Scheduled Automation

1. Open **Shortcuts** → tap **Automation** (bottom tab).
2. Tap **+** → **Create Personal Automation**.
3. Choose **Time of Day** → set to your preferred time (e.g., `08:00 AM` daily).
4. Tap **Next** → search for and select your shortcut.
5. Toggle **Ask Before Running** → **OFF** (for fully unattended execution).
6. Tap **Done**.

### Menu Bar / Dock

- On macOS, right-click the shortcut → **Add to Dock** or **Add to Menu Bar** for one-click access.

### Siri

- Say: *"Hey Siri, run File Scanner and Dashboard Reporter"*

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "No items" returned from folder scan | Shortcuts lacks folder permission | Go to **System Settings → Privacy & Security → Files and Folders** → grant Shortcuts access |
| "Could not connect to the server" on POST | Incorrect API URL or no internet | Double-check the URL in Block 1; test with curl first |
| LLM returns empty or error | Invalid API key or model name | Verify your Groq API key; try `llama-3.3-70b-versatile` |
| Ollama connection refused | Ollama server not running | Run `ollama serve` in Terminal first |
| "The request body was not valid JSON" | Shortcut JSON body misconfigured | Ensure you selected **JSON** (not **Form**) as the request body type |
| Notification doesn't appear | Focus mode or notification settings | Check **System Settings → Notifications → Shortcuts** |
| Counts seem wrong | Hidden files or `.DS_Store` | Add a **Filter Files** action before counting to exclude hidden files (name doesn't start with `.`) |
| Dictionary manipulation crashes | Shortcuts bug with large dictionaries | Use the "text list" alternative approach described in Block 7 |
