// Bottom sheet for the expense form. Swipe down or tap backdrop to close.
(function () {
  function ensureRoot() {
    let r = document.getElementById("sheet-root");
    if (r) return r;
    r = document.createElement("div");
    r.id = "sheet-root";
    document.body.appendChild(r);
    return r;
  }

  function openAddSheet(opts = {}) {
    const { editId = null, onSaved = null } = opts;
    const root = ensureRoot();
    root.innerHTML = `
      <div class="sheet-backdrop" data-close>
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle" data-handle>
            <div class="sheet-grip"></div>
          </div>
          <div class="sheet-header">
            <h2 class="sheet-title">${editId ? "Edit Expense" : "Add Expense"}</h2>
            <button class="icon-btn sheet-close" data-close aria-label="Close"><i data-lucide="x"></i></button>
          </div>
          <div class="sheet-body" data-form-host>${window.expenseFormTemplate()}</div>
        </div>
      </div>`;

    const backdrop = root.querySelector(".sheet-backdrop");
    const sheet = root.querySelector(".sheet");
    const host = root.querySelector("[data-form-host]");
    const handle = root.querySelector("[data-handle]");

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => backdrop.classList.add("open"));

    function close() {
      backdrop.classList.remove("open");
      sheet.style.transform = "translateY(100%)";
      setTimeout(() => { root.innerHTML = ""; document.body.style.overflow = prevOverflow; document.removeEventListener("keydown", onKey); }, 220);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);

    // Prevent any document-level delegations (nav.js, etc.) from acting on
    // clicks inside the sheet (e.g. data-edit / data-add lookalikes).
    sheet.addEventListener("click", (e) => e.stopPropagation());
    sheet.addEventListener("mousedown", (e) => e.stopPropagation());
    sheet.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

    // Prevent any document-level delegations (nav.js, etc.) from acting on
    // clicks inside the sheet (e.g. data-edit / data-add lookalikes).
    sheet.addEventListener("click", (e) => e.stopPropagation());
    sheet.addEventListener("mousedown", (e) => e.stopPropagation());
    sheet.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

    // Bind close button directly — the stopPropagation above prevents the
    // backdrop's delegated handler from ever seeing the click.
    root.querySelectorAll(".sheet-close").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); close(); });
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    // Swipe-down to close — ONLY from the handle. Dragging from inputs/body
    // was causing accidental closes while typing or scrolling.
    let startY = 0, dragY = 0, dragging = false;
    handle.addEventListener("touchstart", (e) => {
      dragging = true; startY = e.touches[0].clientY; dragY = 0;
      sheet.style.transition = "none";
    }, { passive: true });
    handle.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      dragY = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = `translateY(${dragY}px)`;
    }, { passive: true });
    handle.addEventListener("touchend", () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      if (dragY > 120) close();
      else sheet.style.transform = "";
    });

    window.initExpenseForm(host, {
      editId,
      onSaved: (rec, isEdit) => {
        close();
        if (onSaved) onSaved(rec, isEdit);
      },
    });
    window.refreshIcons && window.refreshIcons();
  }

  window.openAddSheet = openAddSheet;
})();
