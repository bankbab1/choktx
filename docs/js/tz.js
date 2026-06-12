// Timezone helper — anchor all date math to GMT+7 (Asia/Bangkok)
(function () {
  const TZ_NAME = "Asia/Bangkok";

  function partsGMT7(d = new Date()) {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ_NAME, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(d);
    const get = (t) => Number(f.find(p => p.type === t).value);
    return { y: get("year"), m: get("month"), d: get("day") };
  }

  // Returns "YYYY-MM-DD" for GMT+7 today
  function todayStr() {
    const { y, m, d } = partsGMT7();
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Returns a Date whose local Y/M/D matches GMT+7 today, at midnight.
  // Safe to use as an anchor for startOf/range calculations.
  function todayLocalAnchor() {
    const { y, m, d } = partsGMT7();
    return new Date(y, m - 1, d);
  }

  // Parse a YYYY-MM-DD string into a local-midnight Date for comparisons.
  function parseDateStr(s) {
    return new Date(s + "T00:00:00");
  }

  window.TZ = { TZ_NAME, todayStr, todayLocalAnchor, parseDateStr };
})();
