// Category tree with lucide icon names (no emoji). Source of truth: Google Sheets.
(function () {
  // No mockup defaults. Categories come from the `_categories` / `_subcategories`
  // sheets via Sync.loadMasterIntoStore() after login.
  const DEFAULTS = {};

  function load() {
    const fromStore = window.Store && window.Store.getCategories && window.Store.getCategories();
    return fromStore && Object.keys(fromStore).length ? fromStore : {};
  }

  window.CATEGORIES = load();
  window.CATEGORY_NAMES = Object.keys(window.CATEGORIES);
  window.CATEGORY_DEFAULTS = DEFAULTS;
  window.ICON_CHOICES = [
    "pin","utensils","shopping-bag","square-parking","milestone","trending-up",
    "piggy-bank","car","fuel","home","heart","gift","plane","book","coffee",
    "shirt","wrench","graduation-cap","stethoscope","dumbbell","film","music",
    "smartphone","tv","wifi","zap","sparkles","baby","dog","tree-pine"
  ];
  window.COLOR_CHOICES = [
    "#6366f1","#22c55e","#f59e0b","#06b6d4","#0ea5e9","#a855f7","#10b981",
    "#ef4444","#ec4899","#f97316","#84cc16","#14b8a6","#8b5cf6","#64748b"
  ];

  window.saveCategories = function (obj) {
    window.Store.setCategories(obj);
    window.CATEGORIES = obj;
    window.CATEGORY_NAMES = Object.keys(obj);
  };
})();
