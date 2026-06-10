// Shared bottom-nav HTML. 4 tabs + centered add button. Theme toggle lives in the header.
window.renderBottomNav = function (active) {
  return `
    <nav class="bottom-nav">
      <div class="bottom-nav-inner">
        <a href="index.html"${active === "home" ? ' class="active"' : ""}>
          <i data-lucide="layout-dashboard"></i><span>Home</span>
        </a>
        <a href="history.html"${active === "history" ? ' class="active"' : ""}>
          <i data-lucide="list"></i><span>History</span>
        </a>
        <a href="add.html" class="add-btn" data-add aria-label="Add expense">
          <i data-lucide="plus"></i><span>Add</span>
        </a>
        <a href="stats.html"${active === "stats" ? ' class="active"' : ""}>
          <i data-lucide="pie-chart"></i><span>Stats</span>
        </a>
        <a href="settings.html"${active === "settings" ? ' class="active"' : ""}>
          <i data-lucide="settings"></i><span>Settings</span>
        </a>
      </div>
    </nav>`;
};

window.refreshIcons = function () {
  if (window.lucide) window.lucide.createIcons();
};

window.applyThemeIcon = function () {
  document.querySelectorAll("[data-theme-icon]").forEach(el => {
    el.setAttribute("data-lucide", Theme.get() === "dark" ? "sun" : "moon");
  });
  window.refreshIcons();
};

window.toggleTheme = function () {
  Theme.toggle();
  window.applyThemeIcon();
};

document.addEventListener("DOMContentLoaded", () => {
  const slot = document.getElementById("bottom-nav-slot");
  if (slot) slot.outerHTML = window.renderBottomNav(slot.dataset.active || "");
  window.applyThemeIcon();

  // Intercept Add nav button -> open bottom sheet (when sheet.js is loaded)
  document.addEventListener("click", (e) => {
    const addLink = e.target.closest("[data-add]");
    if (addLink && window.openAddSheet) {
      e.preventDefault();
      window.openAddSheet({
        onSaved: () => {
          if (typeof window.onExpenseSaved === "function") window.onExpenseSaved();
        },
      });
    }
    const editLink = e.target.closest("[data-edit]");
    if (editLink && window.openAddSheet) {
      e.preventDefault();
      window.openAddSheet({
        editId: editLink.dataset.edit,
        onSaved: () => {
          if (typeof window.onExpenseSaved === "function") window.onExpenseSaved();
        },
      });
    }
  });
});
