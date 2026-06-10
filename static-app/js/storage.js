// localStorage wrapper for expense records + categories
(function () {
  const KEY = "expenses_v1";
  const CAT_KEY = "categories_v1";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  window.Store = {
    all() { return read().sort((a, b) => b.date.localeCompare(a.date)); },
    get(id) { return read().find(r => r.id === id) || null; },
    add(rec) {
      const list = read();
      rec.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      list.push(rec);
      write(list);
      return rec;
    },
    update(id, patch) {
      const list = read();
      const i = list.findIndex(r => r.id === id);
      if (i === -1) return null;
      list[i] = { ...list[i], ...patch, id };
      write(list);
      return list[i];
    },
    remove(id) { write(read().filter(r => r.id !== id)); },
    clear() { localStorage.removeItem(KEY); },
    exportJSON() { return JSON.stringify(read(), null, 2); },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid file");
      write(data);
    },

    // Categories
    getCategories() {
      try {
        const raw = localStorage.getItem(CAT_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    },
    setCategories(obj) {
      localStorage.setItem(CAT_KEY, JSON.stringify(obj));
    },
  };
})();
