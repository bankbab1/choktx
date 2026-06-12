(function () {
  const $ = (id) => document.getElementById(id);
  const periodBtns = document.querySelectorAll("#stats-period .period-btn");
  let period = "month";
  let trendChart, catChart, dowChart;

  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (n) => {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toFixed(0);
  };

  function rangeFor(p, anchor = new Date()) {
    const end = new Date(anchor); end.setHours(23, 59, 59, 999);
    const start = new Date(anchor); start.setHours(0, 0, 0, 0);
    if (p === "week") { start.setDate(start.getDate() - 6); }
    else if (p === "month") { start.setDate(1); }
    else if (p === "year") { start.setMonth(0, 1); }
    return { start, end };
  }
  function prevRangeFor(p, anchor = new Date()) {
    const a = new Date(anchor);
    if (p === "week") a.setDate(a.getDate() - 7);
    else if (p === "month") a.setMonth(a.getMonth() - 1);
    else if (p === "year") a.setFullYear(a.getFullYear() - 1);
    return rangeFor(p, a);
  }
  function within(r, dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d >= r.start && d <= r.end;
  }
  function daysIn(r) {
    return Math.round((r.end - r.start) / 86400000) + 1;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function buildTrendBuckets(records, r) {
    const buckets = [];
    if (period === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(r.start); d.setDate(d.getDate() + i);
        buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "short" }), v: 0 });
      }
      records.forEach(rec => {
        const b = buckets.find(b => b.key === rec.date);
        if (b) b.v += Number(rec.cost);
      });
    } else if (period === "month") {
      const dim = new Date(r.start.getFullYear(), r.start.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= dim; i++) {
        const d = new Date(r.start.getFullYear(), r.start.getMonth(), i);
        buckets.push({ key: d.toISOString().slice(0, 10), label: String(i), v: 0 });
      }
      records.forEach(rec => {
        const b = buckets.find(b => b.key === rec.date);
        if (b) b.v += Number(rec.cost);
      });
    } else {
      const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      for (let m = 0; m < 12; m++) buckets.push({ key: m, label: names[m], v: 0 });
      records.forEach(rec => {
        const d = new Date(rec.date + "T00:00:00");
        buckets[d.getMonth()].v += Number(rec.cost);
      });
    }
    return buckets;
  }

  function render() {
    const r = rangeFor(period);
    const pr = prevRangeFor(period);
    const all = Store.all();
    const curr = all.filter(x => within(r, x.date));
    const prev = all.filter(x => within(pr, x.date));

    const total = curr.reduce((s, x) => s + Number(x.cost), 0);
    const prevTotal = prev.reduce((s, x) => s + Number(x.cost), 0);

    $("kpi-label").textContent = ({ week: "This Week", month: "This Month", year: "This Year" })[period];
    $("kpi-total").textContent = fmt(total);
    $("kpi-count").textContent = curr.length + (curr.length === 1 ? " entry" : " entries");

    const deltaEl = $("kpi-delta");
    if (prevTotal > 0) {
      const pct = ((total - prevTotal) / prevTotal) * 100;
      const up = pct >= 0;
      deltaEl.textContent = (up ? "▲ " : "▼ ") + Math.abs(pct).toFixed(1) + "% vs prev";
      deltaEl.className = "kpi-delta " + (up ? "up" : "down");
    } else {
      deltaEl.textContent = "";
      deltaEl.className = "kpi-delta";
    }

    const empty = $("stats-empty");
    const body = $("stats-body");
    if (curr.length === 0) {
      empty.style.display = "block";
      // Keep KPI visible but hide heavy sections
      Array.from(body.children).forEach(el => { if (el.classList.contains("card") || el.classList.contains("stat-grid")) el.style.display = "none"; });
      window.refreshIcons && window.refreshIcons();
      return;
    } else {
      empty.style.display = "none";
      Array.from(body.children).forEach(el => { el.style.display = ""; });
    }

    // Tiles
    const days = daysIn(r);
    const activeDays = new Set(curr.map(x => x.date)).size;
    const avgDay = total / days;
    const avgEntry = total / curr.length;
    const biggest = curr.reduce((a, b) => Number(b.cost) > Number(a.cost) ? b : a, curr[0]);
    $("kpi-avg-day").textContent = fmt(avgDay);
    $("kpi-avg-entry").textContent = fmt(avgEntry);
    $("kpi-active-days").textContent = activeDays + " / " + days;
    $("kpi-biggest").textContent = fmt(biggest.cost);
    $("kpi-biggest-sub").textContent = (biggest.description || biggest.category || "").slice(0, 22);

    // Trend
    const buckets = buildTrendBuckets(curr, r);
    const primary = cssVar("--primary") || "#6366f1";
    if (trendChart) trendChart.destroy();
    trendChart = new Chart($("trend-chart"), {
      type: "bar",
      data: {
        labels: buckets.map(b => b.label),
        datasets: [{
          data: buckets.map(b => b.v),
          backgroundColor: primary,
          borderRadius: 6,
          maxBarThickness: 22,
        }],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.parsed.y) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: cssVar("--text-muted") || "#888", maxRotation: 0, autoSkip: true } },
          y: { grid: { color: cssVar("--border") || "#2222" }, ticks: { color: cssVar("--text-muted") || "#888", callback: fmtShort } },
        },
        maintainAspectRatio: false,
      },
    });

    // Categories
    const byCat = {};
    curr.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + Number(x.cost); });
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const catLabels = catEntries.map(e => e[0]);
    const catValues = catEntries.map(e => e[1]);
    const catColors = catLabels.map(l => (CATEGORIES[l] && CATEGORIES[l].color) || "#888");

    if (catChart) catChart.destroy();
    catChart = new Chart($("cat-chart"), {
      type: "doughnut",
      data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 0 }] },
      options: { plugins: { legend: { display: false } }, cutout: "72%", maintainAspectRatio: false },
    });

    const catBox = $("cat-breakdown");
    catBox.innerHTML = "";
    catEntries.forEach(([name, v], i) => {
      const pct = (v / total) * 100;
      const meta = CATEGORIES[name] || { icon: "circle" };
      const color = catColors[i];
      const row = document.createElement("div");
      row.className = "cat-row";
      row.innerHTML = `
        <div class="cat-row-head">
          <span class="cat-icon" style="background:${color}1a;color:${color}"><i data-lucide="${meta.icon}"></i></span>
          <span class="cat-name">${name}</span>
          <span class="cat-amt">${fmt(v)}</span>
        </div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
        <div class="cat-pct">${pct.toFixed(1)}%</div>`;
      catBox.appendChild(row);
    });

    // Paid By
    const byPaid = {};
    curr.forEach(x => { const k = x.paidBy || "Cash"; byPaid[k] = (byPaid[k] || 0) + Number(x.cost); });
    const paidBox = $("paid-breakdown");
    paidBox.innerHTML = "";
    const paidEntries = Object.entries(byPaid).sort((a, b) => b[1] - a[1]);
    paidEntries.forEach(([name, v]) => {
      const meta = (window.PAID_METHODS || []).find(m => m.name === name) || { icon: "wallet" };
      const pct = (v / total) * 100;
      const row = document.createElement("div");
      row.className = "cat-row";
      row.innerHTML = `
        <div class="cat-row-head">
          <span class="cat-icon paid"><i data-lucide="${meta.icon}"></i></span>
          <span class="cat-name">${name}</span>
          <span class="cat-amt">${fmt(v)}</span>
        </div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct.toFixed(1)}%;background:var(--primary)"></div></div>
        <div class="cat-pct">${pct.toFixed(1)}%</div>`;
      paidBox.appendChild(row);
    });

    // Online vs Offline
    let on = 0, off = 0;
    curr.forEach(x => { if ((x.paymentMethod || "Offline") === "Online") on += Number(x.cost); else off += Number(x.cost); });
    const onPct = total ? (on / total) * 100 : 0;
    const offPct = 100 - onPct;
    $("split-bar").innerHTML = `
      <div class="split-seg online" style="width:${onPct.toFixed(1)}%"></div>
      <div class="split-seg offline" style="width:${offPct.toFixed(1)}%"></div>`;
    $("split-legend").innerHTML = `
      <div class="split-item"><span class="dot online"></span>Online <strong>${fmt(on)}</strong> <em>${onPct.toFixed(1)}%</em></div>
      <div class="split-item"><span class="dot offline"></span>Offline <strong>${fmt(off)}</strong> <em>${offPct.toFixed(1)}%</em></div>`;

    // Day of week
    const dow = [0, 0, 0, 0, 0, 0, 0];
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    curr.forEach(x => { dow[new Date(x.date + "T00:00:00").getDay()] += Number(x.cost); });
    if (dowChart) dowChart.destroy();
    dowChart = new Chart($("dow-chart"), {
      type: "bar",
      data: { labels: dowNames, datasets: [{ data: dow, backgroundColor: primary, borderRadius: 6, maxBarThickness: 28 }] },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.parsed.y) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: cssVar("--text-muted") || "#888" } },
          y: { grid: { color: cssVar("--border") || "#2222" }, ticks: { color: cssVar("--text-muted") || "#888", callback: fmtShort } },
        },
        maintainAspectRatio: false,
      },
    });

    window.refreshIcons && window.refreshIcons();
  }

  periodBtns.forEach(b => {
    b.addEventListener("click", () => {
      period = b.dataset.period;
      periodBtns.forEach(x => x.classList.toggle("active", x === b));
      render();
    });
  });

  render();
  window.onExpenseSaved = render;
  window.addEventListener("expenses-synced", render);
})();
