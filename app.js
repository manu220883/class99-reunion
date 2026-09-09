const form = document.getElementById("reunionForm");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("formStatus");

const REQUIRED_RADIOS = ["locationPreference","preferredWeekend","attendanceStatus","numberOfAttendees"];

function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function showError(field, message) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) el.textContent = message || "";
}

function validate() {
  let ok = true;
  const name = document.getElementById("name").value.trim();
  if (!name) { showError("name", "Please enter your name."); ok = false; } else showError("name","");
  for (const field of REQUIRED_RADIOS) {
    if (!getRadio(field)) { showError(field, "Please select an option."); ok = false; }
    else showError(field,"");
  }
  return ok;
}

function setStatus(type, message) {
  statusEl.className = `form-status ${type}`;
  statusEl.textContent = message;
}

function makeFingerprint(payload) {
  return btoa(unescape(encodeURIComponent([
    payload.name, payload.locationPreference, payload.preferredWeekend,
    payload.attendanceStatus, payload.numberOfAttendees
  ].join("|").toLowerCase()))).slice(0,80);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";
  statusEl.textContent = "";
  if (!validate()) return;

  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    setStatus("failure", "The reunion form is not connected yet. Please contact the organizers.");
    return;
  }

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.fingerprint = makeFingerprint(payload);

  const lastFingerprint = localStorage.getItem("reunionSubmissionFingerprint");
  if (lastFingerprint === payload.fingerprint) {
    setStatus("failure", "It looks like you already submitted this response from this browser. If you need to change your response, please contact the organizers.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Recording response…";

  try {
    // Apps Script accepts POSTed JSON. no credentials are present in this frontend.
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.message || "Submission failed");
    localStorage.setItem("reunionSubmissionFingerprint", payload.fingerprint);
    setStatus("success", `🎉 Your response has been recorded! Response ID: ${result.responseId}`);
    form.reset();
    loadResults();
  } catch (err) {
    console.error(err);
    setStatus("failure", "We couldn't record your vote. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit My Response";
  }
});

function renderBars(containerId, items) {
  const el = document.getElementById(containerId);
  const max = Math.max(1, ...items.map(x => Number(x.count || 0)));
  el.innerHTML = items.map(x => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(x.label)}</span><strong>${x.count}</strong></div>
      <div class="bar"><i style="width:${Math.round((x.count/max)*100)}%"></i></div>
    </div>`).join("");
}
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function loadResults() {
  if (!CONFIG.ENABLE_PUBLIC_RESULTS || !CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) return;
  fetch(CONFIG.APPS_SCRIPT_URL + "?action=summary")
    .then(r => r.json())
    .then(data => {
      if (!data.ok) return;
      const s = data.summary;
      document.getElementById("resultsGrid").innerHTML = `
        <div class="result-card"><strong>${s.totalResponses}</strong><span>Total responses</span></div>
        <div class="result-card"><strong>${s.attendance.yes}</strong><span>Yes attending</span></div>
        <div class="result-card"><strong>${s.attendance.maybe}</strong><span>Maybe</span></div>
        <div class="result-card"><strong>${s.attendance.cantAttend}</strong><span>Can't attend</span></div>`;
      renderBars("locationChart", s.location);
      renderBars("dateChart", s.dates);
      renderBars("attendanceChart", s.attendanceBars);
    }).catch(console.error);
}
loadResults();
