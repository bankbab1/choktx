(function () {
  const form = document.getElementById("expense-form");
  const dateEl = document.getElementById("date");
  const catEl = document.getElementById("category");
  const subWrap = document.getElementById("sub-wrap");
  const subEl = document.getElementById("subcategory");
  const descEl = document.getElementById("description");
  const costEl = document.getElementById("cost");
  const toast = document.getElementById("toast");

  dateEl.value = new Date().toISOString().slice(0, 10);

  CATEGORY_NAMES.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    catEl.appendChild(o);
  });

  function renderSub() {
    const subs = CATEGORIES[catEl.value]?.sub || [];
    subEl.innerHTML = '<option value="">— none —</option>';
    if (subs.length === 0) { subWrap.style.display = "none"; return; }
    subWrap.style.display = "block";
    subs.forEach(s => {
      const o = document.createElement("option");
      o.value = s; o.textContent = s;
      subEl.appendChild(o);
    });
  }
  catEl.addEventListener("change", renderSub);
  renderSub();

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
      cost: parseFloat(costEl.value),
    };
    if (!rec.date || !rec.category || isNaN(rec.cost) || rec.cost <= 0) {
      showToast("Please enter a valid amount");
      return;
    }
    Store.add(rec);
    showToast("Expense saved");
    // Return to dashboard so the user immediately sees the updated totals
    setTimeout(() => { window.location.href = "index.html"; }, 700);
  });
})();
