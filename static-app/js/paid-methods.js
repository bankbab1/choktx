// Paid-by methods. Source of truth: Google Sheets `_paid_methods`.
(function () {
  // No mockup defaults. Loaded via Sync.loadMasterIntoStore() after login.
  const DEFAULTS = [];

  function load() {
    const fromStore = window.Store && window.Store.getPaidMethods && window.Store.getPaidMethods();
    return Array.isArray(fromStore) && fromStore.length ? fromStore : [];
  }

  window.PAID_METHODS = load();
  window.PAID_METHOD_DEFAULTS = DEFAULTS;
  window.PAID_ICON_CHOICES = [
    "banknote","smartphone","credit-card","clock","wallet","landmark",
    "coins","qr-code","gift","piggy-bank","badge-dollar-sign","hand-coins"
  ];

  window.savePaidMethods = function (arr) {
    window.Store.setPaidMethods(arr);
    window.PAID_METHODS = arr;
  };
})();
