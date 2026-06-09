// Lightweight confirm modal: window.confirmModal({ title, message, danger }) -> Promise<boolean>
(function () {
  function ensureRoot() {
    let root = document.getElementById("modal-root");
    if (root) return root;
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
    return root;
  }

  window.confirmModal = function ({ title = "Are you sure?", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
    return new Promise((resolve) => {
      const root = ensureRoot();
      root.innerHTML = `
        <div class="modal-backdrop" data-close>
          <div class="modal" role="dialog" aria-modal="true">
            <div class="modal-title">${title}</div>
            ${message ? `<div class="modal-message">${message}</div>` : ""}
            <div class="modal-actions">
              <button class="btn-sm" data-act="cancel">${cancelText}</button>
              <button class="btn-sm ${danger ? "danger-solid" : "primary-solid"}" data-act="confirm">${confirmText}</button>
            </div>
          </div>
        </div>`;

      function close(value) {
        root.innerHTML = "";
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
        if (e.target.dataset.close !== undefined) close(false);
      });
    });
  };
})();
