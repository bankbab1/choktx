(function () {
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const filterCat = document.getElementById("filter-cat");
  const filterPeriod = document.getElementById("filter-period");

  // populate filter
  CATEGORY_NAMES.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = `${CATEGORIES[n].icon} ${n}`;
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

  function render() {
    const cat = filterCat.value;
    const start = startOf(filterPeriod.value);
    const rows = Store.all().filter(r =>
      (!cat || r.category === cat) && new Date(r.date) >= start
    );
    listEl.innerHTML = "";
    emptyEl.style.display = rows.length ? "none" : "block";

    // group by date
    const groups = {};
    rows.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const dayTotal = groups[date].reduce((s, r) => s + Number(r.cost), 0);
      const head = document.createElement("div");
      head.className = "day-head";
      head.innerHTML = `<span>${date}</span><span>${fmt(dayTotal)}</span>`;
      listEl.appendChild(head);

      groups[date].forEach(r => {
        const meta = CATEGORIES[r.category] || { color: "#888", icon: "•" };
        const item = document.createElement("div");
        item.className = "record";
        item.innerHTML = `
          <div class="record-icon" style="background:${meta.color}22;color:${meta.color}">${meta.icon}</div>
          <div class="record-body">
            <div class="record-title">${r.description || r.category}</div>
            <div class="record-sub">${r.category}${r.subcategory ? " · " + r.subcategory : ""}</div>
          </div>
          <div class="record-amt">${fmt(r.cost)}</div>
          <button class="record-del" aria-label="Delete">×</button>`;
        item.querySelector(".record-del").addEventListener("click", () => {
          if (confirm("Delete this entry?")) { Store.remove(r.id); render(); }
        });
        listEl.appendChild(item);
      });
    });
  }

  filterCat.addEventListener("change", render);
  filterPeriod.addEventListener("change", render);
  render();
})();
