(function () {
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const filterCat = document.getElementById("filter-cat");
  const filterPeriod = document.getElementById("filter-period");

  CATEGORY_NAMES.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    filterCat.appendChild(o);
  });

  function startOf(p) {
    if (p === "all") return new Date(0);
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (p === "day") return d;
    if (p === "week") { d.setDate(d.getDate() - d.getDay()); return d; }
    if (p === "month") { d.setDate(1); return d; }
    if (p === "year") { d.setMonth(0, 1); return d; }
    return new Date(0);
  }
  function fmt(n) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function formatDateLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    if (iso === today.toISOString().slice(0, 10)) return "Today";
    if (iso === yest.toISOString().slice(0, 10)) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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
    const start = startOf(filterPeriod.value);
    const rows = Store.all().filter(r =>
      (!cat || r.category === cat) && new Date(r.date) >= start
    );
    listEl.innerHTML = "";
    emptyEl.style.display = rows.length ? "none" : "block";

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
            <a class="record-act" href="add.html?edit=${r.id}" aria-label="Edit"><i data-lucide="pencil"></i></a>
            <button class="record-act danger" data-del="${r.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>`;
        item.querySelector("[data-del]").addEventListener("click", () => handleDelete(r.id));
        listEl.appendChild(item);
      });
    });

    window.refreshIcons && window.refreshIcons();
  }

  filterCat.addEventListener("change", render);
  filterPeriod.addEventListener("change", render);
  render();
})();
