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

  function slugId(name) {
    const s = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return "pm_" + (s || "x") + "_" + Math.random().toString(36).slice(2, 6);
  }

  function serializePaid(arr) {
    const prev = (window.Store && window.Store.getPaidMethodsMeta && window.Store.getPaidMethodsMeta()) || {};
    return arr.map((m, i) => ({
      id: (prev[m.name] && prev[m.name].id) || slugId(m.name),
      name: m.name,
      icon: m.icon || "wallet",
      sort_order: i + 1,
      active: true,
    }));
  }

  window.savePaidMethods = function (arr) {
    window.Store.setPaidMethods(arr);
    window.PAID_METHODS = arr;
    if (window.Sync && window.Sync.loggedIn && window.Sync.loggedIn()) {
      window.Sync.bgPush("saveMaster", { paid_methods: serializePaid(arr) });
    }
  };
})();
