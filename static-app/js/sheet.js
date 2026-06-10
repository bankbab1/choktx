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

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) { close(); return; }
      const closeBtn = e.target.closest(".sheet-close");
      if (closeBtn && sheet.contains(closeBtn)) close();
    });

    // Swipe-down to close (drag the handle area, or the sheet when scrolled to top)
    let startY = 0, dragY = 0, dragging = false, body = root.querySelector(".sheet-body");
    function onTouchStart(e) {
      const t = e.touches[0];
      // allow drag from handle always, or from body only if scrolled to top
      if (e.currentTarget === body && body.scrollTop > 0) return;
      dragging = true; startY = t.clientY; dragY = 0;
      sheet.style.transition = "none";
    }
    function onTouchMove(e) {
      if (!dragging) return;
      dragY = e.touches[0].clientY - startY;
      if (dragY < 0) dragY = 0;
      sheet.style.transform = `translateY(${dragY}px)`;
    }
    function onTouchEnd() {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      if (dragY > 120) close();
      else sheet.style.transform = "";
    }
    handle.addEventListener("touchstart", onTouchStart, { passive: true });
    handle.addEventListener("touchmove", onTouchMove, { passive: true });
    handle.addEventListener("touchend", onTouchEnd);
    body.addEventListener("touchstart", onTouchStart, { passive: true });
    body.addEventListener("touchmove", onTouchMove, { passive: true });
    body.addEventListener("touchend", onTouchEnd);

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
