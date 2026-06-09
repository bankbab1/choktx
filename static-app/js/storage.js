// localStorage wrapper for expense records
(function () {
  const KEY = "expenses_v1";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  window.Store = {
    all() { return read().sort((a, b) => b.date.localeCompare(a.date)); },
    add(rec) {
      const list = read();
      rec.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      list.push(rec);
      write(list);
      return rec;
    },
    remove(id) { write(read().filter(r => r.id !== id)); },
    clear() { localStorage.removeItem(KEY); },
    exportJSON() { return JSON.stringify(read(), null, 2); },
    importJSON(text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid file");
      write(data);
    },
  };
})();
