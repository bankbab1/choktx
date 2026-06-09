(function () {
  const KEY = "theme";
  const saved = localStorage.getItem(KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = saved;

  window.Theme = {
    get() { return document.documentElement.dataset.theme; },
    set(t) {
      document.documentElement.dataset.theme = t;
      localStorage.setItem(KEY, t);
    },
    toggle() { this.set(this.get() === "dark" ? "light" : "dark"); },
  };
})();
