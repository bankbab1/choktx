(function () {
  const periodBtns = document.querySelectorAll(".period-btn");
  const totalEl = document.getElementById("total-amount");
  const countEl = document.getElementById("total-count");
  const periodLabel = document.getElementById("period-label");
  const breakdownEl = document.getElementById("breakdown");
  const emptyEl = document.getElementById("empty");
  const chartCanvas = document.getElementById("category-chart");
  const recentEl = document.getElementById("recent-list");
  const recentSection = document.getElementById("recent-section");
  let chart = null;
  let period = "day";

  function startOf(p) {
    const d = TZ.todayLocalAnchor();
    if (p === "day") return d;
    if (p === "week") { d.setDate(d.getDate() - d.getDay()); return d; }
    if (p === "month") { d.setDate(1); return d; }
    if (p === "year") { d.setMonth(0, 1); return d; }
  }
  function fmtMoney(n) { return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function todayISO_GMT7() { return TZ.todayStr(); }
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
    const start = startOf(period);
    const all = Store.all().filter(r => TZ.parseDateStr(r.date) >= start);
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
            <div class="record-amt">${fmtMoney(r.cost)}</div>
            <div class="record-actions">
              <a class="record-act" href="add.html?edit=${r.id}" data-edit="${r.id}" aria-label="Edit"><i data-lucide="pencil"></i></a>
              <button class="record-act danger" data-del="${r.id}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
            </div>`;
          item.querySelector("[data-del]").addEventListener("click", () => handleDelete(r.id));
          recentEl.appendChild(item);
        });
      });
    }

    window.refreshIcons && window.refreshIcons();
  }

  periodBtns.forEach(b => {
    b.classList.toggle("active", b.dataset.period === period);
    b.addEventListener("click", () => {
      period = b.dataset.period;
      periodBtns.forEach(x => x.classList.toggle("active", x === b));
      render();
    });
  });

  render();
  window.onExpenseSaved = render;
  window.addEventListener("expenses-synced", () => { if (!document.querySelector(".sheet-backdrop, .modal-backdrop")) render(); });
})();
