// Global TOTP login gate. Shows a modal on every page until logged in.
(function () {
  if (!window.Sync) return;

  // Logged-in path: keep frontend in sync with Sheets.
  //  - On page load/refresh: pull master + current month from Sheets.
  //  - On tab visibility return: pull again (throttled to 60s).
  //  - NEVER sync while a sheet/modal is open (would reset the UI under the user).
  //  - Dispatch `expenses-synced` ONLY when data actually changed.
  if (Sync.loggedIn()) {
    const cats = window.Store && window.Store.getCategories && window.Store.getCategories();
    const paid = window.Store && window.Store.getPaidMethods && window.Store.getPaidMethods();
    const needMaster = !cats || !Object.keys(cats || {}).length || !Array.isArray(paid) || !paid.length;

    const THROTTLE_MS = 60000;
    let lastSyncAt = 0;
    let syncing = false;

    function snapshot() {
      return [
        localStorage.getItem("expenses_v1") || "",
        localStorage.getItem("categories_v1") || "",
        localStorage.getItem("paid_methods_v1") || "",
      ].join("|");
    }
    function uiBusy() {
      const r = document.getElementById("sheet-root");
      return !!(r && r.childElementCount) ||
        !!document.querySelector(".sheet-backdrop, .modal-backdrop");
    }

    async function syncFromSheets({ withMaster = false, force = false } = {}) {
      if (syncing) return;
      if (!force && Date.now() - lastSyncAt < THROTTLE_MS) return;
      if (uiBusy()) return; // don't yank the UI while the user is in a sheet
      syncing = true;
      lastSyncAt = Date.now();
      const before = snapshot();
      try {
        if (withMaster) await Sync.loadMasterIntoStore();
        if (Sync.pullYearToDate) await Sync.pullYearToDate();
        else await Sync.pullCurrentMonth();
        if (snapshot() !== before && !uiBusy()) {
          window.dispatchEvent(new CustomEvent("expenses-synced"));
        }
      } catch (e) { /* offline / expired session — leave local data alone */ }
      finally { syncing = false; }
    }
    window.syncFromSheets = syncFromSheets;

    // First load only: if master cache is missing, pull it ONCE in the
    // background so dropdowns work. No reload, no forced re-render.
    // Subsequent operations never trigger auto-sync — user explicitly
    // refreshes via pull-to-refresh or the Settings "Sync" button.
    if (needMaster && !sessionStorage.getItem("master_boot_attempted")) {
      sessionStorage.setItem("master_boot_attempted", "1");
      const before = snapshot();
      Sync.loadMasterIntoStore()
        .then(() => (Sync.pullYearToDate ? Sync.pullYearToDate() : Sync.pullCurrentMonth()).catch(() => {}))
        .then(() => {
          if (snapshot() !== before && !uiBusy()) {
            window.dispatchEvent(new CustomEvent("expenses-synced"));
          }
        })
        .catch(() => {});
    }
    return;
  }


  const css = `
    .auth-gate-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);
      backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;
      z-index:99999;padding:20px}
    .auth-gate-card{background:var(--surface,#fff);color:var(--text,#111);
      border-radius:18px;max-width:360px;width:100%;padding:24px;
      box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center}
    .auth-gate-card h2{margin:0 0 6px;font-size:20px}
    .auth-gate-card p{margin:0 0 18px;color:var(--text-muted,#666);font-size:14px}
    .auth-gate-card input{width:100%;font-size:24px;text-align:center;letter-spacing:8px;
      padding:14px;border-radius:12px;border:1px solid var(--border,#ddd);
      background:var(--surface-2,#f5f5f5);color:var(--text,#111);box-sizing:border-box}
    .auth-gate-card button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:12px;
      background:var(--accent,#3b82f6);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
    .auth-gate-card button.ghost{background:var(--surface-2,#f5f5f5);color:var(--text,#111);
      border:1px solid var(--border,#ddd)}
    .auth-gate-card button:disabled{opacity:.6;cursor:not-allowed}
    .auth-gate-msg{min-height:18px;margin-top:10px;font-size:13px}
    .auth-gate-msg.err{color:#ef4444}
    .auth-gate-msg.ok{color:#22c55e}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "auth-gate-backdrop";
  wrap.innerHTML = `
    <div class="auth-gate-card" role="dialog" aria-modal="true">
      <h2>🔒 Sign in</h2>
      <p>Enter the 6-digit code from your Authenticator app.</p>
      <input id="ag-code" type="text" inputmode="numeric" autocomplete="one-time-code"
             pattern="[0-9]{6}" maxlength="6" placeholder="••••••" />
      <button id="ag-paste" class="ghost" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>Paste code</button>
      <button id="ag-submit">Unlock</button>
      <div class="auth-gate-msg" id="ag-msg"></div>
    </div>`;

  function mount() {
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    const input = wrap.querySelector("#ag-code");
    const btn = wrap.querySelector("#ag-submit");
    const msg = wrap.querySelector("#ag-msg");
    setTimeout(() => input.focus(), 50);

    async function submit() {
      const code = (input.value || "").trim();
      if (!/^\d{6}$/.test(code)) { msg.textContent = "Enter the 6-digit code"; msg.className = "auth-gate-msg err"; return; }
      btn.disabled = true; msg.textContent = "Verifying…"; msg.className = "auth-gate-msg";
      try {
        await Sync.login(code);
        msg.textContent = "Loading data…";
        try { await Sync.loadMasterIntoStore(); } catch (e) { /* non-fatal */ }
        try { await Sync.pullCurrentMonth(); } catch (e) { /* non-fatal */ }
        msg.textContent = "Unlocked"; msg.className = "auth-gate-msg ok";
        setTimeout(() => {
          wrap.remove();
          document.body.style.overflow = "";
          // Reload so every page re-reads CATEGORIES / PAID_METHODS from Store.
          location.reload();
        }, 300);
      } catch (e) {
        msg.textContent = "Login failed: " + e.message;
        msg.className = "auth-gate-msg err";
        btn.disabled = false;
        input.select();
      }
    }
    btn.addEventListener("click", submit);
    const pasteBtn = wrap.querySelector("#ag-paste");
    pasteBtn.addEventListener("click", async () => {
      // Try the Clipboard API first (works on Chrome / Android / desktop Safari 13.1+).
      // iOS Safari blocks readText() — fall back to focusing the field so iOS
      // shows its native "Paste" bubble above the input.
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const txt = await navigator.clipboard.readText();
          const digits = (txt || "").replace(/\D/g, "").slice(0, 6);
          if (digits) {
            input.value = digits;
            if (digits.length === 6) { submit(); return; }
          }
        } catch (e) { /* fall through to focus */ }
      }
      input.focus();
      msg.textContent = "Tap the field, then tap Paste";
      msg.className = "auth-gate-msg";
    });
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
      if (input.value.length === 6) submit();
    });
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
