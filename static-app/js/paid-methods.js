// Paid-by methods: defaults + persistence. Each: { name, icon }.
(function () {
  const DEFAULTS = [
    { name: "Cash",           icon: "banknote" },
    { name: "Mobile Banking", icon: "smartphone" },
    { name: "Credit",         icon: "credit-card" },
    { name: "Spaylater",      icon: "clock" },
  ];

  function load() {
    const fromStore = window.Store && window.Store.getPaidMethods && window.Store.getPaidMethods();
    return Array.isArray(fromStore) && fromStore.length ? fromStore : structuredClone(DEFAULTS);
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
