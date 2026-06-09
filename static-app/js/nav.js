// Marks the active bottom-nav tab based on current page filename.
document.addEventListener("DOMContentLoaded", () => {
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".bottom-nav a").forEach(a => {
    const href = a.getAttribute("href").toLowerCase();
    if (href === file || (file === "" && href === "index.html")) a.classList.add("active");
  });
});
