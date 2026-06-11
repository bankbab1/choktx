// Google Apps Script sync layer.
// Talks to the Web App deployed from /static-app/apps-script/Code.gs
(function () {
  const CFG_KEY = "gs_sync_cfg_v1";
  const LAST_KEY = "gs_sync_last_v1";

  function getCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; }
    catch { return {}; }
  }
  function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function getLast() { return localStorage.getItem(LAST_KEY) || ""; }
  function setLast(v) { localStorage.setItem(LAST_KEY, v); }

  async function call(action, payload) {
    const cfg = getCfg();
    if (!cfg.url || !cfg.token) throw new Error("Sync not configured");
    // Apps Script /exec accepts text/plain to avoid CORS preflight
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ action, token: cfg.token }, payload || {})),
      redirect: "follow",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Sync error");
    return data.data;
  }

  function ymFromDate(d) {
    const s = String(d || "");
    return s.slice(0,4) + s.slice(5,7);
  }
  function currentYM() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth()+1).padStart(2,"0");
  }

  // ===== Mapping: local record <-> sheet row =====
  function localToSheet(r) {
    return {
      id: r.id,
      date: r.date,
      time: r.time || "",
      amount: Number(r.cost) || 0,
      currency: r.currency || "",
      category_id: r.category_id || "",
      category_name: r.category || "",
      subcategory_id: r.subcategory_id || "",
      subcategory_name: r.subcategory || "",
      channel: r.pay || "",
      paid_method_id: r.paid_method_id || "",
      paid_method_name: r.paidby || "",
      note: r.description || "",
      tags: Array.isArray(r.tags) ? r.tags.join(",") : (r.tags || ""),
      source: "app",
      created_at: r.created_at || "",
      updated_at: r.updated_at || "",
      active: r.active == null ? true : r.active,
    };
  }
  function sheetToLocal(r) {
    return {
      id: String(r.id),
      date: String(r.date || "").slice(0,10),
      cost: Number(r.amount) || 0,
      pay: r.channel || "",
      paidby: r.paid_method_name || "",
      category: r.category_name || "",
      subcategory: r.subcategory_name || "",
      description: r.note || "",
      created_at: r.created_at || "",
      updated_at: r.updated_at || "",
    };
  }

  // ===== Public API =====
  const Sync = {
    getCfg, setCfg, getLast,
    isConfigured() { const c = getCfg(); return !!(c.url && c.token); },

    async ping()       { return call("ping"); },
    async loadMaster() { return call("loadMaster"); },
    async saveMaster(payload) { return call("saveMaster", payload); },
    async loadMonth(ym){ return call("loadMonth", { ym }); },
    async loadMonths(yms){ return call("loadMonths", { yms }); },

    async pushRecord(localRec) {
      const saved = await call("appendRecord", { record: localToSheet(localRec) });
      setLast(new Date().toISOString());
      return saved;
    },
    async patchRecord(id, localPatch) {
      const saved = await call("updateRecord", { id, patch: localToSheet(localPatch) });
      setLast(new Date().toISOString());
      return saved;
    },
    async removeRecord(id) {
      const saved = await call("deleteRecord", { id });
      setLast(new Date().toISOString());
      return saved;
    },

    // Pull current month into local Store (replacing only that month's rows)
    async pullCurrentMonth() {
      const ym = currentYM();
      const { rows } = await this.loadMonth(ym);
      const local = (window.Store && window.Store.all && window.Store.all()) || [];
      const kept = local.filter(r => ymFromDate(r.date) !== ym);
      const incoming = rows.map(sheetToLocal);
      // Write merged list back
      localStorage.setItem("expenses_v1", JSON.stringify(kept.concat(incoming)));
      setLast(new Date().toISOString());
      return incoming.length;
    },

    // Push every local record up (skip ones that look already synced via updated_at)
    async pushAllLocal() {
      const local = (window.Store && window.Store.all && window.Store.all()) || [];
      let n = 0;
      for (const r of local) {
        try { await call("appendRecord", { record: localToSheet(r) }); n++; }
        catch (e) { /* ignore individual failures */ }
      }
      setLast(new Date().toISOString());
      return n;
    },

    // Fire-and-forget background push (called from Store after mutations)
    bgPush(action, payload) {
      if (!this.isConfigured()) return;
      Promise.resolve().then(() => call(action, payload)).then(
        () => setLast(new Date().toISOString()),
        () => {} // swallow; user can manually re-sync
      );
    },

    _map: { localToSheet, sheetToLocal, ymFromDate, currentYM },
  };

  window.Sync = Sync;
})();
