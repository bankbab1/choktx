// Lightweight modal dialogs:
//   window.confirmModal({ title, message, danger }) -> Promise<boolean>
//   window.alertModal({ title, message, icon, confirmText }) -> Promise<void>
(function () {
  function ensureRoot() {
    let root = document.getElementById("modal-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
    return root;
  }

  const ICONS = {
    success: { lucide: "check", cls: "mi-success" },
    error:   { lucide: "x",     cls: "mi-error" },
    warning: { lucide: "alert-triangle", cls: "mi-warning" },
    info:    { lucide: "info",  cls: "mi-info" },
  };

  function iconHTML(icon) {
    const def = ICONS[icon];
    if (!def) return "";
    return `<div class="modal-icon ${def.cls}"><i data-lucide="${def.lucide}"></i></div>`;
  }

  window.confirmModal = function ({ title = "Are you sure?", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false, icon = null } = {}) {
    return new Promise((resolve) => {
      const root = ensureRoot();
      root.innerHTML = `
        <div class="modal-backdrop" data-close>
          <div class="modal modal-center" role="dialog" aria-modal="true">
            ${iconHTML(icon || (danger ? "warning" : null))}
            <div class="modal-title">${title}</div>
            ${message ? `<div class="modal-message">${message}</div>` : ""}
            <div class="modal-actions modal-actions-stack">
              <button class="btn-sm ${danger ? "danger-solid" : "primary-solid"}" data-act="confirm">${confirmText}</button>
              <button class="btn-sm" data-act="cancel">${cancelText}</button>
            </div>
          </div>
        </div>`;
      window.refreshIcons && window.refreshIcons();

      function close(value) {
        const bd = root.querySelector(".modal-backdrop");
        if (bd) bd.classList.add("closing");
        setTimeout(() => { root.innerHTML = ""; }, 140);
        document.removeEventListener("keydown", onKey);
        resolve(value);
      }
      function onKey(e) {
        if (e.key === "Escape") close(false);
        if (e.key === "Enter") close(true);
      }
      document.addEventListener("keydown", onKey);

      root.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
      root.querySelector('[data-act="confirm"]').addEventListener("click", () => close(true));
      root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) close(false);
      });
    });
  };

  window.alertModal = function ({ title = "", message = "", icon = "info", confirmText = "OK" } = {}) {
    return new Promise((resolve) => {
      const root = ensureRoot();
      root.innerHTML = `
        <div class="modal-backdrop" data-close>
          <div class="modal modal-center" role="dialog" aria-modal="true">
            ${iconHTML(icon)}
            ${title ? `<div class="modal-title">${title}</div>` : ""}
            ${message ? `<div class="modal-message">${message}</div>` : ""}
            <div class="modal-actions modal-actions-stack">
              <button class="btn-sm primary-solid" data-act="ok">${confirmText}</button>
            </div>
          </div>
        </div>`;
      window.refreshIcons && window.refreshIcons();

      function close() {
        const bd = root.querySelector(".modal-backdrop");
        if (bd) bd.classList.add("closing");
        setTimeout(() => { root.innerHTML = ""; }, 140);
        document.removeEventListener("keydown", onKey);
        resolve();
      }
      function onKey(e) { if (e.key === "Escape" || e.key === "Enter") close(); }
      document.addEventListener("keydown", onKey);

      root.querySelector('[data-act="ok"]').addEventListener("click", close);
      root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) close();
      });
    });
  };

  // Monkey-patch window.alert to route through alertModal for consistency.
  const nativeAlert = window.alert.bind(window);
  window.alert = function (msg) {
    try { window.alertModal({ message: String(msg), icon: "info" }); }
    catch (_) { nativeAlert(msg); }
  };
})();
