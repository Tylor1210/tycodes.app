# Security Policy

## Sensitive Values

This project uses **Google Apps Script** as a serverless backend. The deployed
web app URL acts as both your API endpoint and your access credential.

### What to Keep Private

| Value | Where it lives | Risk if exposed |
|---|---|---|
| `VITE_SHEETS_API_URL` | `.env` file (gitignored) | Anyone can read/write your Google Sheet |

### Safe to Commit

- `.env.example` — contains no real values, only placeholder comments
- `VITE_*` env var names in source code — names alone have no value
- Google Apps Script *code* (`docs/Code.gs`) — contains no credentials

### Setup for Contributors

1. Copy `.env.example` → `.env`
2. Fill in your own Google Apps Script URL
3. Never commit `.env`

### If Your URL Is Accidentally Exposed

1. Go to your Google Apps Script project
2. **Deploy → Manage deployments**
3. Delete the compromised deployment
4. Create a new deployment — you'll get a new URL
5. Update your `.env` with the new URL

## Reporting Issues

Open an issue on GitHub. For security-sensitive bugs, email the repo owner
directly rather than filing a public issue.
