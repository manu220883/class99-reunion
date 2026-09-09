# Eswaramma High School — Class of '99 Reunion Website

This package is a real Google Sheets-backed reunion poll. It uses Google Apps Script as the server-side integration.

## Files

- `index.html` — website and poll
- `styles.css` — responsive design
- `app.js` — validation, submission, aggregate results
- `config.js` — only public configuration; contains the Apps Script Web App URL
- `Code.gs` — Google Apps Script backend
- `README.md` — setup instructions

## 1. Create the Google Sheet

Create a new Google Sheet in the organizer's Google account.

Copy the Sheet ID from its URL:

`https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

Use the value between `/d/` and `/edit`.

## 2. Configure Apps Script

Open:

Extensions → Apps Script

Paste `Code.gs`.

At the top, replace:

`PASTE_GOOGLE_SHEET_ID_HERE`

with the real Sheet ID.

Save.

## 3. Create the tabs

In Apps Script, select `setupSheet` and click Run.

Google will ask for authorization. Authorize using the organizer's Google account.

The script creates:

- POLL_RESPONSES
- RSVP
- SUMMARY
- MEMORIES

## 4. Deploy the backend

Apps Script:

Deploy → New deployment → Web app

Use:

- Execute as: Me
- Who has access: Anyone

Deploy and copy the `/exec` URL.

Do not use the `/dev` URL for the website.

## 5. Connect the website

Open `config.js`.

Replace:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with the Web App `/exec` URL.

## 6. Host the website

The frontend is static and can be hosted on GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static hosting service.

No Google service-account key or Google API key is placed in the frontend.

## 7. Test

Submit a test response.

Verify:

1. `POLL_RESPONSES` receives the response.
2. Timestamp is populated.
3. Response ID starts with `ESW99-`.
4. Yes/Maybe entries appear in `RSVP`.
5. Memories are copied to `MEMORIES`.
6. `SUMMARY` formulas calculate.
7. Public results show aggregate numbers only.
8. Submitting the same response twice from the same browser within 24 hours is rejected.

## Security notes

- Google Sheet credentials remain with the organizer's Google account.
- The browser only knows the Apps Script Web App URL.
- Individual responses are never returned by the public `summary` endpoint.
- Server-side validation is performed even if the browser validation is bypassed.
- Spreadsheet formula injection is mitigated for text values.
- Apps Script LockService prevents concurrent submissions from creating race-condition duplicates.
- For a production deployment with sensitive data, restrict the Apps Script deployment to the intended audience and/or put a small serverless proxy in front of it.
