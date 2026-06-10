// Expense form, usable as full page OR bottom sheet via initExpenseForm(root, opts).
(function () {
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

  window.expenseFormTemplate = function () {
    return `
      <form class="expense-form" novalidate>
        <div class="field">
          <label>Date</label>
          <input data-f="date" type="date" required />
        </div>
        <div class="field">
          <label>Amount</label>
          <input data-f="cost" class="cost-input" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" required />
        </div>
        <div class="field">
          <label>Payment Method</label>
          <div class="seg-cards" data-f="pay">
            <button type="button" class="seg-card active" data-pay="Offline">
              <i data-lucide="wallet"></i><span>Offline</span>
            </button>
            <button type="button" class="seg-card" data-pay="Online">
              <i data-lucide="credit-card"></i><span>Online</span>
            </button>
          </div>
        </div>
        <div class="field">
          <label>Paid By</label>
          <div class="seg-cards seg-cards-4" data-f="paidby">
            ${(window.PAID_METHODS || []).map((m, i) => `
              <button type="button" class="seg-card ${i===0?"active":""}" data-paidby="${m.name.replace(/"/g,"&quot;")}">
                <i data-lucide="${m.icon}"></i><span>${m.name}</span>
              </button>`).join("")}
          </div>
        </div>
        <div class="field">
          <label>Category</label>
          <select data-f="category" required></select>
        </div>
        <div class="field" data-f="sub-wrap" style="display:none">
          <label>Subcategory</label>
          <select data-f="subcategory"></select>
        </div>
        <div class="field">
          <label>Description</label>
          <input data-f="description" type="text" placeholder="What was it for?" maxlength="120" />
        </div>
        <button class="btn" type="submit" data-f="submit">Save Expense</button>
      </form>`;
  };

  window.initExpenseForm = function (root, opts = {}) {
    const { editId = null, onSaved = null, showToast } = opts;
    const $ = (sel) => root.querySelector(sel);
    const form = root.tagName === "FORM" ? root : root.querySelector("form");

    const dateEl = form.querySelector('[data-f="date"]');
    const costEl = form.querySelector('[data-f="cost"]');
    const catEl = form.querySelector('[data-f="category"]');
    const subWrap = form.querySelector('[data-f="sub-wrap"]');
    const subEl = form.querySelector('[data-f="subcategory"]');
    const descEl = form.querySelector('[data-f="description"]');
    const submitBtn = form.querySelector('[data-f="submit"]');
    const payCards = form.querySelectorAll('[data-f="pay"] .seg-card');
    const paidByCards = form.querySelectorAll('[data-f="paidby"] .seg-card');

    let paymentMethod = "Offline";
    let paidBy = (window.PAID_METHODS && window.PAID_METHODS[0] && window.PAID_METHODS[0].name) || "Cash";
    const existing = editId ? Store.get(editId) : null;

    CATEGORY_NAMES.forEach(n => {
      const o = document.createElement("option");
      o.value = n; o.textContent = n;
      catEl.appendChild(o);
    });

    function renderSub(preselect) {
      const subs = CATEGORIES[catEl.value]?.sub || [];
      subEl.innerHTML = '<option value="">— none —</option>';
      if (!subs.length) { subWrap.style.display = "none"; return; }
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
      const matchesOther = ALL_PREFIXES.some(p => p !== prefix && cur.startsWith(p));
      if (cur.trim() === "" || matchesOther) {
        let rest = cur;
        ALL_PREFIXES.forEach(p => { if (rest.startsWith(p)) rest = rest.slice(p.length); });
        descEl.value = prefix + rest;
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

    paidByCards.forEach(c => c.addEventListener("click", () => {
      paidBy = c.dataset.paidby;
      paidByCards.forEach(x => x.classList.toggle("active", x === c));
    }));

    if (existing) {
      submitBtn.textContent = "Update Expense";
      dateEl.value = existing.date;
      catEl.value = existing.category;
      renderSub(existing.subcategory);
      descEl.value = existing.description || "";
      costEl.value = Number(existing.cost).toFixed(2);
      paymentMethod = existing.paymentMethod || "Offline";
      payCards.forEach(x => x.classList.toggle("active", x.dataset.pay === paymentMethod));
      paidBy = existing.paidBy || "Cash";
      paidByCards.forEach(x => x.classList.toggle("active", x.dataset.paidby === paidBy));
    } else {
      dateEl.value = todayGMT7();
      renderSub();
    }

    costEl.addEventListener("input", () => {
      let v = costEl.value.replace(/[^0-9.]/g, "");
      const parts = v.split(".");
      if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
      const [i, d] = v.split(".");
      if (d !== undefined) v = i + "." + d.slice(0, 2);
      if (v !== costEl.value) costEl.value = v;
    });
    costEl.addEventListener("blur", () => {
      if (!costEl.value || isNaN(parseFloat(costEl.value))) return;
      costEl.value = parseFloat(costEl.value).toFixed(2);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const rec = {
        date: dateEl.value,
        category: catEl.value,
        subcategory: subEl.value || null,
        description: descEl.value.trim(),
        cost: parseFloat(parseFloat(costEl.value).toFixed(2)),
        paymentMethod,
        paidBy,
      };
      if (!rec.date || !rec.category || isNaN(rec.cost) || rec.cost <= 0) {
        (showToast || alert)("Please enter a valid amount");
        return;
      }
      if (existing) Store.update(existing.id, rec);
      else Store.add(rec);
      if (onSaved) onSaved(rec, !!existing);
    });

    window.refreshIcons && window.refreshIcons();
    return { isEdit: !!existing };
  };

  // Auto-bind for add.html (full page mode)
  document.addEventListener("DOMContentLoaded", () => {
    const host = document.getElementById("expense-form-host");
    if (!host) return;
    host.innerHTML = window.expenseFormTemplate();
    const editId = new URLSearchParams(location.search).get("edit");
    const toastEl = document.getElementById("toast");
    function toast(m) { if (!toastEl) return; toastEl.textContent = m; toastEl.classList.add("show"); setTimeout(() => toastEl.classList.remove("show"), 1500); }
    const titleEl = document.getElementById("page-title");
    const ctx = window.initExpenseForm(host, {
      editId,
      showToast: toast,
      onSaved: (_r, isEdit) => {
        toast(isEdit ? "Expense updated" : "Expense saved");
        setTimeout(() => { window.location.href = "index.html"; }, 600);
      },
    });
    if (titleEl && ctx.isEdit) titleEl.textContent = "Edit Expense";
  });
})();
