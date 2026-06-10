// Category tree with lucide icon names (no emoji). Persisted via Store.
(function () {
  const DEFAULTS = {
    "Fixed Cost":      { color: "#6366f1", icon: "pin",            sub: ["Phone Bill", "AI Subscription"] },
    "Daily Paid":      { color: "#22c55e", icon: "utensils",       sub: ["Food", "Drink", "Dessert", "Bakery", "Snack"] },
    "One-Time Paid":   { color: "#f59e0b", icon: "shopping-bag",   sub: [] },
    "Parking Fee":     { color: "#06b6d4", icon: "square-parking", sub: [] },
    "Express Way Fee": { color: "#0ea5e9", icon: "milestone",      sub: [] },
    "Invest":          { color: "#a855f7", icon: "trending-up",    sub: ["Crypto", "Stock"] },
    "Savings":         { color: "#10b981", icon: "piggy-bank",     sub: [] },
  };

  function load() {
    const fromStore = window.Store && window.Store.getCategories && window.Store.getCategories();
    return fromStore && Object.keys(fromStore).length ? fromStore : structuredClone(DEFAULTS);
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
