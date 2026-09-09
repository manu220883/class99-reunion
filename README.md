# Eswaramma High School — Class of '99 Reunion 2026

This package contains the aligned visual refresh for the GitHub Pages reunion site.

## Upload
Replace these website files in the GitHub repository:
- index.html
- styles.css
- app.js
- config.js

Keep the existing:
- Code.gs (Google Apps Script backend)
- memory-01.jpg
- memory-02.jpg
- memory-03.jpg

## Google Sheets
The `config.js` contains only the public Google Apps Script Web App `/exec` URL. It contains no Google credentials or API keys.

The existing Apps Script should continue to use the Google Sheet and tabs:
POLL_RESPONSES, RSVP, SUMMARY, MEMORIES.

## Important
The public site displays only aggregate summary counts. Phone numbers, emails and individual responses are not fetched by the public JavaScript.

The organiser should view/export individual responses directly from the Google Sheet.
