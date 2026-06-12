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

  function slugId(prefix, name) {
    const s = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return prefix + (s || "x") + "_" + Math.random().toString(36).slice(2, 6);
  }

  // Build category + subcategory rows from the {name:{color,icon,sub:[]}} map
  function serializeCategories(obj) {
    const prev = (window.Store && window.Store.getCategoriesMeta && window.Store.getCategoriesMeta()) || {};
    const categories = [];
    const subcategories = [];
    let i = 0;
    Object.keys(obj).forEach(name => {
      const m = obj[name] || {};
      const prevMeta = prev[name] || {};
      const id = prevMeta.id || slugId("cat_", name);
      categories.push({ id, name, color: m.color || "#6366f1", icon: m.icon || "tag", sort_order: ++i, active: true });
      (m.sub || []).forEach((sn, j) => {
        const prevSub = (prevMeta.subIds && prevMeta.subIds[sn]) || null;
        subcategories.push({
          id: prevSub || slugId("sub_", sn),
          category_id: id,
          category_name: name,
          name: sn,
          sort_order: j + 1,
          active: true,
        });
      });
    });
    return { categories, subcategories };
  }

  window.saveCategories = function (obj) {
    window.Store.setCategories(obj);
    window.CATEGORIES = obj;
    window.CATEGORY_NAMES = Object.keys(obj);
    // Push to Google Sheets master in the background; do not auto-refresh.
    if (window.Sync && window.Sync.loggedIn && window.Sync.loggedIn()) {
      const payload = serializeCategories(obj);
      window.Sync.bgPush("saveMaster", payload);
    }
  };
})();
