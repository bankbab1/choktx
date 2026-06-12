(function () {
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const filterCat = document.getElementById("filter-cat");
  const filterPeriod = document.getElementById("filter-period");
  const filterSearch = document.getElementById("filter-search");
  const filterSearchClear = document.getElementById("filter-search-clear");
  const resultCount = document.getElementById("result-count");
  const rangeRow = document.getElementById("range-row");
  const rangeFrom = document.getElementById("range-from");
  const rangeTo = document.getElementById("range-to");

  CATEGORY_NAMES.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    filterCat.appendChild(o);
  });

  function startOf(p) {
    if (p === "all" || p === "custom") return new Date(0);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (p === "day") return d;
    if (p === "week") { d.setDate(d.getDate() - d.getDay()); return d; }
    if (p === "month") { d.setDate(1); return d; }
    if (p === "year") { d.setMonth(0, 1); return d; }
    return new Date(0);
  }
  function fmt(n) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function todayISO_GMT7() {
    const d = new Date();
    const bkk = new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000);
    return bkk.toISOString().slice(0, 10);
  }
  function formatDateLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    const todayStr = todayISO_GMT7();
    const yestDate = new Date(todayStr + "T00:00:00");
    yestDate.setDate(yestDate.getDate() - 1);
    const yestStr = yestDate.toISOString().slice(0, 10);
    const pretty = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (iso === todayStr) return pretty + " (Today)";
    if (iso === yestStr) return pretty + " (Yesterday)";
    return pretty;
  }

  async function handleDelete(id) {
    const ok = await window.confirmModal({
      title: "Delete this entry?",
      message: "This action cannot be undone.",
      confirmText: "Delete",
      danger: true,
    });
    if (ok) { Store.remove(id); render(); }
  }

  function render() {
    const cat = filterCat.value;
    const period = filterPeriod.value;
    rangeRow.style.display = period === "custom" ? "flex" : "none";
    const start = startOf(period);
    const from = period === "custom" && rangeFrom.value ? rangeFrom.value : null;
    const to = period === "custom" && rangeTo.value ? rangeTo.value : null;
    const q = (filterSearch.value || "").trim().toLowerCase();
    const qNum = q && !isNaN(parseFloat(q.replace(/,/g, ""))) ? parseFloat(q.replace(/,/g, "")) : null;
    const rows = Store.all().filter(r => {
      if (cat && r.category !== cat) return false;
      if (period === "custom") {
        if (from && r.date < from) return false;
        if (to && r.date > to) return false;
      } else if (new Date(r.date) < start) return false;
      if (q) {
        const hay = `${r.description || ""} ${r.category || ""} ${r.subcategory || ""} ${r.date || ""}`.toLowerCase();
        const costStr = String(r.cost);
        if (!hay.includes(q) && !costStr.includes(q) && (qNum === null || Number(r.cost) !== qNum)) return false;
      }
      return true;
    });
    listEl.innerHTML = "";
    emptyEl.style.display = rows.length ? "none" : "block";
    filterSearchClear.classList.toggle("show", !!filterSearch.value);
    if (q) {
      const total = rows.reduce((s, r) => s + Number(r.cost), 0);
      resultCount.style.display = "inline-block";
      resultCount.textContent = `${rows.length} match${rows.length === 1 ? "" : "es"} · ${fmt(total)}`;
    } else {
      resultCount.style.display = "none";
    }


    const groups = {};
    rows.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const dayTotal = groups[date].reduce((s, r) => s + Number(r.cost), 0);
      const head = document.createElement("div");
      head.className = "day-head";
      head.innerHTML = `<span>${formatDateLabel(date)}</span><span>${fmt(dayTotal)}</span>`;
      listEl.appendChild(head);

      groups[date].forEach(r => {
        const meta = CATEGORIES[r.category] || { color: "#888", icon: "circle" };
        const item = document.createElement("div");
        item.className = "record";
        item.innerHTML = `
          <div class="record-icon" style="background:${meta.color}1a;color:${meta.color}"><i data-lucide="${meta.icon}"></i></div>
          <div class="record-body">
            <div class="record-title">${r.description || r.category}</div>
            <div class="record-sub">${r.category}${r.subcategory ? " · " + r.subcategory : ""}</div>
          </div>
          <div class="record-amt">${fmt(r.cost)}</div>
          <div class="record-actions">
            <a class="record-act" href="add.html?edit=${r.id}" data-edit="${r.id}" aria-label="Edit"><i data-lucide="pencil"></i></a>
            <button class="record-act danger" data-del="${r.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>`;
        item.querySelector("[data-del]").addEventListener("click", () => handleDelete(r.id));
        listEl.appendChild(item);
      });
    });

    window.refreshIcons && window.refreshIcons();
  }

  function syncRangeBounds() {
    rangeTo.min = rangeFrom.value || "";
    rangeFrom.max = rangeTo.value || "";
    if (rangeFrom.value && rangeTo.value && rangeTo.value < rangeFrom.value) {
      rangeTo.value = rangeFrom.value;
    }
  }
  filterCat.addEventListener("change", render);
  filterSearch.addEventListener("input", render);
  filterPeriod.addEventListener("change", render);
  rangeFrom.addEventListener("change", () => { syncRangeBounds(); render(); });
  rangeTo.addEventListener("change", () => { syncRangeBounds(); render(); });
  syncRangeBounds();
  render();
  window.onExpenseSaved = render;
  window.addEventListener("expenses-synced", () => { if (!document.querySelector(".sheet-backdrop, .modal-backdrop")) render(); });
})();
