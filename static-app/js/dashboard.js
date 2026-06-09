(function () {
  const periodBtns = document.querySelectorAll(".period-btn");
  const totalEl = document.getElementById("total-amount");
  const countEl = document.getElementById("total-count");
  const periodLabel = document.getElementById("period-label");
  const breakdownEl = document.getElementById("breakdown");
  const emptyEl = document.getElementById("empty");
  const chartCanvas = document.getElementById("category-chart");
  let chart = null;
  let period = "month";

  function startOf(p) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (p === "day") return d;
    if (p === "week") { d.setDate(d.getDate() - d.getDay()); return d; }
    if (p === "month") { d.setDate(1); return d; }
    if (p === "year") { d.setMonth(0, 1); return d; }
  }
  function fmtMoney(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  const recentEl = document.getElementById("recent-list");
  const recentSection = document.getElementById("recent-section");

  function render() {
    const start = startOf(period);
    const all = Store.all().filter(r => new Date(r.date) >= start);
    const total = all.reduce((s, r) => s + Number(r.cost), 0);

    totalEl.textContent = fmtMoney(total);
    countEl.textContent = all.length + (all.length === 1 ? " entry" : " entries");
    periodLabel.textContent = ({ day: "Today", week: "This Week", month: "This Month", year: "This Year" })[period];

    const byCat = {};
    all.forEach(r => { byCat[r.category] = (byCat[r.category] || 0) + Number(r.cost); });
    const labels = Object.keys(byCat);
    const values = labels.map(l => byCat[l]);
    const colors = labels.map(l => CATEGORIES[l]?.color || "#888");

    breakdownEl.innerHTML = "";
    if (all.length === 0) {
      emptyEl.style.display = "block";
      chartCanvas.style.display = "none";
    } else {
      emptyEl.style.display = "none";
      chartCanvas.style.display = "block";
      labels
        .map((l, i) => ({ l, v: values[i], c: colors[i] }))
        .sort((a, b) => b.v - a.v)
        .forEach(({ l, v, c }) => {
          const pct = ((v / total) * 100).toFixed(1);
          const meta = CATEGORIES[l] || { icon: "circle" };
          const row = document.createElement("div");
          row.className = "cat-row";
          row.innerHTML = `
            <div class="cat-row-head">
              <span class="cat-icon" style="background:${c}1a;color:${c}"><i data-lucide="${meta.icon}"></i></span>
              <span class="cat-name">${l}</span>
              <span class="cat-amt">${fmtMoney(v)}</span>
            </div>
            <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%;background:${c}"></div></div>
            <div class="cat-pct">${pct}%</div>`;
          breakdownEl.appendChild(row);
        });
    }

    if (chart) chart.destroy();
    if (all.length > 0) {
      chart = new Chart(chartCanvas, {
        type: "doughnut",
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
        options: {
          plugins: { legend: { display: false } },
          cutout: "72%",
          maintainAspectRatio: false,
        },
      });
    }

    // --- Records list grouped by date ---
    recentEl.innerHTML = "";
    if (all.length === 0) {
      recentSection.style.display = "none";
    } else {
      recentSection.style.display = "block";
      const groups = {};
      all.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
      Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
        const dayTotal = groups[date].reduce((s, r) => s + Number(r.cost), 0);
        const head = document.createElement("div");
        head.className = "day-head";
        head.innerHTML = `<span>${formatDateLabel(date)}</span><span>${fmtMoney(dayTotal)}</span>`;
        recentEl.appendChild(head);

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
            <div class="record-amt">${fmtMoney(r.cost)}</div>`;
          recentEl.appendChild(item);
        });
      });
    }

    window.refreshIcons && window.refreshIcons();
  }

  function formatDateLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    const isoToday = today.toISOString().slice(0, 10);
    const isoYest = yest.toISOString().slice(0, 10);
    if (iso === isoToday) return "Today";
    if (iso === isoYest) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  periodBtns.forEach(b => b.addEventListener("click", () => {
    period = b.dataset.period;
    periodBtns.forEach(x => x.classList.toggle("active", x === b));
    render();
  }));

  render();
})();
