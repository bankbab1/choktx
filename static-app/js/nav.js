// Shared bottom-nav HTML so we can render lucide icons in one place.
window.renderBottomNav = function (active) {
  return `
    <nav class="bottom-nav">
      <div class="bottom-nav-inner">
        <a href="index.html" data-key="home"${active === "home" ? ' class="active"' : ""}>
          <i data-lucide="layout-dashboard"></i><span>Home</span>
        </a>
        <a href="history.html" data-key="history"${active === "history" ? ' class="active"' : ""}>
          <i data-lucide="list"></i><span>History</span>
        </a>
        <a href="add.html" class="add-btn"><i data-lucide="plus"></i><span>Add</span></a>
        <a href="settings.html" data-key="settings"${active === "settings" ? ' class="active"' : ""}>
          <i data-lucide="settings"></i><span>Settings</span>
        </a>
        <a href="#" onclick="event.preventDefault();Theme.toggle();window.refreshIcons();this.querySelector('span').textContent=Theme.get()==='dark'?'Light':'Dark';">
          <i data-lucide="moon"></i><span>Theme</span>
        </a>
      </div>
    </nav>`;
};

// Re-render lucide icons in the document (call after injecting HTML).
window.refreshIcons = function () {
  if (window.lucide) window.lucide.createIcons();
};

document.addEventListener("DOMContentLoaded", () => {
  // mount nav if there's a placeholder
  const slot = document.getElementById("bottom-nav-slot");
  if (slot) {
    slot.outerHTML = window.renderBottomNav(slot.dataset.active || "");
  }
  window.refreshIcons();
});
