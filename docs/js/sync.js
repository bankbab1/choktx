// Google Apps Script sync layer.
// Talks to the Web App deployed from /static-app/apps-script/Code.gs
(function () {
  const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbz43d6rquwzBvmo20coYknXAWF4Q9bZ4sRKh4RXLcVF6GDCSfmgYM2lmPt3HwW-9rCTUw/exec";
  const CFG_KEY = "gs_sync_cfg_v1";
  const LAST_KEY = "gs_sync_last_v1";

  function getCfg() {
    try {
      const c = JSON.parse(localStorage.getItem(CFG_KEY)) || {};
      if (!c.url) c.url = DEFAULT_URL;
      return c;
    } catch { return { url: DEFAULT_URL }; }
  }
  function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }
  function getLast() { return localStorage.getItem(LAST_KEY) || ""; }
  function setLast(v) { localStorage.setItem(LAST_KEY, v); }

  function hasSession() {
    const c = getCfg();
    return !!(c.session && c.exp && Math.floor(Date.now()/1000) < Number(c.exp) - 30);
  }

  async function rawCall(body) {
    const cfg = getCfg();
    if (!cfg.url) throw new Error("Sync not configured");
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Sync error");
    return data.data;
  }

  async function call(action, payload) {
    if (!hasSession()) throw new Error("Not logged in");
    const cfg = getCfg();
    return rawCall(Object.assign({ action, session: cfg.session }, payload || {}));
  }


  function ymFromDate(d) {
    const s = String(d || "");
    return s.slice(0,4) + s.slice(5,7);
  }
  function currentYM() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth()+1).padStart(2,"0");
  }

  // Google Sheets sometimes auto-parses cells as Date (e.g. the date column,
  // or a subcategory typed as "7-11"). Apps Script returns those as Date
  // objects which JSON-serialize to UTC ISO strings — shifting one day back
  // in Asia/Bangkok (UTC+7). Re-interpret in Bangkok time.
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;
  function bangkokFromISO(s) {
    if (!ISO_RE.test(String(s || ""))) return null;
    const d = new Date(s);
    if (isNaN(d)) return null;
    return new Date(d.getTime() + 7 * 3600 * 1000);
  }
  function toYMD(v) {
    const s = String(v || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const bk = bangkokFromISO(s);
    return bk ? bk.toISOString().slice(0, 10) : s.slice(0, 10);
  }
  // If a master "name" cell comes back as an ISO datetime, Sheets parsed the
  // user's text as a date (e.g. "7-11" -> 2026-07-11). Re-render as "M-D".
  function fixName(v) {
    const s = String(v == null ? "" : v).trim();
    const bk = bangkokFromISO(s);
    if (!bk) return s;
    return (bk.getUTCMonth() + 1) + "-" + bk.getUTCDate();
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
      date: toYMD(r.date),
      cost: Number(r.amount) || 0,
      pay: r.channel || "",
      paidby: r.paid_method_name || "",
      category: fixName(r.category_name),
      subcategory: fixName(r.subcategory_name),
      description: r.note || "",
      created_at: r.created_at || "",
      updated_at: r.updated_at || "",
    };
  }

  // ===== Public API =====
  const Sync = {
    getCfg, setCfg, getLast, hasSession,
    isConfigured() { return !!getCfg().url; },
    loggedIn() { return hasSession(); },
    sessionExp() { return Number(getCfg().exp || 0); },

    async login(code) {
      const data = await rawCall({ action: "login", code: String(code).trim() });
      const cfg = getCfg();
      setCfg(Object.assign({}, cfg, { session: data.session, exp: data.exp }));
      return data;
    },

    // Pull `_categories`, `_subcategories`, `_paid_methods` from Sheets and
    // write them into the frontend Store in the shape the UI expects.
    async loadMasterIntoStore() {
      const m = await call("loadMaster");
      const cats = {};
      const catMeta = {}; // name -> { id, subIds: { subName: id } }
      (m.categories || []).forEach(r => {
        const name = fixName(r.name);
        if (!name) return;
        cats[name] = {
          color: r.color || "#6366f1",
          icon: r.icon || "tag",
          sub: [],
        };
        catMeta[name] = { id: String(r.id || ""), subIds: {} };
      });
      (m.subcategories || []).forEach(r => {
        const catName = fixName(r.category_name);
        const sub = fixName(r.name);
        if (!catName || !sub || !cats[catName]) return;
        cats[catName].sub.push(sub);
        catMeta[catName].subIds[sub] = String(r.id || "");
      });
      const paid = (m.paid_methods || [])
        .map(r => ({ name: String(r.name || "").trim(), icon: r.icon || "wallet", _id: String(r.id || "") }))
        .filter(p => p.name);
      const paidMeta = {};
      paid.forEach(p => { paidMeta[p.name] = { id: p._id }; delete p._id; });

      if (window.Store) {
        window.Store.setCategories(cats);
        window.Store.setPaidMethods(paid);
        if (window.Store.setCategoriesMeta) window.Store.setCategoriesMeta(catMeta);
        if (window.Store.setPaidMethodsMeta) window.Store.setPaidMethodsMeta(paidMeta);
      }
      window.CATEGORIES = cats;
      window.CATEGORY_NAMES = Object.keys(cats);
      window.PAID_METHODS = paid;
      return { categories: Object.keys(cats).length, paid_methods: paid.length };
    },

    logout() {
      const cfg = getCfg();
      delete cfg.session; delete cfg.exp;
      setCfg(cfg);
    },

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

    // Pull every month of the current calendar year so Stats "Year" is complete.
    async pullYearToDate() {
      const now = new Date();
      const y = now.getFullYear();
      const upto = now.getMonth() + 1; // 1..12
      const yms = [];
      for (let m = 1; m <= upto; m++) yms.push(y + String(m).padStart(2, "0"));
      const res = await this.loadMonths(yms);
      // Apps Script returns an ARRAY: [{ ym, rows }, ...]. Also tolerate
      // a future map shape { "202601": { rows: [...] } } or { months: {...} }.
      const byYm = {};
      if (Array.isArray(res)) {
        res.forEach(o => { if (o && o.ym) byYm[String(o.ym)] = o.rows || []; });
      } else if (res && typeof res === "object") {
        const src = res.months || res;
        Object.keys(src).forEach(k => {
          const v = src[k];
          byYm[k] = Array.isArray(v) ? v : (v && v.rows) || [];
        });
      }
      // Safety: if the server returned nothing usable, do NOT wipe local data.
      const gotAny = Object.values(byYm).some(rows => rows && rows.length);
      if (!gotAny) { setLast(new Date().toISOString()); return 0; }
      const local = (window.Store && window.Store.all && window.Store.all()) || [];
      const kept = local.filter(r => !yms.includes(ymFromDate(r.date)));
      let incoming = [];
      yms.forEach(ym => { incoming = incoming.concat((byYm[ym] || []).map(sheetToLocal)); });
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

    // Background push (called from Store after mutations).
    // Returns a promise; optional onDone runs after a successful push.
    bgPush(action, payload, onDone) {
      if (!hasSession()) return Promise.resolve(false);
      const cfg = getCfg();
      return Promise.resolve().then(() =>
        rawCall(Object.assign({ action, session: cfg.session }, payload || {}))
      ).then((d) => {
        setLast(new Date().toISOString());
        if (typeof onDone === "function") { try { onDone(d); } catch {} }
        return true;
      }, () => false);
    },

    // After a master save: re-pull master from Sheets so ids/order match,
    // then tell pages to re-render.
    refreshMaster() {
      if (!hasSession()) return Promise.resolve();
      return this.loadMasterIntoStore()
        .then(() => window.dispatchEvent(new CustomEvent("expenses-synced")))
        .catch(() => {});
    },

    // After a record mutation: force a fresh pull of the current month.
    refreshRecords() {
      if (window.syncFromSheets) return window.syncFromSheets({ force: true });
      return Promise.resolve();
    },


    _map: { localToSheet, sheetToLocal, ymFromDate, currentYM },
  };

  window.Sync = Sync;
})();
