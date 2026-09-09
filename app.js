(() => {
  const endpoint = window.REUNION_CONFIG?.APPS_SCRIPT_URL;
  const form = document.getElementById("reunionForm");
  const result = document.getElementById("formResult");
  const submitBtn = document.getElementById("submitBtn");
  const stats = {
    total: document.getElementById("statTotal"),
    yes: document.getElementById("statYes"),
    maybe: document.getElementById("statMaybe"),
    cant: document.getElementById("statCant")
  };

  function fingerprint() {
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.platform || ""
    ].join("|");
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }

  function value(name) {
    const el = form.querySelector(`[name="${name}"]:checked`);
    return el ? el.value : (form.elements[name]?.value || "");
  }

  function clearErrors() {
    form.querySelectorAll(".field-error").forEach(e => e.textContent = "");
  }

  function errorFor(name, msg) {
    const el = form.querySelector(`[data-error="${name}"]`);
    if (el) el.textContent = msg;
  }

  function validate() {
    clearErrors();
    let ok = true;
    const name = form.elements.name.value.trim();
    if (!name) { errorFor("name", "Please enter your name."); ok = false; }

    ["locationPreference","preferredWeekend","attendanceStatus","numberOfAttendees"].forEach(n => {
      if (!value(n)) { errorFor(n, "Please select an option."); ok = false; }
    });

    if (!ok) {
      const first = form.querySelector(".field-error:not(:empty)");
      first?.scrollIntoView({behavior:"smooth", block:"center"});
    }
    return ok;
  }

  function showResult(type, html) {
    result.className = `form-result ${type}`;
    result.innerHTML = html;
    result.hidden = false;
    result.scrollIntoView({behavior:"smooth", block:"nearest"});
  }

  async function submit() {
    if (!endpoint) {
      showResult("error", "We couldn't record your vote. Please try again.");
      return;
    }
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    submitBtn.innerHTML = '<span class="spinner"></span> Recording your response…';
    result.hidden = true;

    const data = {
      name: form.elements.name.value.trim(),
      nickname: form.elements.nickname.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      currentCity: form.elements.currentCity.value.trim(),
      locationPreference: value("locationPreference"),
      preferredWeekend: value("preferredWeekend"),
      attendanceStatus: value("attendanceStatus"),
      numberOfAttendees: value("numberOfAttendees"),
      additionalComments: form.elements.additionalComments.value.trim(),
      consentToDisplayName: form.elements.consentToDisplayName.checked ? "Yes" : "No",
      fingerprint: fingerprint()
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify(data),
        redirect: "follow"
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch (_) { payload = null; }

      if (!response.ok || !payload || !payload.ok) {
        const duplicate = payload?.message === "Duplicate submission detected.";
        showResult("error", duplicate
          ? "It looks like this response was already recorded. ❤️"
          : "We couldn't record your vote. Please try again.");
        return;
      }

      showResult("success",
        `<strong>You're on the list! ❤️</strong><br>
         Your response has been recorded successfully.
         <span class="response-id">Response ID: ${payload.responseId || "recorded"}</span>`);
      form.reset();
      loadSummary();
    } catch (e) {
      showResult("error", "We couldn't record your vote. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      submitBtn.innerHTML = "Submit my response <span>→</span>";
    }
  }

  form?.addEventListener("submit", e => {
    e.preventDefault();
    submit();
  });

  async function loadSummary() {
    if (!endpoint) return;
    try {
      const response = await fetch(`${endpoint}?action=summary`, {redirect:"follow"});
      const data = await response.json();
      if (!data.ok) return;

      stats.total.textContent = data.summary.totalResponses ?? 0;
      stats.yes.textContent = data.summary.attendance?.yes ?? 0;
      stats.maybe.textContent = data.summary.attendance?.maybe ?? 0;
      stats.cant.textContent = data.summary.attendance?.cantAttend ?? 0;

      renderBars("locationBars", data.summary.location || []);
      renderBars("dateBars", data.summary.dates || []);
      renderBars("attendanceBars", data.summary.attendanceBars || []);
    } catch (_) {
      // Results are supplemental; keep the form usable if the summary endpoint is unavailable.
    }
  }

  function renderBars(id, items) {
    const root = document.getElementById(id);
    if (!root) return;
    const max = Math.max(1, ...items.map(x => Number(x.count || 0)));
    root.innerHTML = items.map(item => {
      const pct = Math.round((Number(item.count || 0) / max) * 100);
      return `<div class="bar-row">
        <div class="bar-label"><span>${escapeHtml(item.label)}</span><strong>${item.count || 0}</strong></div>
        <div class="bar-track"><span style="width:${pct}%"></span></div>
      </div>`;
    }).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  document.querySelectorAll("[data-scroll]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(btn.dataset.scroll)?.scrollIntoView({behavior:"smooth"});
    });
  });

  loadSummary();
})();
