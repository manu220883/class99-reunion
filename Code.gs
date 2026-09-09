/**
 * ESWARAMMA HIGH SCHOOL - CLASS OF '99 REUNION
 * Google Apps Script backend
 *
 * 1. Create a Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Paste this file.
 * 4. Run setupSheet() once and authorize.
 * 5. Deploy -> New deployment -> Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 6. Put the /exec URL into website/config.js.
 *
 * The script writes responses server-side and never exposes the spreadsheet itself.
 */

const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const RESPONSE_SHEET = "POLL_RESPONSES";
const RSVP_SHEET = "RSVP";
const SUMMARY_SHEET = "SUMMARY";
const MEMORIES_SHEET = "MEMORIES";

const HEADERS = [
  "Response ID","Timestamp","Name","Nickname","WhatsApp / Phone","Email",
  "Current City","Location Preference","Preferred Weekend","Attendance Status",
  "Number of Attendees","Additional Comments","Consent to Display Name","Source",
  "Fingerprint"
];

function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const names = [RESPONSE_SHEET, RSVP_SHEET, SUMMARY_SHEET, MEMORIES_SHEET];
  names.forEach(name => { if (!ss.getSheetByName(name)) ss.insertSheet(name); });

  const response = ss.getSheetByName(RESPONSE_SHEET);
  if (response.getLastRow() === 0) response.appendRow(HEADERS);

  const rsvp = ss.getSheetByName(RSVP_SHEET);
  if (rsvp.getLastRow() === 0) rsvp.appendRow([
    "Response ID","Timestamp","Name","Nickname","Current City",
    "Location Preference","Preferred Weekend","Attendance Status",
    "Number of Attendees","Email","WhatsApp / Phone"
  ]);

  const memories = ss.getSheetByName(MEMORIES_SHEET);
  if (memories.getLastRow() === 0) memories.appendRow([
    "Response ID","Timestamp","Name","Nickname","Memory / Message","Consent to Display Name"
  ]);

  buildSummarySheet_();
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    validateServerSide_(data);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(RESPONSE_SHEET);
      const values = sheet.getDataRange().getValues();

      // Server-side duplicate protection: same browser fingerprint within 24 hours.
      const fingerprint = String(data.fingerprint || "");
      if (fingerprint) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (let i = values.length - 1; i >= 1; i--) {
          const rowTime = new Date(values[i][1]).getTime();
          if (rowTime < cutoff) break;
          if (String(values[i][14]) === fingerprint) {
            return json_({ok:false, message:"Duplicate submission detected."});
          }
        }
      }

      const responseId = "ESW99-" + Utilities.getUuid().split("-")[0].toUpperCase();
      const timestamp = new Date();

      sheet.appendRow([
        responseId, timestamp, clean_(data.name), clean_(data.nickname),
        clean_(data.phone), clean_(data.email), clean_(data.currentCity),
        clean_(data.locationPreference), clean_(data.preferredWeekend),
        clean_(data.attendanceStatus), clean_(data.numberOfAttendees),
        clean_(data.additionalComments), clean_(data.consentToDisplayName),
        "Website", fingerprint
      ]);

      if (data.attendanceStatus === "Yes" || data.attendanceStatus === "Maybe") {
        ss.getSheetByName(RSVP_SHEET).appendRow([
          responseId, timestamp, clean_(data.name), clean_(data.nickname),
          clean_(data.currentCity), clean_(data.locationPreference),
          clean_(data.preferredWeekend), clean_(data.attendanceStatus),
          clean_(data.numberOfAttendees), clean_(data.email), clean_(data.phone)
        ]);
      }

      if (data.additionalComments) {
        ss.getSheetByName(MEMORIES_SHEET).appendRow([
          responseId, timestamp, clean_(data.name), clean_(data.nickname),
          clean_(data.additionalComments), clean_(data.consentToDisplayName)
        ]);
      }

      return json_({ok:true, responseId:responseId});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json_({ok:false, message:"Unable to record response."});
  }
}

function doGet(e) {
  try {
    if ((e.parameter.action || "") === "summary") {
      return json_({ok:true, summary:getSummary_()});
    }
    return json_({ok:true, service:"Eswaramma Class of '99 Reunion"});
  } catch (err) {
    return json_({ok:false, message:"Unable to load results."});
  }
}

function validateServerSide_(d) {
  const required = [
    ["name","Name"],
    ["locationPreference","Location Preference"],
    ["preferredWeekend","Preferred Weekend"],
    ["attendanceStatus","Attendance Status"],
    ["numberOfAttendees","Number of Attendees"]
  ];
  required.forEach(([key,label]) => {
    if (!String(d[key] || "").trim()) throw new Error(label + " is required.");
  });

  const allowedLocation = ["Bangalore","Bhadravathi","Either is fine"];
  const allowedDates = [
    "November 14–15, 2026","November 21–22, 2026","November 28–29, 2026",
    "December 5–6, 2026","December 12–13, 2026","Flexible / Any weekend"
  ];
  const allowedAttendance = ["Yes","Maybe","Unfortunately, I can't attend"];
  const allowedPeople = ["Just me","Me + 1","Me + family","Not sure yet"];

  if (!allowedLocation.includes(d.locationPreference)) throw new Error("Invalid location.");
  if (!allowedDates.includes(d.preferredWeekend)) throw new Error("Invalid date.");
  if (!allowedAttendance.includes(d.attendanceStatus)) throw new Error("Invalid attendance status.");
  if (!allowedPeople.includes(d.numberOfAttendees)) throw new Error("Invalid attendee count.");
  if (String(d.name).length > 100) throw new Error("Invalid name.");
}

function clean_(v) {
  const s = String(v || "").trim();
  // Prevent spreadsheet formula injection.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function getSummary_() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(RESPONSE_SHEET);
  const rows = sheet.getDataRange().getValues();
  const data = rows.slice(1);

  const count = (index, value) => data.filter(r => String(r[index]) === value).length;
  const locationValues = ["Bangalore","Bhadravathi","Either is fine"];
  const dateValues = [
    "November 14–15, 2026","November 21–22, 2026","November 28–29, 2026",
    "December 5–6, 2026","December 12–13, 2026","Flexible / Any weekend"
  ];

  const location = locationValues.map(x => ({label:x,count:count(7,x)}));
  const dates = dateValues.map(x => ({label:x,count:count(8,x)}));
  const attendanceBars = [
    {label:"Yes",count:count(9,"Yes")},
    {label:"Maybe",count:count(9,"Maybe")},
    {label:"Can't attend",count:count(9,"Unfortunately, I can't attend")}
  ];

  return {
    totalResponses:data.length,
    attendance:{
      yes:count(9,"Yes"),
      maybe:count(9,"Maybe"),
      cantAttend:count(9,"Unfortunately, I can't attend")
    },
    location:location,
    dates:dates,
    attendanceBars:attendanceBars
  };
}

function buildSummarySheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SUMMARY_SHEET);
  sh.clear();

  sh.getRange("A1").setValue("ESWARAMMA HIGH SCHOOL - CLASS OF '99 REUNION SUMMARY");
  sh.getRange("A3:B6").setValues([
    ["Metric","Count"],
    ["Total responses","=COUNTA(POLL_RESPONSES!A2:A)"],
    ["Yes attending",'=COUNTIF(POLL_RESPONSES!J:J,"Yes")'],
    ["Maybe",'=COUNTIF(POLL_RESPONSES!J:J,"Maybe")']
  ]);
  sh.getRange("D3:E5").setValues([
    ["Location","Count"],
    ["Bangalore",'=COUNTIF(POLL_RESPONSES!H:H,"Bangalore")'],
    ["Bhadravathi",'=COUNTIF(POLL_RESPONSES!H:H,"Bhadravathi")']
  ]);
  sh.getRange("G3:H6").setValues([
    ["Attendance","Count"],
    ["Yes",'=COUNTIF(POLL_RESPONSES!J:J,"Yes")'],
    ["Maybe",'=COUNTIF(POLL_RESPONSES!J:J,"Maybe")'],
    ["Can't attend",'=COUNTIF(POLL_RESPONSES!J:J,"Unfortunately, I can\'t attend")']
  ]);
  sh.autoResizeColumns(1,8);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
