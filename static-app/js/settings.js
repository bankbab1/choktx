// Settings: category CRUD + data import/export
(function () {
  const catList = document.getElementById("cat-list");

  function renderCats() {
    catList.innerHTML = "";
    CATEGORY_NAMES.forEach(name => {
      const meta = CATEGORIES[name];
      const row = document.createElement("div");
      row.className = "cat-editor-row";
      row.innerHTML = `
        <div class="cat-icon" style="background:${meta.color}1a;color:${meta.color}">
          <i data-lucide="${meta.icon}"></i>
        </div>
        <div class="cat-editor-body">
          <div class="cat-editor-name">${name}</div>
          <div class="cat-editor-subs">
            ${meta.sub.length
              ? meta.sub.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join("")
              : `<span style="opacity:.7">No subcategories</span>`}
          </div>
        </div>
        <div class="cat-editor-actions">
          <button data-edit="${escapeAttr(name)}" aria-label="Edit"><i data-lucide="pencil"></i></button>
          <button class="danger" data-del="${escapeAttr(name)}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
        </div>`;
      catList.appendChild(row);
    });
    window.refreshIcons && window.refreshIcons();
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function escapeAttr(s) { return escapeHtml(s); }

  // Custom prompt sheet for category create/edit
  function openCategoryEditor(originalName) {
    const isEdit = !!originalName;
    const existing = isEdit ? structuredClone(CATEGORIES[originalName]) : null;
    const state = {
      name: originalName || "",
      color: existing?.color || COLOR_CHOICES[0],
      icon: existing?.icon || ICON_CHOICES[0],
      sub: existing?.sub ? [...existing.sub] : [],
    };

    const root = document.getElementById("sheet-root") || (() => {
      const r = document.createElement("div"); r.id = "sheet-root"; document.body.appendChild(r); return r;
    })();

    function html() {
      return `
        <div class="sheet-backdrop" data-close>
          <div class="sheet" role="dialog" aria-modal="true">
            <div class="sheet-handle"><div class="sheet-grip"></div></div>
            <div class="sheet-header">
              <h2 class="sheet-title">${isEdit ? "Edit Category" : "New Category"}</h2>
              <button class="icon-btn sheet-close" data-close aria-label="Close"><i data-lucide="x"></i></button>
            </div>
            <div class="sheet-body">
              <div class="field">
                <label>Name</label>
                <input id="ce-name" type="text" maxlength="40" placeholder="Category name" value="${escapeAttr(state.name)}" />
              </div>
              <div class="field">
                <label>Color</label>
                <div class="swatch-row">
                  ${COLOR_CHOICES.map(c => `<button type="button" class="swatch ${c===state.color?"active":""}" data-color="${c}" style="background:${c}"></button>`).join("")}
                </div>
              </div>
              <div class="field">
                <label>Icon</label>
                <div class="icon-row">
                  ${ICON_CHOICES.map(i => `<button type="button" class="icon-pick ${i===state.icon?"active":""}" data-icon="${i}"><i data-lucide="${i}"></i></button>`).join("")}
                </div>
              </div>
              <div class="field">
                <label>Subcategories</label>
                <div class="sub-list" id="ce-sub-list">
                  ${state.sub.map((s, i) => `<span class="sub-tag">${escapeHtml(s)}<button data-rm-sub="${i}" aria-label="Remove"><i data-lucide="x"></i></button></span>`).join("")}
                </div>
                <div class="sub-add">
                  <input id="ce-sub-input" type="text" maxlength="40" placeholder="Add subcategory" />
                  <button type="button" id="ce-sub-add">Add</button>
                </div>
              </div>
              <button class="btn" id="ce-save">${isEdit ? "Save Changes" : "Create Category"}</button>
              ${isEdit ? `<button class="btn btn-ghost" id="ce-cancel" style="margin-top:8px">Cancel</button>` : ""}
            </div>
          </div>
        </div>`;
    }

    function mount() {
      root.innerHTML = html();
      const backdrop = root.querySelector(".sheet-backdrop");
      const sheet = root.querySelector(".sheet");
      requestAnimationFrame(() => backdrop.classList.add("open"));

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      function close() {
        backdrop.classList.remove("open");
        sheet.style.transform = "translateY(100%)";
        setTimeout(() => { root.innerHTML = ""; document.body.style.overflow = prevOverflow; }, 220);
      }

      backdrop.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === backdrop) close(); });

      root.querySelectorAll("[data-color]").forEach(b => b.addEventListener("click", () => {
        state.color = b.dataset.color;
        root.querySelectorAll("[data-color]").forEach(x => x.classList.toggle("active", x === b));
      }));
      root.querySelectorAll("[data-icon]").forEach(b => b.addEventListener("click", () => {
        state.icon = b.dataset.icon;
        root.querySelectorAll("[data-icon]").forEach(x => x.classList.toggle("active", x === b));
      }));

      const subInput = root.querySelector("#ce-sub-input");
      const subListEl = root.querySelector("#ce-sub-list");
      function renderSubs() {
        subListEl.innerHTML = state.sub.map((s, i) =>
          `<span class="sub-tag">${escapeHtml(s)}<button data-rm-sub="${i}" aria-label="Remove"><i data-lucide="x"></i></button></span>`
        ).join("");
        subListEl.querySelectorAll("[data-rm-sub]").forEach(b => b.addEventListener("click", () => {
          state.sub.splice(Number(b.dataset.rmSub), 1);
          renderSubs();
        }));
        window.refreshIcons && window.refreshIcons();
      }
      renderSubs();

      function addSub() {
        const v = subInput.value.trim();
        if (!v) return;
        if (state.sub.includes(v)) { subInput.value = ""; return; }
        state.sub.push(v);
        subInput.value = "";
        renderSubs();
      }
      root.querySelector("#ce-sub-add").addEventListener("click", addSub);
      subInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); addSub(); }
      });

      root.querySelector("#ce-save").addEventListener("click", () => {
        const nameInput = root.querySelector("#ce-name");
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        const next = structuredClone(CATEGORIES);
        if (isEdit && name !== originalName) delete next[originalName];
        if (!isEdit && next[name]) { window.alertModal({ title: "Already exists", message: `A category named "${name}" already exists.`, icon: "warning" }); return; }
        next[name] = { color: state.color, icon: state.icon, sub: state.sub };
        saveCategories(next);
        close();
        renderCats();
      });

      const cancelBtn = root.querySelector("#ce-cancel");
      if (cancelBtn) cancelBtn.addEventListener("click", close);

      window.refreshIcons && window.refreshIcons();
    }
    mount();
  }

  catList.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (edit) openCategoryEditor(edit.dataset.edit);
    if (del) {
      const name = del.dataset.del;
      const ok = await window.confirmModal({
        title: `Delete "${name}"?`,
        message: "Existing records keep their category label, but it will no longer appear in the picker.",
        confirmText: "Delete",
        danger: true,
      });
      if (!ok) return;
      const next = structuredClone(CATEGORIES);
      delete next[name];
      saveCategories(next);
      renderCats();
    }
  });

  document.getElementById("add-cat-btn").addEventListener("click", () => openCategoryEditor(null));

  // === Data utilities (unchanged) ===
  window.exportData = function () {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  window.importData = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { Store.importJSON(ev.target.result); window.alertModal({ title: "Imported", message: "Your data has been imported successfully.", icon: "success" }); }
      catch (err) { window.alertModal({ title: "Import failed", message: err.message, icon: "error" }); }
    };
    reader.readAsText(file);
  };
  window.clearAll = async function () {
    const ok = await window.confirmModal({
      title: "Delete ALL records?",
      message: "This cannot be undone.",
      confirmText: "Delete all",
      danger: true,
    });
    if (ok) { Store.clear(); renderCats(); }
  };

  // === Paid By Methods CRUD ===
  const paidList = document.getElementById("paid-list");

  function renderPaid() {
    if (!paidList) return;
    paidList.innerHTML = "";
    (window.PAID_METHODS || []).forEach((m, idx) => {
      const row = document.createElement("div");
      row.className = "cat-editor-row";
      row.innerHTML = `
        <div class="cat-icon" style="background:var(--surface-2);color:var(--text)">
          <i data-lucide="${m.icon}"></i>
        </div>
        <div class="cat-editor-body">
          <div class="cat-editor-name">${escapeHtml(m.name)}</div>
        </div>
        <div class="cat-editor-actions">
          <button data-edit-paid="${idx}" aria-label="Edit"><i data-lucide="pencil"></i></button>
          <button class="danger" data-del-paid="${idx}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
        </div>`;
      paidList.appendChild(row);
    });
    window.refreshIcons && window.refreshIcons();
  }

  function openPaidEditor(idx) {
    const isEdit = idx != null;
    const existing = isEdit ? structuredClone(window.PAID_METHODS[idx]) : null;
    const state = { name: existing?.name || "", icon: existing?.icon || PAID_ICON_CHOICES[0] };

    const root = document.getElementById("sheet-root") || (() => {
      const r = document.createElement("div"); r.id = "sheet-root"; document.body.appendChild(r); return r;
    })();

    root.innerHTML = `
      <div class="sheet-backdrop" data-close>
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle"><div class="sheet-grip"></div></div>
          <div class="sheet-header">
            <h2 class="sheet-title">${isEdit ? "Edit Paid Method" : "New Paid Method"}</h2>
            <button class="icon-btn sheet-close" data-close aria-label="Close"><i data-lucide="x"></i></button>
          </div>
          <div class="sheet-body">
            <div class="field">
              <label>Name</label>
              <input id="pe-name" type="text" maxlength="30" placeholder="e.g. Cash" value="${escapeAttr(state.name)}" />
            </div>
            <div class="field">
              <label>Icon</label>
              <div class="icon-row">
                ${PAID_ICON_CHOICES.map(i => `<button type="button" class="icon-pick ${i===state.icon?"active":""}" data-picon="${i}"><i data-lucide="${i}"></i></button>`).join("")}
              </div>
            </div>
            <button class="btn" id="pe-save">${isEdit ? "Save Changes" : "Create"}</button>
          </div>
        </div>
      </div>`;

    const backdrop = root.querySelector(".sheet-backdrop");
    const sheet = root.querySelector(".sheet");
    requestAnimationFrame(() => backdrop.classList.add("open"));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function close() {
      backdrop.classList.remove("open");
      sheet.style.transform = "translateY(100%)";
      setTimeout(() => { root.innerHTML = ""; document.body.style.overflow = prevOverflow; }, 220);
    }
    backdrop.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === backdrop) close(); });

    root.querySelectorAll("[data-picon]").forEach(b => b.addEventListener("click", () => {
      state.icon = b.dataset.picon;
      root.querySelectorAll("[data-picon]").forEach(x => x.classList.toggle("active", x === b));
    }));

    root.querySelector("#pe-save").addEventListener("click", () => {
      const nameInput = root.querySelector("#pe-name");
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      const next = structuredClone(window.PAID_METHODS);
      if (!isEdit && next.some(m => m.name === name)) { window.alertModal({ title: "Already exists", message: `A method named "${name}" already exists.`, icon: "warning" }); return; }
      const entry = { name, icon: state.icon };
      if (isEdit) next[idx] = entry; else next.push(entry);
      savePaidMethods(next);
      close();
      renderPaid();
    });

    window.refreshIcons && window.refreshIcons();
  }

  if (paidList) {
    paidList.addEventListener("click", async (e) => {
      const edit = e.target.closest("[data-edit-paid]");
      const del = e.target.closest("[data-del-paid]");
      if (edit) openPaidEditor(Number(edit.dataset.editPaid));
      if (del) {
        const i = Number(del.dataset.delPaid);
        const m = window.PAID_METHODS[i];
        const ok = await window.confirmModal({
          title: `Delete "${m.name}"?`,
          message: "Existing records keep their label, but it will no longer appear in the picker.",
          confirmText: "Delete",
          danger: true,
        });
        if (!ok) return;
        const next = structuredClone(window.PAID_METHODS);
        next.splice(i, 1);
        savePaidMethods(next);
        renderPaid();
      }
    });
    document.getElementById("add-paid-btn").addEventListener("click", () => openPaidEditor(null));
  }

  renderCats();
  renderPaid();
})();

// ===== Google Sheets Sync UI =====
(function () {
  if (!window.Sync) return;
  const urlEl = document.getElementById("gs-url");
  const tokEl = document.getElementById("gs-token");
  const statusEl = document.getElementById("gs-status");
  if (!urlEl) return;

  const cfg = Sync.getCfg();
  urlEl.value = cfg.url || "";
  tokEl.value = cfg.token || "";

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.style.color = kind === "ok" ? "var(--success, #22c55e)"
                         : kind === "err" ? "var(--danger, #ef4444)"
                         : "var(--text-muted)";
  }
  if (Sync.isConfigured()) {
    const last = Sync.getLast();
    setStatus(last ? `Configured · last sync ${new Date(last).toLocaleString()}` : "Configured");
  }

  document.getElementById("gs-save").addEventListener("click", () => {
    Sync.setCfg({ url: urlEl.value.trim(), token: tokEl.value.trim() });
    setStatus("Saved", "ok");
  });

  document.getElementById("gs-test").addEventListener("click", async () => {
    Sync.setCfg({ url: urlEl.value.trim(), token: tokEl.value.trim() });
    setStatus("Testing…");
    try { await Sync.ping(); setStatus("Connected ✓", "ok"); }
    catch (e) { setStatus("Failed: " + e.message, "err"); }
  });

  document.getElementById("gs-pull").addEventListener("click", async () => {
    setStatus("Pulling current month…");
    try {
      const n = await Sync.pullCurrentMonth();
      setStatus(`Pulled ${n} record(s) for this month`, "ok");
    } catch (e) { setStatus("Pull failed: " + e.message, "err"); }
  });

  document.getElementById("gs-push").addEventListener("click", async () => {
    const ok = await window.confirmModal({
      title: "Push all local records?",
      message: "This appends every local record to your Google Sheet. Run this once when you first connect.",
      confirmText: "Push",
    });
    if (!ok) return;
    setStatus("Pushing…");
    try {
      const n = await Sync.pushAllLocal();
      setStatus(`Pushed ${n} record(s)`, "ok");
    } catch (e) { setStatus("Push failed: " + e.message, "err"); }
  });
})();
