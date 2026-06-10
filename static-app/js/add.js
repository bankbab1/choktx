(function () {
  const form = document.getElementById("expense-form");
  const dateEl = document.getElementById("date");
  const catEl = document.getElementById("category");
  const subWrap = document.getElementById("sub-wrap");
  const subEl = document.getElementById("subcategory");
  const descEl = document.getElementById("description");
  const costEl = document.getElementById("cost");
  const toast = document.getElementById("toast");
  const submitBtn = form.querySelector('button[type="submit"]');
  const titleEl = document.getElementById("page-title");
  const payCards = document.querySelectorAll(".seg-card");

  // Today in GMT+7 (Asia/Bangkok)
  function todayGMT7() {
    const d = new Date();
    const bkk = new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000);
    return bkk.toISOString().slice(0, 10);
  }

  const PREFIX_MAP = {
    "Fixed Cost|Phone Bill": "Phone bill - ",
    "Fixed Cost|AI Subscription": "AI - ",
  };
  const ALL_PREFIXES = Object.values(PREFIX_MAP);

  let paymentMethod = "Offline";

  const editId = new URLSearchParams(location.search).get("edit");
  const existing = editId ? Store.get(editId) : null;

  CATEGORY_NAMES.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    catEl.appendChild(o);
  });

  function renderSub(preselect) {
    const subs = CATEGORIES[catEl.value]?.sub || [];
    subEl.innerHTML = '<option value="">— none —</option>';
    if (subs.length === 0) { subWrap.style.display = "none"; return; }
    subWrap.style.display = "block";
    subs.forEach(s => {
      const o = document.createElement("option");
      o.value = s; o.textContent = s;
      if (preselect && s === preselect) o.selected = true;
      subEl.appendChild(o);
    });
  }

  function applyDescPrefix() {
    const key = catEl.value + "|" + (subEl.value || "");
    const prefix = PREFIX_MAP[key];
    if (!prefix) return;
    const cur = descEl.value || "";
    // Only inject prefix if empty, or currently matches a different known prefix
    const matchesOther = ALL_PREFIXES.some(p => p !== prefix && cur.startsWith(p));
    if (cur.trim() === "" || matchesOther) {
      // strip other prefix if present
      let rest = cur;
      ALL_PREFIXES.forEach(p => { if (rest.startsWith(p)) rest = rest.slice(p.length); });
      descEl.value = prefix + rest;
      // Move caret to end
      descEl.focus();
      const len = descEl.value.length;
      descEl.setSelectionRange(len, len);
    }
  }

  catEl.addEventListener("change", () => { renderSub(); applyDescPrefix(); });
  subEl.addEventListener("change", applyDescPrefix);

  payCards.forEach(c => c.addEventListener("click", () => {
    paymentMethod = c.dataset.pay;
    payCards.forEach(x => x.classList.toggle("active", x === c));
  }));

  if (existing) {
    titleEl.textContent = "Edit Expense";
    submitBtn.textContent = "Update Expense";
    dateEl.value = existing.date;
    catEl.value = existing.category;
    renderSub(existing.subcategory);
    descEl.value = existing.description || "";
    costEl.value = Number(existing.cost).toFixed(2);
    paymentMethod = existing.paymentMethod || "Offline";
    payCards.forEach(x => x.classList.toggle("active", x.dataset.pay === paymentMethod));
  } else {
    dateEl.value = todayGMT7();
    renderSub();
    payCards.forEach(x => x.classList.toggle("active", x.dataset.pay === "Offline"));
  }

  // Cost input: restrict to number with up to 2 decimals; format on blur
  costEl.addEventListener("input", () => {
    let v = costEl.value;
    // remove invalid chars
    v = v.replace(/[^0-9.]/g, "");
    // only first dot
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    // clip to 2 decimals
    const [i, d] = v.split(".");
    if (d !== undefined) v = i + "." + d.slice(0, 2);
    if (v !== costEl.value) costEl.value = v;
  });
  costEl.addEventListener("blur", () => {
    if (costEl.value === "" || isNaN(parseFloat(costEl.value))) return;
    costEl.value = parseFloat(costEl.value).toFixed(2);
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1500);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const rec = {
      date: dateEl.value,
      category: catEl.value,
      subcategory: subEl.value || null,
      description: descEl.value.trim(),
      cost: parseFloat(parseFloat(costEl.value).toFixed(2)),
      paymentMethod,
    };
    if (!rec.date || !rec.category || isNaN(rec.cost) || rec.cost <= 0) {
      showToast("Please enter a valid amount");
      return;
    }
    if (existing) {
      Store.update(existing.id, rec);
      showToast("Expense updated");
    } else {
      Store.add(rec);
      showToast("Expense saved");
    }
    setTimeout(() => { window.location.href = "index.html"; }, 700);
  });
})();
